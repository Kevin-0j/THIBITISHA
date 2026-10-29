const { formatKes } = require('../response');
const { startOfNairobiDay } = require('../../time');

// Owner: everything logged since midnight (Nairobi time).
module.exports = {
  label: "Today's Takings",
  steps: [],
  async complete(_answers, ctx) {
    const since = startOfNairobiDay();
    const [total, rooms] = await Promise.all([
      ctx.store.sumTakingsSince(ctx.venue.id, since),
      ctx.store.countRoomLogsSince(ctx.venue.id, since),
    ]);
    return `Logged today: KES ${formatKes(total)}\nRoom payments: ${rooms}`;
  },
};
