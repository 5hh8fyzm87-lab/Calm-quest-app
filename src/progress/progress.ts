/**
 * Calm Quest — XP & levels (feature spec §3 F4).
 *
 * PURE functions only: no I/O, no Date.now(). Level math is flat — 100 XP per
 * level — and titles ship as content (a fixed, growth-themed 20-title list:
 * Seed → Sprout → … → Shelter). No curve in the MVP, per spec F4.
 *
 * Entitlement note (spec §5): levels 1–5 are free, levels 6–20 are Calm Quest+
 * (paid). Phase 2b stores `tier: 'free'` only — the paywall (Phase 4) owns
 * gating; `levelTier` here merely reflects that split for future UI.
 */

import type { Tier } from '../models/types';

/** Awarded for completing a daily quest (F1). */
export const XP_QUEST = 50;
/** Awarded for saving the Affirmation of the Day (F2). */
export const XP_AFFIRMATION = 5;
/** Awarded for completing a Gratitude Glimpse (F3). */
export const XP_GLIMPSE = 20;

/** Flat level curve: one level per 100 XP (spec F4: "simple integer math"). */
export const XP_PER_LEVEL = 100;

/**
 * Levels 1–5 are free, 6–20 are paid (spec §5). Determined purely by level
 * number so a future gating screen can branch on it with no extra state.
 */
export const FREE_LEVELS = 5;
export const TOTAL_LEVELS = 20;

/** Growth-metaphor titles (spec §4: "Seed, Sprout, Tender, Growing, …"). */
export const LEVEL_TITLES: readonly string[] = [
  'Seed',      // 1
  'Sprout',    // 2
  'Tender',    // 3
  'Growing',   // 4
  'Steady',    // 5
  'Standing',  // 6
  'Rooted',    // 7
  'Branching', // 8
  'Leafing',   // 9
  'Blossom',   // 10
  'Fruitful',  // 11
  'Haven',     // 12
  'Keeper',    // 13
  'Nurturer',  // 14
  'Wisdom',    // 15
  'Grace',     // 16
  'Abundant',  // 17
  'Verdant',   // 18
  'Flourish',  // 19
  'Shelter',   // 20
];

/** Total XP required to *hold* level n (1-indexed): (n-1) × 100. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (l - 1) * XP_PER_LEVEL;
}

/** Current level at a given total-XP balance. Never below 1. */
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

/** Soft floor of the current level (total XP minus the level's entry cost). */
export function levelFloorXp(xp: number): number {
  const lvl = levelForXp(xp);
  return xpForLevel(lvl);
}

/** What the level-up moment celebrates: a title + a blessing line (Flow D). */
export function levelTitleInfo(level: number): {
  title: string;
  blessing: string;
} {
  return {
    title: LEVEL_TITLES[level - 1] ?? `Level ${level}`,
    blessing: BLESSINGS[level - 1] ?? BLESSINGS[BLESSINGS.length - 1],
  };
}

/** One gentle blessing line per level (Flow D "one-line blessing"). */
const BLESSINGS: readonly string[] = [
  'Every tree starts as a seed. You are just beginning.',
  'A sprout is small — and already on its way.',
  'Tender things need time. You have it.',
  'Growth is quiet work. You keep showing up.',
  'Steady beats fast. Look how far you have come.',
  'You are standing in ground you once only hoped for.',
  'Rooted things grow slowly. Keep going.',
  'Branches reach out because the roots held on.',
  'New leaves, new light — that is where you are.',
  'You are in bloom. Not because you rushed, but because you stayed.',
  'Fruit is what grows when the practice becomes yours.',
  'A haven is a place people can rest. You are becoming one.',
  'You keep what matters. That is no small thing.',
  'What you have learned is now what you give.',
  'Wisdom is a practiced heart, not a perfect one.',
  'Grace was the ground the whole time.',
  'Abundant days are made of many small faithful ones.',
  'You are greener than you were. That is everything.',
  'Flourishing is not a finish line. It is a way of walking.',
  'A shelter for others — that is what the years built.',
];

/**
 * Level tier in the current entitlement model (spec §5: L1–5 free, L6–20 paid).
 * Phase 2b always stores FREE. Paywall gating is Phase 4 — this only classifies.
 */
export function levelTier(level: number): Tier {
  return level <= FREE_LEVELS ? 'free' : 'paid';
}