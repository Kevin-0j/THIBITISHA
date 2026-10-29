const crypto = require('node:crypto');

// In-memory store with the same interface as postgres.js. Used when DATABASE_URL is empty:
// the sandbox simulator, local demos and tests. Everything is lost on restart.
function signedSum(txs) {
  return txs.reduce((sum, t) => sum + (t.type === 'void' ? -t.amount : t.amount), 0);
}

function createMemoryStore(seed = {}) {
  const db = {
    venues: [...(seed.venues || [])],
    staff: [...(seed.staff || [])],
    shifts: [],
    transactions: [],
    housekeeping: [],
  };
  const id = () => crypto.randomUUID();
  const venueTxsSince = (venueId, since) =>
    db.transactions.filter((t) => t.venueId === venueId && t.createdAt >= since);

  const store = {
    kind: 'memory',

    async getStaffByPhone(phoneNumber) {
      const staff = db.staff.find((s) => s.phoneNumber === phoneNumber && s.isActive);
      if (!staff) return null;
      return { staff, venue: db.venues.find((v) => v.id === staff.venueId) };
    },

    async getOpenShift(staffId) {
      return db.shifts.find((s) => s.staffId === staffId && !s.closedAt) || null;
    },

    async openShift({ venueId, staffId, openingFloat }) {
      const existing = await store.getOpenShift(staffId);
      if (existing) return { shift: existing, alreadyOpen: true };
      const shift = {
        id: id(), venueId, staffId, openingFloat, openedAt: new Date(),
        closedAt: null, declaredCash: null, status: 'open',
      };
      db.shifts.push(shift);
      return { shift, alreadyOpen: false };
    },

    async addTransaction(tx) {
      if (tx.ussdSessionId && db.transactions.some((t) => t.ussdSessionId === tx.ussdSessionId)) {
        return { duplicate: true };
      }
      db.transactions.push({ id: id(), createdAt: new Date(), roomNumber: null, ...tx });
      return { duplicate: false };
    },

    async getShiftTotals(shiftId) {
      const shift = db.shifts.find((s) => s.id === shiftId);
      const loggedCash = signedSum(db.transactions.filter((t) => t.shiftId === shiftId));
      return { openingFloat: shift.openingFloat, loggedCash, liability: shift.openingFloat + loggedCash };
    },

    async closeShift({ shiftId, declaredCash }) {
      const shift = db.shifts.find((s) => s.id === shiftId);
      const alreadyClosed = Boolean(shift.closedAt);
      if (!alreadyClosed) Object.assign(shift, { closedAt: new Date(), declaredCash, status: 'closed' });
      return { alreadyClosed, totals: await store.getShiftTotals(shiftId) };
    },

    async getOpenShiftsForVenue(venueId) {
      const open = db.shifts.filter((s) => s.venueId === venueId && !s.closedAt);
      return Promise.all(open.map(async (s) => ({
        staffName: db.staff.find((st) => st.id === s.staffId).fullName,
        liability: (await store.getShiftTotals(s.id)).liability,
      })));
    },

    async sumTakingsSince(venueId, since) {
      return signedSum(venueTxsSince(venueId, since));
    },

    async countRoomLogsSince(venueId, since) {
      return venueTxsSince(venueId, since).filter((t) => t.type === 'room_cash').length;
    },

    async addHousekeepingReport({ venueId, staffId, roomsUsed, ussdSessionId }) {
      if (db.housekeeping.some((h) => h.ussdSessionId === ussdSessionId)) return { duplicate: true };
      db.housekeeping.push({ id: id(), venueId, staffId, roomsUsed, ussdSessionId, createdAt: new Date() });
      return { duplicate: false };
    },

    async close() {},
  };
  return store;
}

// A demo venue with one person per role, so the simulator works out of the box.
function demoSeed(demo) {
  const venueId = crypto.randomUUID();
  const person = (phoneNumber, fullName, role) => ({
    id: crypto.randomUUID(), venueId, phoneNumber, fullName, role, isActive: true,
  });
  return {
    venues: [{ id: venueId, name: demo.venueName, plan: demo.venuePlan, ownerPhone: demo.ownerPhone, paidUntil: null }],
    staff: [
      person(demo.managerPhone, 'Demo Manager', 'manager'),
      person(demo.housekeeperPhone, 'Demo Cleaner', 'housekeeper'),
      person(demo.ownerPhone, 'Demo Owner', 'owner'),
    ],
  };
}

module.exports = { createMemoryStore, demoSeed };
