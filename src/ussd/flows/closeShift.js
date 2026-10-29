const validate = require('../validators');
const { formatKes } = require('../response');
const { alertOwner } = require('../../services/notify');

function describeVariance(variance) {
  if (variance === 0) return 'Cash matches';
  return variance < 0 ? `Short by KES ${formatKes(-variance)}` : `Over by KES ${formatKes(variance)}`;
}

// text "4" -> cash handed over, "4*6000" -> confirm (shows the variance), "4*6000*1" -> close.
module.exports = {
  label: 'Close Shift',
  steps: [{ prompt: 'Enter cash you are handing over:', parse: validate.cash }],
  async confirm([declared], ctx) {
    const { liability } = await ctx.store.getShiftTotals(ctx.shift.id);
    return [
      `Expected KES ${formatKes(liability)}`,
      `Handing over KES ${formatKes(declared)}`,
      describeVariance(declared - liability),
    ];
  },
  async complete([declared], ctx) {
    const { alreadyClosed, totals } = await ctx.store.closeShift({ shiftId: ctx.shift.id, declaredCash: declared });
    const variance = declared - totals.liability;
    if (!alreadyClosed) {
      alertOwner(ctx.venue, `${ctx.venue.name}: ${ctx.staff.fullName} closed shift. `
        + `Expected KES ${formatKes(totals.liability)}, handed over KES ${formatKes(declared)}. `
        + `${describeVariance(variance).toUpperCase()}.`);
    }
    return `Shift closed. ${describeVariance(variance)}. Owner notified.`;
  },
};
