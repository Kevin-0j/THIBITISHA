const config = require('../config');

// Africa's Talking Airtime over plain HTTPS, same account as SMS. Used for the small reward a
// payer gets when their confirmation matches a staff log (lodge template).
const ENDPOINT = {
  sandbox: 'https://api.sandbox.africastalking.com/version1/airtime/send',
  live: 'https://api.africastalking.com/version1/airtime/send',
};

// Without an API key, rewards are kept here and printed, so the flow can be tested offline.
const outbox = [];

async function sendAirtime(phoneNumber, amountKes) {
  if (!config.sms.apiKey) {
    outbox.push({ phoneNumber, amountKes });
    console.log(`[airtime] (not sent, no AT_API_KEY) KES ${amountKes} to ${phoneNumber}`);
    return { sent: false };
  }

  const url = config.sms.username === 'sandbox' ? ENDPOINT.sandbox : ENDPOINT.live;
  const res = await fetch(url, {
    method: 'POST',
    headers: { apiKey: config.sms.apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.sms.username,
      recipients: [{ phoneNumber, currencyCode: 'KES', amount: amountKes }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`AT airtime ${res.status}: ${await res.text()}`);
  return { sent: true, response: await res.json() };
}

module.exports = { sendAirtime, outbox };
