const fs = require('node:fs');
const { Pool } = require('pg');

// Store backed by Supabase Postgres (db/schema.sql). Same interface as memory.js.
// We talk to Postgres directly rather than through the Supabase JS client: one network hop
// instead of two, and the same SQL runs against a local Postgres in tests.

const num = (v) => Number(v);

function sslOptions(url, caCertPath) {
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /sslmode=disable/.test(url)) return false;
  if (caCertPath) return { ca: fs.readFileSync(caCertPath, 'utf8'), rejectUnauthorized: true };
  console.warn('[db] DATABASE_CA_CERT not set: connection is encrypted but the server certificate is not verified.');
  return { rejectUnauthorized: false };
}

// Staff and venue columns are aliased apart: both tables have "id", and pg keeps only the last one.
const STAFF_COLS = `s.id as "staffId", s.venue_id as "venueId", s.phone_number as "phoneNumber",
  s.full_name as "fullName", s.role, s.is_active as "isActive"`;
const VENUE_COLS = `v.name as "venueName", v.plan, v.owner_phone as "ownerPhone",
  to_char(v.paid_until, 'YYYY-MM-DD') as "paidUntil"`;
const SHIFT_COLS = `id, venue_id as "venueId", staff_id as "staffId", opened_at as "openedAt", closed_at as "closedAt",
  opening_float::int as "openingFloat", declared_cash::int as "declaredCash", status`;
const SIGNED_AMOUNT = `case when type = 'void' then -amount else amount end`;

function createPostgresStore({ url, caCertPath }) {
  const pool = new Pool({
    connectionString: url,
    ssl: sslOptions(url, caCertPath),
    max: 5,
    connectionTimeoutMillis: 3000,
    // Supabase's transaction pooler does not support *named* prepared statements; we never name ours.
  });
  const q = async (text, params) => (await pool.query(text, params)).rows;

  const store = {
    kind: 'postgres',

    async getStaffByPhone(phoneNumber) {
      const rows = await q(
        `select ${STAFF_COLS}, ${VENUE_COLS}
           from staff s join venues v on v.id = s.venue_id
          where s.phone_number = $1 and s.is_active`,
        [phoneNumber],
      );
      if (!rows[0]) return null;
      const r = rows[0];
      return {
        staff: { id: r.staffId, venueId: r.venueId, phoneNumber: r.phoneNumber, fullName: r.fullName, role: r.role, isActive: r.isActive },
        venue: { id: r.venueId, name: r.venueName, plan: r.plan, ownerPhone: r.ownerPhone, paidUntil: r.paidUntil },
      };
    },

    async getOpenShift(staffId) {
      const rows = await q(`select ${SHIFT_COLS} from shifts where staff_id = $1 and closed_at is null`, [staffId]);
      return rows[0] || null;
    },

    async openShift({ venueId, staffId, openingFloat }) {
      // The partial unique index allows one open shift per person; a second open is a no-op.
      const inserted = await q(
        `insert into shifts (venue_id, staff_id, opening_float) values ($1, $2, $3)
         on conflict (staff_id) where closed_at is null do nothing
         returning ${SHIFT_COLS}`,
        [venueId, staffId, openingFloat],
      );
      if (inserted[0]) return { shift: inserted[0], alreadyOpen: false };
      return { shift: await store.getOpenShift(staffId), alreadyOpen: true };
    },

    async addTransaction(tx) {
      const rows = await q(
        `insert into transactions (venue_id, shift_id, staff_id, type, amount, room_number, ussd_session_id, phone_number)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (ussd_session_id) do nothing
         returning id`,
        [tx.venueId, tx.shiftId, tx.staffId, tx.type, tx.amount, tx.roomNumber || null, tx.ussdSessionId, tx.phoneNumber],
      );
      return { duplicate: rows.length === 0 };
    },

    async getShiftTotals(shiftId) {
      const [r] = await q(
        `select opening_float::int as "openingFloat", logged_cash::int as "loggedCash", cash_liability::int as liability
           from shift_liabilities where shift_id = $1`,
        [shiftId],
      );
      return r;
    },

    async closeShift({ shiftId, declaredCash }) {
      const rows = await q(
        `update shifts set closed_at = now(), declared_cash = $2, status = 'closed'
          where id = $1 and closed_at is null returning id`,
        [shiftId, declaredCash],
      );
      return { alreadyClosed: rows.length === 0, totals: await store.getShiftTotals(shiftId) };
    },

    async getOpenShiftsForVenue(venueId) {
      const rows = await q(
        `select st.full_name as "staffName", sl.cash_liability::int as liability
           from shift_liabilities sl join staff st on st.id = sl.staff_id
          where sl.venue_id = $1 and sl.closed_at is null
          order by sl.opened_at`,
        [venueId],
      );
      return rows;
    },

    async sumTakingsSince(venueId, since) {
      const [r] = await q(
        `select coalesce(sum(${SIGNED_AMOUNT}), 0) as total from transactions where venue_id = $1 and created_at >= $2`,
        [venueId, since],
      );
      return num(r.total);
    },

    async countRoomLogsSince(venueId, since) {
      const [r] = await q(
        `select count(*) as n from transactions where venue_id = $1 and type = 'room_cash' and created_at >= $2`,
        [venueId, since],
      );
      return num(r.n);
    },

    async addHousekeepingReport({ venueId, staffId, roomsUsed, ussdSessionId }) {
      const rows = await q(
        `insert into housekeeping_reports (venue_id, staff_id, rooms_used, ussd_session_id)
         values ($1, $2, $3, $4) on conflict (ussd_session_id) do nothing returning id`,
        [venueId, staffId, roomsUsed, ussdSessionId],
      );
      return { duplicate: rows.length === 0 };
    },

    async close() {
      await pool.end();
    },
  };
  return store;
}

module.exports = { createPostgresStore };
