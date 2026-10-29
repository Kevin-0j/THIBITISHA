const { sendSms } = require('./sms');
const { nairobiDate } = require('../time');

// Owner alerts. Never awaited by the USSD flow: an SMS must not slow down the user's screen.

// paidUntil null = trial / not billed yet, so alerts stay on.
function subscriptionActive(venue) {
  return !venue.paidUntil || venue.paidUntil >= nairobiDate();
}

// Per-sale alerts are the "Plus" plan feature; shift and housekeeping alerts go to every plan.
function wantsPerSaleAlerts(venue) {
  return venue.plan === 'plus' || venue.plan === 'site';
}

function alertOwner(venue, message) {
  if (!venue.ownerPhone) return;
  if (!subscriptionActive(venue)) {
    console.log(`[notify] ${venue.name}: subscription lapsed, alert skipped`);
    return;
  }
  sendSms(venue.ownerPhone, message).catch((err) => console.error('[notify] SMS failed:', err.message));
}

module.exports = { alertOwner, wantsPerSaleAlerts, subscriptionActive };
