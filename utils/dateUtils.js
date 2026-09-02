export function parseDateString(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Falls back to the server's own UTC date if the client didn't send a
// valid "YYYY-MM-DD" - but callers should always pass the client's local
// date (see getLocalDateString on the frontend) so "current month" matches
// what the user actually sees on their calendar.
export function resolveTodayParam(todayParam) {
  return /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : formatDateUTC(new Date());
}

export function getMonthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : null; // "YYYY-MM"
}

// Rolling 2-calendar-year retention window: keeps the current year and the
// immediately preceding one, drops everything older.
//   today = 2027-01-01 -> cutoff = 2026-01-01 (2025 and earlier is gone)
//   today = 2027-12-31 -> cutoff is STILL 2026-01-01 (2026 + 2027 kept)
export function getRetentionCutoffDate(todayStr) {
  const year = Number(todayStr.slice(0, 4));
  return `${year - 1}-01-01`;
}

export function getRetentionCutoffMonthKey(todayStr) {
  return getRetentionCutoffDate(todayStr).slice(0, 7);
}