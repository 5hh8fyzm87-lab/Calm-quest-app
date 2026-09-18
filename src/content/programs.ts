/**
 * Calm Quest — program pools (build 14, two-paths proposal §1).
 *
 * THE ARCHITECTURE IN ONE SENTENCE: a program is a POOL YOU ROTATE OVER, not a
 * new dimension on every item. The five themes, the four quest types, the 30
 * gratitude prompts and the 60 shared verses do not change; `profile.path` —
 * which already existed and was already persisted, but was read by nothing —
 * now decides which array the daily rotation runs over.
 *
 * What that buys, exactly:
 *  - the frozen Christian bundle (60 quests / 75 affirmations) is not edited at
 *    all — zero risk to the approved copy and to the content proofs;
 *  - a new program is a new file with the same three shapes (pools, themes,
 *    types) and no logic;
 *  - "switching" is not a migration: it changes which array the same pure
 *    rotation functions are handed. Nothing is reset, nothing is re-derived,
 *    and no XP/streak/level/kept data is touched (see the store, untouched).
 *
 * TWO DIFFERENT KINDS OF LOOKUP — the distinction this file exists to keep:
 *  - ROTATION goes through `questPool(path)` / `affirmationPool(path)`: only the
 *    program the profile holds. That is what "free holds one program" means.
 *  - ID RESOLUTION goes through `ALL_QUESTS` / `ALL_AFFIRMATIONS`: a completion,
 *    a saved affirmation or a kept row recorded while a DIFFERENT program was
 *    held must still resolve to its real content for ever, in the kept archive
 *    and on Home's done card. `ALL_*` is a lookup index; nothing ever rotates
 *    over it, and nothing counts it as a library a user holds.
 *
 * `profile.path` is written by Onboarding (a real choice, three live rows) and
 * changed from the Programs screen. Both directions go through the same store
 * write, with no other field touched.
 */
import type { Affirmation, PathId, Quest } from '../models/types';
import { affirmations as christianAffirmations } from './affirmations';
import { quests as christianQuests } from './quests';
import {
  anxietyStressAffirmations,
  anxietyStressQuests,
} from './programs/anxietyStress';
import {
  entrepreneurAffirmations,
  entrepreneurQuests,
} from './programs/entrepreneur';

/** Canonical program order — the order every picker row renders in. */
export const PATH_ORDER: readonly PathId[] = ['christian', 'entrepreneur', 'anxiety_stress'];

/**
 * The quests each program holds. Christian Mindset is the frozen Phase-6 bundle
 * (untouched); the two newer programs ship the lean Option-A bundle that build
 * 14 part 2 authored — 20 quests / 20 affirmations each, see each file's header.
 * A program is still nothing but the array its own file exports.
 */
export const PROGRAM_QUESTS: Record<PathId, readonly Quest[]> = {
  christian: christianQuests,
  entrepreneur: entrepreneurQuests,
  anxiety_stress: anxietyStressQuests,
};

/** The affirmations each program holds (same shape as `PROGRAM_QUESTS`). */
export const PROGRAM_AFFIRMATIONS: Record<PathId, readonly Affirmation[]> = {
  christian: christianAffirmations,
  entrepreneur: entrepreneurAffirmations,
  anxiety_stress: anxietyStressAffirmations,
};

/**
 * UNION OF EVERY PROGRAM'S QUESTS — an id-lookup index ONLY.
 *
 * Never rotate over this (that would give a free user the whole library and
 * break the one-program promise), never count it as a library a user holds
 * (that number belongs in `themeQuestCounts(pool)` per program), and never
 * render it as a list. It exists so that anything recorded on a past day — a
 * completion, a bonus completion, a kept row — keeps resolving to its real
 * title after a program switch.
 */
export const ALL_QUESTS: readonly Quest[] = [
  ...christianQuests,
  ...entrepreneurQuests,
  ...anxietyStressQuests,
];

/** Affirmation id-lookup index (the same rule as `ALL_QUESTS`). */
export const ALL_AFFIRMATIONS: readonly Affirmation[] = [
  ...christianAffirmations,
  ...entrepreneurAffirmations,
  ...anxietyStressAffirmations,
];

/** The pool the daily rotation runs over for the program a profile holds. */
export function questPool(path: PathId): readonly Quest[] {
  return PROGRAM_QUESTS[path] ?? christianQuests;
}

/** The affirmation pool the day's affirmation is drawn from. */
export function affirmationPool(path: PathId): readonly Affirmation[] {
  return PROGRAM_AFFIRMATIONS[path] ?? christianAffirmations;
}

/**
 * Resolve a quest id anywhere in the bundle (all programs). Returns undefined
 * rather than a substitute: a caller that cannot resolve an id must not render
 * a different quest in its place (see Home's done card).
 */
export function questById(id: string | undefined): Quest | undefined {
  if (!id) return undefined;
  return ALL_QUESTS.find((q) => q.id === id);
}

/** Resolve an affirmation id anywhere in the bundle (same rule as `questById`). */
export function affirmationById(id: string): Affirmation | undefined {
  return ALL_AFFIRMATIONS.find((a) => a.id === id);
}
