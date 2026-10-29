const validate = require('../validators');
const { formatKes } = require('../response');
const { alertOwner, wantsPerSaleAlerts } = require('../../services/notify');

// text "2" -> amount, "2*800" -> confirm, "2*800*1" -> log.
module.exports = {
  label: 'Record Bar Tab',
  steps: [{ prompt: 'Enter Tab Amount:', parse: validate.amount }],
  async confirm([amount]) {
    return `Bar tab, cash KES ${formatKes(amount)}`;
  },
  async complete([amount], ctx) {
    const { duplicate } = await ctx.store.addTransaction({
      venueId: ctx.venue.id, shiftId: ctx.shift.id, staffId: ctx.staff.id, type: 'bar_tab',
      amount, ussdSessionId: ctx.sessionId, phoneNumber: ctx.phoneNumber,
    });
    if (!duplicate && wantsPerSaleAlerts(ctx.venue)) {
      const { liability } = await ctx.store.getShiftTotals(ctx.shift.id);
      alertOwner(ctx.venue, `${ctx.venue.name}: Bar tab KES ${formatKes(amount)} cash. `
        + `Logged by ${ctx.staff.fullName}. Shift owes KES ${formatKes(liability)}.`);
    }
    return `Bar Tab logged. Liability updated by KES ${formatKes(amount)}.`;
  },
};
