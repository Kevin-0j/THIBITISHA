const config = require('../config');
const { menuFor } = require('./menus');
const { con, end } = require('./response');

// Africa's Talking sends the whole input history on every request, joined with "*":
//   ""            first dial
//   "1"           picked option 1
//   "1*12"        then typed 12
//   "1*12*1500"   then typed 1500
//   "1*12*1500*1" then confirmed
// So the router is stateless: split the string, the first part picks the flow, the rest are that
// flow's answers in order, and an extra last answer is the confirm/cancel choice.
function parseText(text) {
  if (text === undefined || text === null || text === '') return [];
  return String(text).split('*');
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const promptText = (step, values, ctx) => (typeof step.prompt === 'function' ? step.prompt(values, ctx) : step.prompt);

// The menu depends on whether a shift is open, and finishing "Open Shift" changes that. Pin the
// shift state seen at the start of each USSD session, so option numbers can't shift under the user
// mid-session or when Africa's Talking retries the final request. Sessions last at most 180s.
const SESSION_TTL_MS = 10 * 60 * 1000;
const sessionShift = new Map();

async function shiftForSession(sessionId, staff, store) {
  if (!['manager', 'bartender'].includes(staff.role)) return null;
  const cached = sessionShift.get(sessionId);
  if (cached) return cached.shift;

  const shift = await store.getOpenShift(staff.id);
  const now = Date.now();
  for (const [key, entry] of sessionShift) if (now - entry.at > SESSION_TTL_MS) sessionShift.delete(key);
  sessionShift.set(sessionId, { shift, at: now });
  return shift;
}

async function route({ sessionId, phoneNumber, text }, store) {
  // Staff and owners are known by their number. Anyone else is a payer confirming a payment.
  const found = await store.getStaffByPhone(phoneNumber);
  const { staff, venue } = found || { staff: { role: 'payer' }, venue: null };
  const shift = await shiftForSession(sessionId, staff, store);
  const ctx = { sessionId, phoneNumber, staff, venue, shift, store };
  const menu = menuFor(ctx);

  const inputs = parseText(text);
  if (inputs.length === 0) {
    return con([menu.title, ...menu.flows.map((f, i) => `${i + 1}. ${f.label}`)]);
  }

  const [choice, ...answers] = inputs;
  const flow = /^\d+$/.test(choice) ? menu.flows[Number(choice) - 1] : undefined;
  if (!flow) return end('Invalid choice. Please dial again.');

  const needsConfirm = typeof flow.confirm === 'function';
  // More parts than the flow expects means the user typed a "*" inside an answer.
  if (answers.length > flow.steps.length + (needsConfirm ? 1 : 0)) return end('Invalid input. Please dial again.');

  const values = [];
  for (let i = 0; i < Math.min(answers.length, flow.steps.length); i += 1) {
    // A step may look something up (the payer's place code), so parse can be async.
    const result = await flow.steps[i].parse(answers[i], ctx);
    if (!result.ok) return end(`${result.error} Please dial again.`);
    values.push(result.value);
  }

  if (answers.length < flow.steps.length) return con(promptText(flow.steps[answers.length], values, ctx));

  if (needsConfirm) {
    if (answers.length === flow.steps.length) {
      const summary = await flow.confirm(values, ctx);
      return con([...[].concat(summary), '1. Confirm', '2. Cancel']);
    }
    const decision = answers[flow.steps.length];
    if (decision === '2') return end('Cancelled. Nothing was saved.');
    if (decision !== '1') return end('Invalid choice. Nothing was saved.');
  }

  try {
    return end(await withTimeout(flow.complete(values, ctx), config.ussd.writeBudgetMs));
  } catch (err) {
    console.error(`[ussd] "${flow.label}" failed for session ${sessionId}:`, err);
    return end('Could not save right now. Please try again shortly.');
  }
}

async function handleUssd(params, store) {
  try {
    return await withTimeout(route(params, store), config.ussd.requestBudgetMs);
  } catch (err) {
    console.error(`[ussd] request failed for session ${params.sessionId}:`, err);
    return end('Service busy. Please try again.');
  }
}

module.exports = { handleUssd, parseText };
