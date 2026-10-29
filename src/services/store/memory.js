const crypto = require('node:crypto');
const { TEMPLATES: templateDefaults } = require('../../templates');

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
    claims: [],
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
      const transaction = { id: id(), createdAt: new Date(), roomNumber: null, ...tx };
      db.transactions.push(transaction);
      return { duplicate: false, transaction };
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

    async getVenueByCode(code) {
      return db.venues.find((v) => v.code === code) || null;
    },

    async addPayerClaim(claim) {
      const existing = claim.ussdSessionId && db.claims.find((c) => c.ussdSessionId === claim.ussdSessionId);
      if (existing) return { claim: existing, duplicate: true };
      const row = { id: id(), status: 'pending', transactionId: null, createdAt: new Date(), resolvedAt: null, mpesaCode: null, ...claim };
      db.claims.push(row);
      return { claim: row, duplicate: false };
    },

    async getClaim(claimId) {
      return db.claims.find((c) => c.id === claimId) || null;
    },

    // Room payments in the window that no payer confirmation has claimed yet.
    async findUnclaimedRoomPayments({ venueId, roomNumber, from, to }) {
      const claimed = new Set(db.claims.map((c) => c.transactionId).filter(Boolean));
      const voided = new Set(db.transactions.filter((t) => t.type === 'void').map((t) => t.voidsTransactionId));
      return db.transactions
        .filter((t) => t.venueId === venueId && t.type === 'room_cash' && t.roomNumber === roomNumber
          && t.createdAt >= from && t.createdAt <= to && !claimed.has(t.id) && !voided.has(t.id))
        .sort((a, b) => a.createdAt - b.createdAt);
    },

    async findPendingClaims({ venueId, roomNumber, from, to }) {
      return db.claims
        .filter((c) => c.venueId === venueId && c.roomNumber === roomNumber && c.status === 'pending'
          && c.createdAt >= from && c.createdAt <= to)
        .sort((a, b) => a.createdAt - b.createdAt);
    },

    // Only a pending claim can be settled, and only once; returns false if someone got there first.
    async resolveClaim({ claimId, transactionId, status }) {
      const claim = db.claims.find((c) => c.id === claimId);
      if (!claim || claim.status !== 'pending') return false;
      if (transactionId && db.claims.some((c) => c.transactionId === transactionId)) return false;
      Object.assign(claim, { status, transactionId, resolvedAt: new Date() });
      return true;
    },

    async listPendingClaimsBefore(cutoff) {
      return db.claims
        .filter((c) => c.status === 'pending' && c.createdAt < cutoff)
        .map((claim) => ({ claim, venue: db.venues.find((v) => v.id === claim.venueId) }));
    },

    async listClaimsSince(venueId, since) {
      return db.claims
        .filter((c) => c.venueId === venueId && c.createdAt >= since)
        .map((c) => ({ ...c, loggedAmount: (db.transactions.find((t) => t.id === c.transactionId) || {}).amount ?? null }));
    },

    async recentClaimsForPayer(payerPhone, limit) {
      return db.claims
        .filter((c) => c.payerPhone === payerPhone)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((c) => ({ ...c, venueName: db.venues.find((v) => v.id === c.venueId).name }));
    },

    async close() {},
  };
  return store;
}

// A demo venue with one person per role, so the simulator works out of the box.
function demoSeed(demo) {
  const venueId = crypto.randomUUID();
  const template = demo.template === 'rent' ? 'rent' : 'lodge';
  const rewardKes = demo.rewardKes !== undefined && demo.rewardKes !== '' ? Number(demo.rewardKes) : templateDefaults[template].defaultRewardKes;
  const person = (phoneNumber, fullName, role) => ({
    id: crypto.randomUUID(), venueId, phoneNumber, fullName, role, isActive: true,
  });
  return {
    venues: [{
      id: venueId, name: demo.venueName, plan: demo.venuePlan, ownerPhone: demo.ownerPhone, paidUntil: null,
      code: demo.venueCode, template, rewardKes,
    }],
    staff: [
      person(demo.managerPhone, 'Demo Manager', 'manager'),
      person(demo.housekeeperPhone, 'Demo Cleaner', 'housekeeper'),
      person(demo.ownerPhone, 'Demo Owner', 'owner'),
    ],
  };
}

module.exports = { createMemoryStore, demoSeed };
