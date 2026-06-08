import { addDays, dateOfTimestamp } from "./dates";

// Shopping-trip coverage window (BUILD_SPEC §6.4).
//
// A trip covers meals from the day AFTER the previous trip's date up to and
// including this trip's date. (You shop, and that food covers you until the
// next shop.) For the earliest trip, the window starts from today.

export interface CoverageWindow {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
}

export interface TripLike {
  id: string;
  trip_at: string; // ISO timestamp
}

/**
 * The trip immediately preceding `target` by `trip_at`, or null if `target`
 * is the earliest. Ties (equal timestamps) are not counted as "previous".
 */
export function findPreviousTrip<T extends TripLike>(
  trips: T[],
  target: T,
): T | null {
  let prev: T | null = null;
  for (const t of trips) {
    if (t.id === target.id) continue;
    if (t.trip_at < target.trip_at) {
      if (!prev || t.trip_at > prev.trip_at) prev = t;
    }
  }
  return prev;
}

/**
 * Compute the coverage window for `target` given all trips and today's date.
 * `today` is a YYYY-MM-DD string (injected so the function stays pure/testable).
 */
export function coverageWindow<T extends TripLike>(
  trips: T[],
  target: T,
  today: string,
): CoverageWindow {
  const end = dateOfTimestamp(target.trip_at);
  const previous = findPreviousTrip(trips, target);
  const start = previous
    ? addDays(dateOfTimestamp(previous.trip_at), 1)
    : today;
  return { start, end };
}

/** Whether a YYYY-MM-DD date falls within [window.start, window.end] inclusive. */
export function dateInWindow(date: string, window: CoverageWindow): boolean {
  return date >= window.start && date <= window.end;
}

/**
 * The next occurrence of a recurring weekly trip: simply one week later.
 * Full RRULE handling is out of scope (BUILD_SPEC §6.4).
 */
export function nextWeeklyTripAt(tripAt: string): string {
  const d = new Date(tripAt);
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}
