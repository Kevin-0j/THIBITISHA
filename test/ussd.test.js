// Simulates Africa's Talking: form-encoded POSTs to /ussd with the accumulated text string.
// The whole suite runs against the in-memory store, and again against Postgres when
// TEST_DATABASE_URL points at a database loaded with db/schema.sql (it is wiped between tests).
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const config = require('../src/config');
const { createApp } = require('../src/app');
const { createMemoryStore, createPostgresStore, demoSeed } = require('../src/services/store');
const { outbox } = require('../src/services/sms');
const { outbox: airtimeOutbox } = require('../src/services/airtime');
const { sweepPendingClaims } = require('../src/services/matcher');
const { subscriptionActive } = require('../src/services/notify');
const { shortNairobiDate } = require('../src/time');

const MANAGER = config.demo.managerPhone;
const CLEANER = config.demo.housekeeperPhone;
const OWNER = config.demo.ownerPhone;
const PAYER = '+254722000123';
const CODE = config.demo.venueCode;

async function seedPostgres(url) {
  const pool = new Pool({ connectionString: url });
  const seed = demoSeed(config.demo);
  await pool.query('truncate venues, staff, shifts, transactions, housekeeping_reports, payer_claims cascade');
  // The append-only trigger blocks deletes but not truncate, which is what we want in tests.
  for (const v of seed.venues) {
    await pool.query('insert into venues (id, name, plan, owner_phone, code, template, reward_kes) values ($1, $2, $3, $4, $5, $6, $7)',
      [v.id, v.name, v.plan, v.ownerPhone, v.code, v.template, v.rewardKes]);
  }
  for (const s of seed.staff) {
    await pool.query('insert into staff (id, venue_id, phone_number, full_name, role) values ($1, $2, $3, $4, $5)',
      [s.id, s.venueId, s.phoneNumber, s.fullName, s.role]);
  }
  await pool.end();
}

const backends = [['memory', async () => createMemoryStore(demoSeed(config.demo))]];
if (process.env.TEST_DATABASE_URL) {
  backends.push(['postgres', async () => {
    await seedPostgres(process.env.TEST_DATABASE_URL);
    return createPostgresStore({ url: process.env.TEST_DATABASE_URL });
  }]);
}

for (const [name, makeStore] of backends) {
  describe(`USSD on ${name} store`, () => {
    let server;
    let store;
    let baseUrl;

    beforeEach(async () => {
      outbox.length = 0;
      airtimeOutbox.length = 0;
      store = await makeStore();
      server = createApp({ store }).listen(0);
      await new Promise((r) => server.once('listening', r));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(async () => {
      server.close();
      await store.close();
    });

    async function post(phoneNumber, sessionId, text) {
      const body = new URLSearchParams({ sessionId, phoneNumber, networkCode: '99999', serviceCode: '*384*12270#', text });
      const res = await fetch(`${baseUrl}/ussd`, { method: 'POST', body });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /^text\/plain/);
      const out = await res.text();
      assert.ok(out.length <= 182, `"${text}" produced ${out.length} chars:\n${out}`);
      assert.match(out, /^(CON|END) /);
      return out;
    }

    // One USSD session: every call reuses the same sessionId, like a real phone.
    function session(phoneNumber) {
      const sessionId = `ATUid_${crypto.randomUUID()}`;
      return (text) => post(phoneNumber, sessionId, text);
    }

    // Runs a whole session through each step and returns the last screen.
    async function run(phoneNumber, finalText) {
      const dial = session(phoneNumber);
      const parts = finalText.split('*');
      let out = await dial('');
      for (let i = 1; i <= parts.length; i += 1) out = await dial(parts.slice(0, i).join('*'));
      return out;
    }

    const openShift = (float = 500) => run(MANAGER, `1*${float}*1`);

    test('unknown numbers get the payer menu', async () => {
      assert.equal(await post('+254700999999', 's1', ''), `CON ${config.brandName}\n1. Confirm a Payment\n2. My Receipts`);
    });

    test('manager with no shift can only open one', async () => {
      const dial = session(MANAGER);
      assert.equal(await dial(''), 'CON Welcome to Backyard Bar & Motel\nNo open shift.\n1. Open Shift');
      assert.equal(await dial('1'), 'CON Enter opening cash float (0 if none):');
      assert.equal(await dial('1*500'), 'CON Open shift with float KES 500?\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*500*1'), 'END Shift opened. Float KES 500. Dial again to record sales.');
    });

    test('main menu once a shift is open', async () => {
      await openShift();
      assert.equal(
        await session(MANAGER)(''),
        'CON Welcome to Backyard Bar & Motel\n1. Record Room Cash\n2. Record Bar Tab\n3. Check Shift Liability\n4. Close Shift',
      );
    });

    test('room cash: room, amount, confirm, log, owner SMS', async () => {
      await openShift(500);
      const dial = session(MANAGER);
      await dial('');
      assert.equal(await dial('1'), 'CON Enter Room Number:');
      assert.equal(await dial('1*12'), 'CON Enter Amount Received:');
      assert.equal(await dial('1*12*1500'), 'CON Room 12, cash KES 1,500\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*12*1500*1'), 'END Cash logged. Room 12 liability is KES 1,500.');
      assert.deepEqual(outbox.at(-1), {
        to: OWNER,
        message: 'Backyard Bar & Motel: Room 12 paid KES 1,500 cash. Logged by Demo Manager. Shift owes KES 2,000.',
      });
    });

    test('bar tab, cancel, and shift liability', async () => {
      await openShift(500);
      assert.equal(await run(MANAGER, '2*800*1'), 'END Bar Tab logged. Liability updated by KES 800.');
      assert.equal(await run(MANAGER, '2*999*2'), 'END Cancelled. Nothing was saved.');
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 1,300.');
    });

    test('a retried final request does not log twice', async () => {
      await openShift(0);
      const dial = session(MANAGER);
      await dial('');
      await dial('2*700*1');
      await dial('2*700*1');
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 700.');
    });

    test('a retried open-shift request still gets a sensible answer', async () => {
      const dial = session(MANAGER);
      await dial('');
      await dial('1*500*1');
      assert.equal(await dial('1*500*1'), 'END You already have an open shift. Dial again to record sales.');
    });

    test('close shift shows the variance and alerts the owner', async () => {
      await openShift(500);
      await run(MANAGER, '1*12*1500*1');
      await run(MANAGER, '2*800*1');
      const dial = session(MANAGER);
      await dial('');
      assert.equal(await dial('4'), 'CON Enter cash you are handing over:');
      assert.equal(await dial('4*2500'), 'CON Expected KES 2,800\nHanding over KES 2,500\nShort by KES 300\n1. Confirm\n2. Cancel');
      assert.equal(await dial('4*2500*1'), 'END Shift closed. Short by KES 300. Owner notified.');
      assert.match(outbox.at(-1).message, /Demo Manager closed shift\. Expected KES 2,800, handed over KES 2,500\. SHORT BY KES 300\.$/);
      assert.match(await session(MANAGER)(''), /No open shift/);
    });

    test('housekeeping count above logged rooms alerts the owner', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      outbox.length = 0;
      const dial = session(CLEANER);
      assert.equal(await dial(''), 'CON Backyard Bar & Motel\n1. Rooms Used Last Night');
      assert.equal(await dial('1'), 'CON How many rooms were used last night?');
      assert.equal(await dial('1*3'), 'CON Rooms used last night: 3\n1. Confirm\n2. Cancel');
      assert.equal(await dial('1*3*1'), 'END Thank you. Report saved.');
      assert.equal(outbox.length, 1);
      assert.match(outbox[0].message, /cleaner reports 3 rooms used, but only 1 room payments/);
    });

    test('housekeeping count that matches sends nothing', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      outbox.length = 0;
      await run(CLEANER, '1*1*1');
      assert.equal(outbox.length, 0);
    });

    test('owner sees cash held and today\'s takings', async () => {
      assert.equal(await run(OWNER, '1'), 'END No open shifts right now.');
      await openShift(500);
      await run(MANAGER, '1*12*1500*1');
      assert.equal(await session(OWNER)(''), "CON Backyard Bar & Motel (owner)\n1. Cash Held Now\n2. Today's Takings\n3. Payer Confirmations");
      assert.equal(await run(OWNER, '1'), 'END Cash held now:\nDemo Manager: KES 2,000\nTotal: KES 2,000');
      assert.equal(await run(OWNER, '2'), 'END Logged today: KES 1,500\nRoom payments: 1');
    });

    // ---- Payer confirmations -----------------------------------------------------------------

    const confirm = (room, amount, mpesa = '0', phone = PAYER) => run(phone, `1*${CODE}*${room}*${amount}*${mpesa}*1`);
    const smsTo = (phone) => outbox.filter((m) => m.to === phone);

    test('payer screens: place code, room, amount, M-Pesa code, consent', async () => {
      const dial = session(PAYER);
      await dial('');
      assert.equal(await dial('1'), 'CON Enter the place code\n(on the notice board, or ask the staff):');
      assert.equal(await dial(`1*${CODE}`), 'CON Backyard Bar & Motel\nEnter your room number:');
      assert.equal(await dial(`1*${CODE}*12`), 'CON Amount you paid (KES):');
      assert.equal(await dial(`1*${CODE}*12*1500`), 'CON M-Pesa code, or 0 if you paid cash:');
      assert.equal(await dial(`1*${CODE}*12*1500*0`),
        'CON Confirm KES 1,500 for room 12 at Backyard Bar & Motel?\nYour number will be shared with the owner.\n1. Confirm\n2. Cancel');
      assert.equal(await dial(`1*${CODE}*12*1500*0*1`),
        "END Thank you. We will SMS your receipt once it matches the manager's record.");
    });

    test('payer confirms first, staff log then matches: receipt and airtime', async () => {
      await openShift(0);
      await confirm('12', 1500);
      assert.equal(smsTo(PAYER).length, 0);
      await run(MANAGER, '1*12*1500*1');
      assert.match(smsTo(PAYER)[0].message, /receipt: KES 1,500 for room 12, Backyard Bar & Motel, .+ Confirmed by the manager\. Ref TB-[0-9A-F]{8}$/);
      assert.deepEqual(airtimeOutbox, [{ phoneNumber: PAYER, amountKes: 10 }]);
      assert.equal(await run(PAYER, '2'), `END ${shortNairobiDate(new Date())} Backyard Bar & KES 1,500: receipt sent`);
    });

    test('staff logs first, payer confirms the same amount: matched at once', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      assert.equal(await confirm('12', 1500), 'END Confirmed. Your receipt is on its way by SMS.');
      assert.equal(smsTo(PAYER).length, 1);
    });

    test('amounts differ: the owner is alerted, no receipt or reward', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1000*1');
      outbox.length = 0;
      assert.equal(await confirm('12', 1500, 'SJK4H7XQ2P'), 'END Thank you. The owner has your confirmation and will follow up.');
      assert.equal(smsTo(PAYER).length, 0);
      assert.equal(airtimeOutbox.length, 0);
      assert.match(smsTo(OWNER)[0].message,
        new RegExp(`ALERT Backyard Bar & Motel: payer \\${PAYER}, room 12, says they paid KES 1,500 \\(M-Pesa SJK4H7XQ2P\\) on .+\\. Manager logged KES 1,000\\.$`));
      assert.equal(await run(OWNER, '3'),
        'END Backyard Bar & Motel, today\nMatched: 0\nNot matching: 1\nWaiting for staff log: 0\nAt risk: KES 500');
    });

    test('nothing logged within the window: the sweep alerts the owner once', async () => {
      await confirm('7', 2000);
      assert.equal(await sweepPendingClaims(store), 0);
      const later = new Date(Date.now() + (config.payer.matchWindowMinutes + 1) * 60 * 1000);
      assert.equal(await sweepPendingClaims(store, later), 1);
      assert.equal(await sweepPendingClaims(store, later), 0);
      assert.equal(smsTo(OWNER).length, 1);
      assert.match(smsTo(OWNER)[0].message, /room 7, says they paid KES 2,000 on .+\. The manager logged nothing within 24 hours\.$/);
      assert.match(await run(OWNER, '3'), /Not matching: 1\nWaiting for staff log: 0\nAt risk: KES 2,000$/);
    });

    test('one staff log backs only one payer confirmation', async () => {
      await openShift(0);
      await run(MANAGER, '1*12*1500*1');
      await confirm('12', 1500);
      assert.equal(await confirm('12', 1500, '0', '+254733000456'),
        "END Thank you. We will SMS your receipt once it matches the manager's record.");
    });

    test('a retried payer request is saved once', async () => {
      const dial = session(PAYER);
      await dial('');
      await dial(`1*${CODE}*12*1500*0*1`);
      await dial(`1*${CODE}*12*1500*0*1`);
      assert.match(await run(OWNER, '3'), /Waiting for staff log: 1\n/);
    });

    test('payer input errors', async () => {
      assert.equal(await run(PAYER, '1*9999'), 'END Place code not found. Please dial again.');
      assert.equal(await run(PAYER, '1*44'), 'END Invalid place code. Please dial again.');
      assert.match(await run(PAYER, `1*${CODE}*12*1500*ABC`), /^END M-Pesa codes have 10 letters and digits/);
      assert.equal(await run(PAYER, `1*${CODE}*12*1500*0*2`), 'END Cancelled. Nothing was saved.');
      assert.equal(await run(PAYER, '2'), 'END No confirmed payments yet.');
    });

    test('bad input is rejected without saving', async () => {
      await openShift(0);
      assert.match(await run(MANAGER, '9'), /^END Invalid choice/);
      assert.match(await run(MANAGER, '2*abc'), /^END Enter digits only/);
      assert.match(await run(MANAGER, '2*0'), /^END Amount must be more than 0/);
      assert.match(await post(MANAGER, 'x1', '2*15*00*1*1'), /^END Invalid input/);
      assert.match(await run(MANAGER, '2*800*7'), /^END Invalid choice\. Nothing was saved/);
      assert.equal(await run(MANAGER, '3'), 'END Your current shift cash liability is KES 0.');
    });
  });
}

test('owner alerts stop when the subscription lapses', () => {
  assert.equal(subscriptionActive({ paidUntil: null }), true);
  assert.equal(subscriptionActive({ paidUntil: '2099-01-01' }), true);
  assert.equal(subscriptionActive({ paidUntil: '2020-01-01' }), false);
});
