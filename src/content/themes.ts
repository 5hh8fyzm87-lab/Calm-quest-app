/**
 * Calm Quest — theme + quest-type display copy (Phase 2a).
 *
 * Static labels for UI chips/badges. Content-only; no logic.
 */

import type { QuestTheme, QuestType } from '../models/types';

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

/** Path labels for the onboarding path rows (Flow A). */
export const PATH_LABELS: Record<string, string> = {
  christian: 'Christian Mindset',
  entrepreneur: 'Entrepreneur Mindset',
  anxiety_stress: 'Anxiety & Stress Support',
};