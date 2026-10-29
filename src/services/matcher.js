const config = require('../config');
const { sendSms } = require('./sms');
const { sendAirtime } = require('./airtime');
const { alertOwner } = require('./notify');
const { formatKes } = require('../ussd/response');
const { templateFor } = require('../templates');
const { shortNairobiDate } = require('../time');

// Payer confirmations are matched against room payments staff logged for the same place and the
// same room or unit, within the match window either side. Equal amounts are a match: the payer
// gets an SMS receipt (and airtime, if the place rewards payers). Different amounts are a
// mismatch: the owner is alerted. A confirmation with no staff log stays pending until the sweep
// tells the owner nothing was logged.

const windowMs = () => config.payer.matchWindowMinutes * 60 * 1000;
const around = (date) => ({ from: new Date(date.getTime() - windowMs()), to: new Date(date.getTime() + windowMs()) });
const ref = (claim) => `TB-${String(claim.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Never let a failed SMS or airtime call break a USSD screen.
const fireAndForget = (promise, what) => promise.catch((err) => console.error(`[matcher] ${what} failed:`, err.message));

function onMatch(claim, venue) {
  const t = templateFor(venue);
  fireAndForget(sendSms(claim.payerPhone,
    `${config.brandName} receipt: KES ${formatKes(claim.amount)} for ${t.place} ${claim.roomNumber}, ${venue.name}, `
    + `${shortNairobiDate(claim.createdAt)}. Confirmed by the ${t.collector}. Ref ${ref(claim)}`), 'receipt SMS');
  if (venue.rewardKes > 0) fireAndForget(sendAirtime(claim.payerPhone, venue.rewardKes), 'airtime reward');
}

function payerSays(claim, venue) {
  const t = templateFor(venue);
  const mpesa = claim.mpesaCode ? ` (M-Pesa ${claim.mpesaCode})` : '';
  return `${config.brandName} ALERT ${venue.name}: payer ${claim.payerPhone}, ${t.place} ${claim.roomNumber}, `
    + `says they paid KES ${formatKes(claim.amount)}${mpesa} on ${shortNairobiDate(claim.createdAt)}.`;
}

function onMismatch(claim, tx, venue) {
  const t = templateFor(venue);
  alertOwner(venue, `${payerSays(claim, venue)} ${capitalise(t.collector)} logged KES ${formatKes(tx.amount)}.`);
}

function onUnlogged(claim, venue) {
  const t = templateFor(venue);
  const hours = Math.round(config.payer.matchWindowMinutes / 60);
  alertOwner(venue, `${payerSays(claim, venue)} The ${t.collector} logged nothing within ${hours} hours.`);
}

// Settle one claim against one staff log. Returns the claim's final status.
async function resolve(claim, tx, venue, store) {
  const status = tx.amount === claim.amount ? 'matched' : 'mismatch';
  const done = await store.resolveClaim({ claimId: claim.id, transactionId: tx.id, status });
  if (!done) return (await store.getClaim(claim.id)).status; // settled by a concurrent request
  if (status === 'matched') onMatch(claim, venue);
  else onMismatch(claim, tx, venue);
  return status;
}

// A payer just confirmed: look for the staff log.
async function reconcileClaim(claim, venue, store) {
  const txs = await store.findUnclaimedRoomPayments({ venueId: venue.id, roomNumber: claim.roomNumber, ...around(claim.createdAt) });
  if (txs.length === 0) return 'pending';
  const tx = txs.find((t) => t.amount === claim.amount) || txs[0];
  return resolve(claim, tx, venue, store);
}

// Staff just logged a room payment: look for a payer who already confirmed it.
async function reconcileTransaction(tx, venue, store) {
  const claims = await store.findPendingClaims({ venueId: venue.id, roomNumber: tx.roomNumber, ...around(tx.createdAt) });
  if (claims.length === 0) return null;
  const claim = claims.find((c) => c.amount === tx.amount) || claims[0];
  return resolve(claim, tx, venue, store);
}

// Confirmations still pending after the window: tell the owner nothing was logged.
async function sweepPendingClaims(store, now = new Date()) {
  const stale = await store.listPendingClaimsBefore(new Date(now.getTime() - windowMs()));
  for (const { claim, venue } of stale) {
    if (await store.resolveClaim({ claimId: claim.id, transactionId: null, status: 'unlogged' })) onUnlogged(claim, venue);
  }
  return stale.length;
}

module.exports = { reconcileClaim, reconcileTransaction, sweepPendingClaims, ref };
