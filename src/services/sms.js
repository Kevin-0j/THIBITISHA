const config = require('../config');

// Africa's Talking SMS over plain HTTPS (no SDK). Username "sandbox" goes to the sandbox API,
// where messages appear in the simulator for free; any other username goes to the live API.
const ENDPOINT = {
  sandbox: 'https://api.sandbox.africastalking.com/version1/messaging',
  live: 'https://api.africastalking.com/version1/messaging',
};

// Without an API key, messages are kept here and printed, so the flow can be tested offline.
const outbox = [];

async function sendSms(to, message) {
  if (!config.sms.apiKey) {
    outbox.push({ to, message });
    console.log(`[sms] (not sent, no AT_API_KEY) to ${to}: ${message}`);
    return { sent: false };
  }

  const body = new URLSearchParams({ username: config.sms.username, to, message });
  if (config.sms.senderId) body.set('from', config.sms.senderId);
  const url = config.sms.username === 'sandbox' ? ENDPOINT.sandbox : ENDPOINT.live;

  const res = await fetch(url, {
    method: 'POST',
    headers: { apiKey: config.sms.apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`AT SMS ${res.status}: ${await res.text()}`);
  return { sent: true, response: await res.json() };
}

module.exports = { sendSms, outbox };
