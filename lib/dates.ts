// Pure date helpers working on `YYYY-MM-DD` strings, timezone-free.
// The app is single-timezone (one household, one mini PC), so calendar-date
// math is done on date strings rather than Date objects to avoid TZ drift.

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKLY_RULE_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Day of week for a YYYY-MM-DD string, 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** Monday of the week containing the given date (Mon–Sun weeks). */
export function startOfWeek(isoDate: string): string {
  const dow = dayOfWeek(isoDate);
  const offset = dow === 0 ? -6 : 1 - dow; // Sunday rolls back to previous Monday
  return addDays(isoDate, offset);
}

/** The seven YYYY-MM-DD dates of the week starting at `mondayISO`. */
export function weekDays(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** The calendar date portion of an ISO timestamp (local time). */
export function dateOfTimestamp(ts: string): string {
  const d = new Date(ts);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Short weekday label, e.g. "Mon". */
export function weekdayLabel(isoDate: string): string {
  return DAY_LABELS[dayOfWeek(isoDate)];
}

/** Human date like "Mon 8 Jun". */
export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Human date + time from an ISO timestamp, e.g. "Sat 13 Jun, 09:00". */
export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Three-letter weekday code used in recurrence rules, e.g. "SAT". */
export function weeklyRuleDay(isoDate: string): string {
  return WEEKLY_RULE_DAYS[dayOfWeek(isoDate)];
}

export { WEEKLY_RULE_DAYS };
