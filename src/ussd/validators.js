const config = require('../config');

// Each validator takes the raw keypad input and returns { ok, value } or { ok: false, error }.

function wholeNumber(raw, { min, max, tooBig }) {
  const s = String(raw).trim();
  if (!/^\d{1,9}$/.test(s)) return { ok: false, error: 'Enter digits only.' };
  const value = Number(s);
  if (value < min) return { ok: false, error: min === 1 ? 'Amount must be more than 0.' : `Must be at least ${min}.` };
  if (value > max) return { ok: false, error: tooBig };
  return { ok: true, value };
}

// A sale: whole shillings, more than 0.
const amount = (raw) => wholeNumber(raw, { min: 1, max: config.ussd.maxAmount, tooBig: 'Amount is too large.' });

// Cash in hand (float, handover): 0 is allowed.
const cash = (raw) => wholeNumber(raw, { min: 0, max: config.ussd.maxAmount, tooBig: 'Amount is too large.' });

// Rooms counted by housekeeping.
const roomCount = (raw) => wholeNumber(raw, { min: 0, max: 500, tooBig: 'That is too many rooms.' });

function roomNumber(raw) {
  const s = String(raw).trim().toUpperCase();
  if (!/^[A-Z0-9]{1,6}$/.test(s)) return { ok: false, error: 'Invalid room number.' };
  return { ok: true, value: s };
}

// The code on the notice board that tells us which place the payer paid.
function placeCode(raw) {
  const s = String(raw).trim();
  if (!/^\d{3,6}$/.test(s)) return { ok: false, error: 'Invalid place code.' };
  return { ok: true, value: s };
}

// Optional M-Pesa transaction code (10 letters and digits), or 0 for cash.
function mpesaCode(raw) {
  const s = String(raw).trim().toUpperCase();
  if (s === '0') return { ok: true, value: null };
  if (!/^[A-Z0-9]{10}$/.test(s)) return { ok: false, error: 'M-Pesa codes have 10 letters and digits.' };
  return { ok: true, value: s };
}

module.exports = { amount, cash, roomCount, roomNumber, placeCode, mpesaCode };
