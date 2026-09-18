/**
 * Calm Quest — verse shelves for "Sit with a verse" (build 13, proposal §2 I).
 *
 * The bundled library holds 60 WEB verses and the daily rotation surfaces ONE
 * of them. This module answers the only two questions the reading screen asks:
 * which verse is today's, and which verses this tier may browse.
 *
 * The free shelf is a FIXED list of ten — literally the ids below, in this
 * order, forever. It does not rotate, does not change with the date, and is not
 * derived from anything: an evergreen set is only honest if it can never be
 * something else tomorrow (proposal §3 rule 3 — no rotating content treadmill).
 * Calm Quest+ opens the whole library.
 *
 * Reading grants nothing: no XP, no completion, no streak interaction. PURE —
 * no I/O, no Date.now(), no writes.
 */

import type { Tier, Verse } from '../models/types';
import { dayNumber } from './rotation';
import { verses } from './verses';

/**
 * The ten verses every tier may always sit with (owner-approved fixed set,
 * Sep 2026). Quiet, rest-and-steadiness verses from the bundled WEB library.
 */
export const EVERGREEN_VERSE_IDS: readonly string[] = [
  'verse-psalm-46-10',
  'verse-psalm-23-2',
  'verse-psalm-62-1',
  'verse-matt-11-28',
  'verse-mark-6-31',
  'verse-isaiah-40-31',
  'verse-lam-3-26',
  'verse-psalm-4-8',
  'verse-isaiah-26-3',
  'verse-psalm-131-2',
];

/** The evergreen ten, resolved from the bundle in the fixed order above. */
export function evergreenVerses(): Verse[] {
  const byId = new Map(verses.map((v) => [v.id, v]));
  const out: Verse[] = [];
  for (const id of EVERGREEN_VERSE_IDS) {
    const found = byId.get(id);
    if (found) out.push(found);
  }
  return out;
}

/** Today's verse: the same deterministic daily pick the quests read. */
export function verseForDate(date: string): Verse | undefined {
  if (verses.length === 0) return undefined;
  return verses[dayNumber(date) % verses.length];
}

/** What the reading screen may show right now, and how honestly it counts it. */
export interface VerseShelf {
  /** Today's verse — always first, always free. */
  day: Verse | undefined;
  /** Today's verse id, so the browser can mark exactly one row as "today". */
  dayId: string | null;
  /** The verses this tier can browse, in reading order. */
  list: Verse[];
  /** How many verses are on the shelf right now (the honest numerator). */
  shown: number;
  /** The whole bundled library size (the honest denominator: 60). */
  total: number;
  /** True when a gold invitation line belongs under the count (free tier). */
  gated: boolean;
}

/**
 * The shelf for a tier. FREE = today's verse plus the fixed evergreen ten
 * (counted as UNIQUE verses — if today's verse happens to be one of the ten,
 * the shelf is ten, not eleven: the count never inflates). Calm Quest+ = the
 * whole library in bundle order, with today's verse still marked in place.
 */
export function verseShelf(tier: Tier, date: string): VerseShelf {
  const day = verseForDate(date);
  const dayId = day ? day.id : null;
  const total = verses.length;

  if (tier === 'paid') {
    return { day, dayId, list: [...verses], shown: verses.length, total, gated: false };
  }

  const shelf: Verse[] = [];
  const seen = new Set<string>();
  if (day) {
    shelf.push(day);
    seen.add(day.id);
  }
  for (const verse of evergreenVerses()) {
    if (seen.has(verse.id)) continue;
    shelf.push(verse);
    seen.add(verse.id);
  }
  return { day, dayId, list: shelf, shown: shelf.length, total, gated: true };
}
