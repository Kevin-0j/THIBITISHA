const validate = require('../validators');
const { formatKes } = require('../response');

// Manager with no open shift. text "1" -> float, "1*500" -> confirm, "1*500*1" -> open.
module.exports = {
  label: 'Open Shift',
  steps: [{ prompt: 'Enter opening cash float (0 if none):', parse: validate.cash }],
  async confirm([float]) {
    return `Open shift with float KES ${formatKes(float)}?`;
  },
  async complete([float], ctx) {
    const { alreadyOpen } = await ctx.store.openShift({ venueId: ctx.venue.id, staffId: ctx.staff.id, openingFloat: float });
    if (alreadyOpen) return 'You already have an open shift. Dial again to record sales.';
    return `Shift opened. Float KES ${formatKes(float)}. Dial again to record sales.`;
  },
};
