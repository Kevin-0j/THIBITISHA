const validate = require('../validators');
const { alertOwner } = require('../../services/notify');
const { hoursAgo } = require('../../time');

// Housekeeping cross-check: the cleaner reports how many rooms were slept in. If that is more
// than the room payments logged in the last 24 hours, the owner gets an SMS. The cleaner is not
// told the result, so the check can't be gamed by whoever is on the desk.
// text "1" -> count, "1*6" -> confirm, "1*6*1" -> save.
module.exports = {
  label: 'Rooms Used Last Night',
  steps: [{ prompt: 'How many rooms were used last night?', parse: validate.roomCount }],
  async confirm([rooms]) {
    return `Rooms used last night: ${rooms}`;
  },
  async complete([rooms], ctx) {
    const { duplicate } = await ctx.store.addHousekeepingReport({
      venueId: ctx.venue.id, staffId: ctx.staff.id, roomsUsed: rooms, ussdSessionId: ctx.sessionId,
    });
    if (!duplicate) {
      const paid = await ctx.store.countRoomLogsSince(ctx.venue.id, hoursAgo(24));
      if (rooms > paid) {
        alertOwner(ctx.venue, `${ctx.venue.name} CHECK: cleaner reports ${rooms} rooms used, `
          + `but only ${paid} room payments were logged in the last 24 hours.`);
      }
    }
    return 'Thank you. Report saved.';
  },
};
