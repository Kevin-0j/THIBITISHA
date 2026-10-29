const validate = require('../validators');
const { formatKes } = require('../response');
const { templateFor } = require('../../templates');
const { reconcileClaim } = require('../../services/matcher');

// Payer: say what you paid, where. Matched against the staff log; see services/matcher.js.
// text "1" -> place code, "1*4471" -> room, "1*4471*12" -> amount, "1*4471*12*1500" -> M-Pesa code,
// "1*4471*12*1500*0" -> confirm (with consent to share the number), "...*1" -> save.
async function place(raw, ctx) {
  const code = validate.placeCode(raw);
  if (!code.ok) return code;
  const venue = await ctx.store.getVenueByCode(code.value);
  return venue ? { ok: true, value: venue } : { ok: false, error: 'Place code not found.' };
}

module.exports = {
  label: 'Confirm a Payment',
  steps: [
    { prompt: 'Enter the place code\n(on the notice board, or ask the staff):', parse: place },
    { prompt: ([venue]) => `${venue.name}\nEnter your ${templateFor(venue).place} number:`, parse: validate.roomNumber },
    { prompt: 'Amount you paid (KES):', parse: validate.amount },
    { prompt: 'M-Pesa code, or 0 if you paid cash:', parse: validate.mpesaCode },
  ],
  async confirm([venue, roomNumber, amount]) {
    return [
      `Confirm KES ${formatKes(amount)} for ${templateFor(venue).place} ${roomNumber} at ${venue.name}?`,
      'Your number will be shared with the owner.',
    ];
  },
  async complete([venue, roomNumber, amount, mpesaCode], ctx) {
    const { claim, duplicate } = await ctx.store.addPayerClaim({
      venueId: venue.id, payerPhone: ctx.phoneNumber, roomNumber, amount, mpesaCode, ussdSessionId: ctx.sessionId,
    });
    const status = duplicate ? claim.status : await reconcileClaim(claim, venue, ctx.store);
    if (status === 'matched') return 'Confirmed. Your receipt is on its way by SMS.';
    if (status === 'pending') return `Thank you. We will SMS your receipt once it matches the ${templateFor(venue).collector}'s record.`;
    return 'Thank you. The owner has your confirmation and will follow up.';
  },
};
