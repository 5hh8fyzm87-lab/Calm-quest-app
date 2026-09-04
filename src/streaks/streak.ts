/**
 * Calm Quest — grace-centered streak logic (feature spec §2 Flow C, §3 F5).
 *
 * PURE functions only: no I/O, no Date.now(), no randomness. Callers pass the
 * local "YYYY-MM-DD" date so the same inputs always yield the same output —
 * deterministic, offline-first, and trivially testable (spec F5).
 */

import type { StreakState } from '../models/types';

/** Maximum consecutive missed days covered by grace (Flow C rule 3). */
export const GRACE_WINDOW_DAYS = 3;

/**
 * Neutral-positive copy (Flow C rule 6 tone rules). No broken chains, no
 * flames, no "you lost X", no guilt — a missed day is never punished.
 */
export const STREAK_MESSAGES = {
  /** After a completion day. */
  secured: (days: number): string => `Day ${days} secured — whenever you're ready`,
  /** While inside the grace window. */
  grace: (days: number, remaining: number): string =>
    `Day ${days} secured. No pressure — pick up right where you left off (grace remaining: ${remaining})`,
  /** After grace exhausts and the streak resets. */
  freshStart: (): string =>
    'Every beginning is a fresh start. Day 1 starts when you say today.',
} as const;

/** Union of the streak states a chip can render (matches Flow C tone rules). */
export type StreakStatus = 'secured' | 'grace' | 'fresh';

/**
 * Derive the streak chip's status from persisted state alone (grace is a
 * pure function of `graceDaysMissed` — no clock, per spec F5: state is
 * reconciled on completion, and `graceDaysMissed` freezes at 0 when secured,
 * 1–3 inside the window, or resets with the streak).
 */
export function streakStatus(state: StreakState): StreakStatus {
  if (state.streakDays === 0) return 'fresh';
  if (state.graceDaysMissed > 0) return 'grace';
  return 'secured';
}

/** Pick the right STREAK_MESSAGES line for the current persisted state. */
export function streakMessage(state: StreakState): string {
  if (state.streakDays === 0) return STREAK_MESSAGES.freshStart();
  const remaining = GRACE_WINDOW_DAYS - state.graceDaysMissed;
  return state.graceDaysMissed > 0
    ? STREAK_MESSAGES.grace(state.streakDays, remaining)
    : STREAK_MESSAGES.secured(state.streakDays);
}

/**
 * Record a missed local day (no quest completed before end of day).
 *
 * Flow C rules 2–3, 5:
 * - streakDays NEVER decrements — the streak freezes at its current value.
 * - graceDaysMissed increments by 1, capped at 3.
 * - On the 4th consecutive missed day (would exceed the 3-day window), the
 *   streak resets to 0 and grace resets to 0; a fresh "Day 1" begins at the
 *   user's next completion.
 *
 * @param state current streak state (not mutated; returns a new object)
 * @param today local date "YYYY-MM-DD" of the missed day
 */
export function applyMissDay(state: StreakState, today: string): StreakState {
  void today; // Kept for signature symmetry with applyCompletion; rules need state only.

  if (state.graceDaysMissed < GRACE_WINDOW_DAYS) {
    // Still inside the grace window: freeze the streak, count the grace day.
    return {
      ...state,
      graceDaysMissed: (state.graceDaysMissed + 1) as StreakState['graceDaysMissed'],
    };
  }

  // 4th consecutive missed day: grace exhausted → fresh start (Flow C rule 5).
  return { streakDays: 0, graceDaysMissed: 0, lastQuestDate: state.lastQuestDate };
}

/**
 * Record a completed quest day (any quest type; one credit per local day).
 *
 * Flow C rules 1, 4:
 * - Completing on a grace day (graceDaysMissed > 0) resumes from the frozen
 *   value: streakDays + 1, graceDaysMissed → 0. The completion day counts as
 *   the next streak day. Example: 12 → miss Mon, Tue → complete Wed → 13.
 * - On a normal day: streakDays + 1.
 * - Either way, lastQuestDate moves to the completion day.
 *
 * @param state current streak state (not mutated; returns a new object)
 * @param today local date "YYYY-MM-DD" of the completed day
 */
export function applyCompletion(state: StreakState, today: string): StreakState {
  return {
    ...state,
    streakDays: state.streakDays + 1,
    graceDaysMissed: 0,
    lastQuestDate: today,
  };
}
