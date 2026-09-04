/**
 * Calm Quest — local "today" helpers (Phase 2a).
 *
 * All rotation/streak logic is a pure function of a "YYYY-MM-DD" string
 * (see src/content/rotation.ts and src/streaks/streak.ts). This is the ONE
 * place wall-clock time enters the app: it formats the device's local date
 * once per screen render.
 */

/** Local date as "YYYY-MM-DD" (device timezone). Pure-ish: no I/O beyond Date. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Gentle date heading for the Today screen ("Wednesday, Sep 3"). */
export function friendlyDate(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}