const { formatKes } = require('../response');

const MAX_LINES = 4; // keeps the screen under 182 characters

// Owner: who is holding cash right now.
module.exports = {
  label: 'Cash Held Now',
  steps: [],
  async complete(_answers, ctx) {
    const open = await ctx.store.getOpenShiftsForVenue(ctx.venue.id);
    if (open.length === 0) return 'No open shifts right now.';
    const total = open.reduce((sum, s) => sum + s.liability, 0);
    const lines = open.slice(0, MAX_LINES).map((s) => `${s.staffName.slice(0, 14)}: KES ${formatKes(s.liability)}`);
    if (open.length > MAX_LINES) lines.push(`+${open.length - MAX_LINES} more`);
    return ['Cash held now:', ...lines, `Total: KES ${formatKes(total)}`].join('\n');
  },
};
