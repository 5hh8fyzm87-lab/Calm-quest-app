/**
 * Calm Quest — offline content bundle (Phase 1).
 *
 * Self-describing barrel: all four content sets plus CONTENT_META, which
 * honestly marks this bundle as a SAMPLE starter set for Phase 1 — the
 * in-house content pass replaces it wholesale before any user-facing ship.
 */
import type { Quest, Affirmation, GratitudePrompt, Verse } from '../models/types';
import { quests } from './quests';
import { affirmations } from './affirmations';
import { prompts } from './prompts';
import { verses } from './verses';
import { dayNumber, pickToday, rotationIndex } from './rotation';
import {
  PATH_LABELS,
  QUEST_TYPE_INTROS,
  QUEST_TYPE_LABELS,
  THEME_LABELS,
} from './themes';

export { quests, affirmations, prompts, verses };
export { dayNumber, pickToday, rotationIndex };
export { PATH_LABELS, QUEST_TYPE_INTROS, QUEST_TYPE_LABELS, THEME_LABELS };
export type { Quest, Affirmation, GratitudePrompt, Verse };

/**
 * Bundle metadata. Consumers should surface `attribution` wherever verses
 * render, and treat the `note` as the honest status of this content.
 */
export const CONTENT_META = {
  version: '0.1.0-sample',
  note: 'SAMPLE starter set — replaced in the in-house content pass',
  attribution:
    'Scripture from the World English Bible (WEB), public domain. All other content written in-house for Calm Quest (sample, not final).',
} as const;

/** Convenience counts for boot-time proofs and future diagnostics. */
export const CONTENT_COUNTS = {
  quests: quests.length,
  affirmations: affirmations.length,
  prompts: prompts.length,
  verses: verses.length,
} as const;