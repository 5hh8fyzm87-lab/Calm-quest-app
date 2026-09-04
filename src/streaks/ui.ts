/**
 * Calm Quest — honest streak-UI derivation (Phase 3, feature spec §2 Flow C).
 *
 * The persisted `StreakState.graceDaysMissed` ledger is only reconciled when a
 * quest is completed (see src/storage/store.ts reconcileStreakForCompletion),
 * so at rest it is always 0 — a chip derived from it alone could show "Day N
 * secured" on the morning after a missed day, which is not honest.
 *
 * This helper derives the CURRENT truthful grace position from
 * `StreakState` + today's local date (both pure inputs; no clock inside, no
 * I/O — spec F5's "state derived deterministically ... no cron jobs"):
 *   - Full local days since the last completion that carried no quest are
 *     "missed" (the completion day and today itself never count — today is
 *     still winnable).
 *   - 1–3 missed days → in grace, streak frozen, `graceRemaining` shows what
 *     is left.
 *   - The 3rd missed day means grace is exhausted: today is the last chance —
 *     complete today and the streak resumes, let today pass and it resets.
 *   - 4+ missed days → the streak has already reset in the honest ledger;
 *     show the fresh-start line (the store catches up at the next completion).
 *
 * Tone guardrails (Flow C rule 6 + 8): neutral-positive only — no broken
 * chains, no flames, no "you lost X", no negative countdown. Grace is
 * automatic and free; this helper never implies otherwise.
 */

import type { StreakState } from '../models/types';
import { GRACE_WINDOW_DAYS, STREAK_MESSAGES } from './streak';
import type { StreakStatus } from './streak';

export interface StreakUi {
  /** 'secured' | 'grace' | 'fresh' — which STREAK_MESSAGES line to show. */
  status: StreakStatus;
  /** Full local days missed since the last completion (0 = fully secured). */
  missedDays: number;
  /** True while the streak is frozen inside the grace window. */
  inGrace: boolean;
  /** Days of grace left before a fresh start (3 − missedDays, clamped 0–3). */
  graceRemaining: number;
  /**
   * True when grace is exhausted and today is the last chance: completing
   * today resumes the streak; if today ends without a quest, it resets.
   */
  resetsToday: boolean;
  /** The correct, always-honest STREAK_MESSAGES line for the chip. */
  message: string;
}

/** Local "YYYY-MM-DD" → Date at local midnight (assumes well-formed input). */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole calendar days between two local dates (start ≤ end). */
function calendarDaysBetween(startIso: string, endIso: string): number {
  const start = parseDate(startIso).getTime();
  const end = parseDate(endIso).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Derive the honest streak chip state. `today` is the caller's local
 * "YYYY-MM-DD" — pass the same value used everywhere else in the app.
 */
export function streakUi(state: StreakState, today: string): StreakUi {
  // No streak (or one already declared over by the store) → fresh start.
  if (state.streakDays === 0) {
    return {
      status: 'fresh',
      missedDays: 0,
      inGrace: false,
      graceRemaining: GRACE_WINDOW_DAYS,
      resetsToday: false,
      message: STREAK_MESSAGES.freshStart(),
    };
  }

  // Full days since the last completion that carried no quest. The completion
  // day itself never counts; today is not over yet, so it does not count
  // either (missedDays = calendarDaysBetween − 1).
  let missedDays = 0;
  if (state.lastQuestDate !== null) {
    const since = calendarDaysBetween(state.lastQuestDate, today);
    missedDays = Math.max(0, since - 1);
  }
  // Guard against any persisted ledger that already reports grace days
  // (defensive only — the reconciler normally zeroes it on write).
  missedDays = Math.max(missedDays, state.graceDaysMissed);

  // 4+ missed days: the window is long past — the streak has honestly reset,
  // even though the store catches up only at the next completion.
  if (missedDays > GRACE_WINDOW_DAYS) {
    return {
      status: 'fresh',
      missedDays,
      inGrace: false,
      graceRemaining: 0,
      resetsToday: false,
      message: STREAK_MESSAGES.freshStart(),
    };
  }

  const inGrace = missedDays > 0;
  const graceRemaining = GRACE_WINDOW_DAYS - missedDays;
  return {
    status: inGrace ? 'grace' : 'secured',
    missedDays,
    inGrace,
    graceRemaining,
    // Exactly 3 missed days: today is the last grace day. Complete today and
    // the streak resumes; let today pass and the fresh start begins tomorrow.
    resetsToday: missedDays === GRACE_WINDOW_DAYS,
    message: inGrace
      ? STREAK_MESSAGES.grace(state.streakDays, graceRemaining)
      : STREAK_MESSAGES.secured(state.streakDays),
  };
}