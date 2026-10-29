const { formatKes } = require('../response');
const { shortNairobiDate } = require('../../time');

// Payer: the last few payments this number confirmed, and where each one stands.
const STATUS = { matched: 'receipt sent', pending: 'waiting', mismatch: 'with owner', unlogged: 'with owner' };

module.exports = {
  label: 'My Receipts',
  steps: [],
  async complete(_answers, ctx) {
    const claims = await ctx.store.recentClaimsForPayer(ctx.phoneNumber, 3);
    if (claims.length === 0) return 'No confirmed payments yet.';
    return claims.map((c) => `${shortNairobiDate(c.createdAt)} ${c.venueName.slice(0, 14)} KES ${formatKes(c.amount)}: ${STATUS[c.status]}`);
  },
};
