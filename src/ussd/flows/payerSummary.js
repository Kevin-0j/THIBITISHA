const { formatKes } = require('../response');
const { templateFor } = require('../../templates');
const { startOfNairobiDay, startOfNairobiMonth } = require('../../time');

// Owner: what payers confirmed, and how much of it the staff log does not account for.
// Lodges look at today; rent looks at this month.
module.exports = {
  label: 'Payer Confirmations',
  steps: [],
  async complete(_answers, ctx) {
    const monthly = templateFor(ctx.venue).period === 'month';
    const claims = await ctx.store.listClaimsSince(ctx.venue.id, monthly ? startOfNairobiMonth() : startOfNairobiDay());
    const count = (status) => claims.filter((c) => c.status === status).length;
    const atRisk = claims.reduce((sum, c) => {
      if (c.status === 'unlogged') return sum + c.amount;
      if (c.status === 'mismatch') return sum + Math.max(c.amount - c.loggedAmount, 0);
      return sum;
    }, 0);
    return [
      `${ctx.venue.name}, ${monthly ? 'this month' : 'today'}`,
      `Matched: ${count('matched')}`,
      `Not matching: ${count('mismatch') + count('unlogged')}`,
      `Waiting for staff log: ${count('pending')}`,
      `At risk: KES ${formatKes(atRisk)}`,
    ];
  },
};
