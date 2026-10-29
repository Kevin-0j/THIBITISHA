const { formatKes } = require('../response');

// text "3" -> end immediately with the running total (opening float + cash logged).
module.exports = {
  label: 'Check Shift Liability',
  steps: [],
  async complete(_answers, ctx) {
    const { liability } = await ctx.store.getShiftTotals(ctx.shift.id);
    return `Your current shift cash liability is KES ${formatKes(liability)}.`;
  },
};
