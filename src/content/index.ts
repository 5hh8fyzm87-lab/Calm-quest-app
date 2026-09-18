/**
 * Calm Quest — offline content bundle (Phase 6).
 *
 * Self-describing barrel: all four content sets plus CONTENT_META. Phase 6
 * replaced the Phase 1 SAMPLE starter set wholesale with the full in-house
 * content pack: 60 quests (5 themes × 12), 75 affirmations, 30 gratitude
 * prompts, 60 WEB verses.
 */
import type { Quest, Affirmation, GratitudePrompt, Verse } from '../models/types';
import { quests } from './quests';
import { affirmations } from './affirmations';
import { prompts } from './prompts';
import { verses } from './verses';
import { dayNumber, pickToday, rotationIndex } from './rotation';
import {
  PATH_LABELS,
  PEACE_AND_REST_LABEL,
  QUEST_TYPE_INTROS,
  QUEST_TYPE_LABELS,
  THEME_LABELS,
} from './themes';
import {
  ALL_AFFIRMATIONS,
  ALL_QUESTS,
  affirmationById,
  affirmationPool,
  PATH_ORDER,
  PROGRAM_AFFIRMATIONS,
  PROGRAM_QUESTS,
  questById,
  questPool,
} from './programs';

export { quests, affirmations, prompts, verses };
export { dayNumber, pickToday, rotationIndex };
export { PATH_LABELS, PEACE_AND_REST_LABEL, QUEST_TYPE_INTROS, QUEST_TYPE_LABELS, THEME_LABELS };
// Build 14 (two-paths §1): the program pools + the two lookup indexes. Screens
// and gates import them from here like every other content set.
export {
  ALL_AFFIRMATIONS,
  ALL_QUESTS,
  affirmationById,
  affirmationPool,
  PATH_ORDER,
  PROGRAM_AFFIRMATIONS,
  PROGRAM_QUESTS,
  questById,
  questPool,
};
export type { Quest, Affirmation, GratitudePrompt, Verse };

/**
 * Bundle metadata. Consumers should surface `attribution` wherever verses
 * render, and treat the `note` as the honest status of this content.
 *
 * Build 14 (two-paths §5): 1.1.0 — the bundle now holds three programs, so the
 * note stops quoting one program's counts as the whole pack (the colophon below
 * prints the CURRENT program's real counts instead, from its own pool). The
 * colophon must never overstate: the two newer programs ship starter sets while
 * their authoring wave lands, and the counts it prints are lengths of real
 * arrays, not targets.
 */
export const CONTENT_META = {
  version: '1.1.0',
  note: 'In-house content pack — three programs, shared prompts and WEB verses',
  attribution:
    'Scripture from the World English Bible (WEB), public domain. All other content written in-house for Calm Quest.',
} as const;

/** Convenience counts for boot-time proofs and future diagnostics. */
export const CONTENT_COUNTS = {
  quests: quests.length,
  affirmations: affirmations.length,
  prompts: prompts.length,
  verses: verses.length,
} as const;