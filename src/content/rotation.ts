/**
 * Calm Quest — deterministic daily content rotation (Phase 2a).
 *
 * Today's quest and Affirmation of the Day are pure functions of the local
 * date: `index = dayNumber(dateStr) % length`. Same date → same item, on
 * every device, offline, and trivially testable (spec §3 F2: "Rotation is
 * deterministic (index = day count), so it works offline and is testable").
 *
 * Day number (days since 1970-01-01) keeps the rotation stable across
 * years — no week/day/month boundaries to shift it.
 */

/** Days since the Unix epoch (1970-01-01), computed from a "YYYY-MM-DD" string. */
export function dayNumber(dateStr: string): number {
  const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Today's quest: one Quest from the bundle, selected by day index.
 * Returns undefined only if the bundle is empty (defensive; Phase 1 ships 30).
 */
export function pickToday<T extends { id: string }>(
  items: readonly T[],
  dateStr: string,
): T | undefined {
  if (items.length === 0) return undefined;
  return items[dayNumber(dateStr) % items.length] as T;
}

/** One-liner for quest/affirmation call sites: stable index for a fixed date. */
export function rotationIndex(length: number, dateStr: string): number {
  if (length <= 0) return 0;
  return ((dayNumber(dateStr) % length) + length) % length;
}