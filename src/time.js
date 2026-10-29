// Kenya is UTC+3 all year (no daylight saving), so plain arithmetic is safe.
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

// Start of "today" in Nairobi, as a UTC Date.
function startOfNairobiDay(now = new Date()) {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - NAIROBI_OFFSET_MS);
}

function hoursAgo(hours, now = new Date()) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

// "2026-10-14" in Nairobi.
function nairobiDate(now = new Date()) {
  return new Date(now.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

module.exports = { startOfNairobiDay, hoursAgo, nairobiDate };
