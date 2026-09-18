/**
 * Calm Quest — theme + quest-type display copy (Phase 2a).
 *
 * Static labels for UI chips/badges. Content-only; no logic.
 */

import type { PathId, QuestTheme, QuestType } from '../models/types';

/** Human labels for the 5 MVP themes (§4). */
export const THEME_LABELS: Record<QuestTheme, string> = {
  gratitude: 'Gratitude',
  stillness: 'Stillness',
  purpose: 'Purpose',
  forgiveness: 'Forgiveness',
  patience: 'Patience',
};

/** Emoji-free, calm chip labels for the 4 quest types (§3 F1). */
export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  read_reflect: 'Read & Reflect',
  act: 'Act',
  pause: 'Pause',
  write: 'Write',
};

/** One-line helper text for each quest type, shown under the title. */
export const QUEST_TYPE_INTROS: Record<QuestType, string> = {
  read_reflect: 'A verse and a short reflection — sit with one word that stays.',
  act: 'One small, real-world step you can take today.',
  pause: 'One quiet minute. A silent pause, nothing else required.',
  write: 'One line is enough. There is no right answer.',
};

// --- COPY (build 14) — mirrored verbatim in NEW_STRINGS.md ---
/**
 * The peace-&-rest program's in-app NAME. This constant is the ONLY place the
 * name appears in the codebase, so the owner can flip it in the copy pass
 * without touching a screen (owner decision, two-paths proposal §4 naming flag:
 * the spec's "Anxiety & Stress Support" was approved for a never-rendered row;
 * live, that is a health-adjacent term in an app that deliberately avoids health
 * claims — the program ships as a non-clinical name).
 *
 * The `PathId` itself (`anxiety_stress`) is a storage key, never rendered.
 */
export const PEACE_AND_REST_LABEL = 'Peace & Rest';

/** The three programs' display names, in the picker's canonical order. */
export const PATH_LABELS: Record<PathId, string> = {
  christian: 'Christian Mindset',
  entrepreneur: 'Entrepreneur Mindset',
  anxiety_stress: PEACE_AND_REST_LABEL,
};
// --- /COPY ---