const validate = require('../validators');
const { formatKes } = require('../response');
const { alertOwner, wantsPerSaleAlerts } = require('../../services/notify');
const { reconcileTransaction } = require('../../services/matcher');

// text "1" -> room, "1*12" -> amount, "1*12*1500" -> confirm, "1*12*1500*1" -> log.
module.exports = {
  label: 'Record Room Cash',
  steps: [
    { prompt: 'Enter Room Number:', parse: validate.roomNumber },
    { prompt: 'Enter Amount Received:', parse: validate.amount },
  ],
  async confirm([roomNumber, amount]) {
    return `Room ${roomNumber}, cash KES ${formatKes(amount)}`;
  },
  async complete([roomNumber, amount], ctx) {
    const { duplicate, transaction } = await ctx.store.addTransaction({
      venueId: ctx.venue.id, shiftId: ctx.shift.id, staffId: ctx.staff.id, type: 'room_cash',
      amount, roomNumber, ussdSessionId: ctx.sessionId, phoneNumber: ctx.phoneNumber,
    });
    if (!duplicate && wantsPerSaleAlerts(ctx.venue)) {
      const { liability } = await ctx.store.getShiftTotals(ctx.shift.id);
      alertOwner(ctx.venue, `${ctx.venue.name}: Room ${roomNumber} paid KES ${formatKes(amount)} cash. `
        + `Logged by ${ctx.staff.fullName}. Shift owes KES ${formatKes(liability)}.`);
    }
    // A payer may already have confirmed this payment. A failed match must not lose the log.
    if (!duplicate) {
      await reconcileTransaction(transaction, ctx.venue, ctx.store)
        .catch((err) => console.error('[matcher] reconcile after staff log failed:', err));
    }
    return `Cash logged. Room ${roomNumber} liability is KES ${formatKes(amount)}.`;
  },
};
