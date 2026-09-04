/**
 * Calm Quest — paywall trigger logic (Phase 4a, feature spec §2 Flow E, §5).
 *
 * PURE functions only: no I/O, no Date.now(). Callers pass the local date.
 *
 * Rules (Flow E):
 *  - The paywall appears ONCE, immediately after the 3rd completed daily loop
 *    (never before — a first quest is never blocked by it).
 *  - Only for free users; a paid tier never sees it.
 *  - "Continue free" stamps `paywallSeenAt`; no modal re-nag for 7 days —
 *    not even across relaunches (the stamp persists).
 *  - After day 7, a small, dismissible "Growth" header button re-surfaces it
 *    (never blocking content, no guilt copy).
 */

import type { AppState } from '../storage/store';

/**
 * Completed daily loops before the paywall is offered (Flow E step 1:
 * "after the user completes their 3rd daily loop").
 */
export const PAYWALL_TRIGGER_LOOPS = 3;

/**
 * Days between "Continue free" and any re-surface. Before this many days have
 * passed, the modal must be unreachable — including via the Growth button.
 */
export const PAYWALL_RENAG_DAYS = 7;

/**
 * Count of completed daily loops. DERIVED from `quests.completions` —
 * decision: one completion flag per local day is already enforced by
 * `completeQuest`, so completions.length IS the loop count; a separate
 * counter could drift (e.g. restored/merged state) and then disagree with
 * the visible history. Deriving keeps the trigger honest by construction:
 * it counts what the user can actually see they did.
 */
export function loopsCompleted(state: Pick<AppState, 'quests'>): number {
  return state.quests.completions.length;
}

/**
 * Which paywall surface (if any) should show right now.
 *  - 'auto': the one-time modal — fires exactly when this completion makes
 *    loopsCompleted hit 3, for a free user who has never seen the paywall.
 *  - 'growth': the small header re-surface, allowed only 7+ days after
 *    paywallSeenAt. Non-blocking, dismissible in the UI.
 *  - null: nothing.
 *
 * `completedThisLoop` is true when called right after a quest completion
 * (the only moment 'auto' is allowed to fire — never mid-browse).
 */
export function paywallSurface(
  state: Pick<AppState, 'entitlements' | 'quests' | 'paywallSeenAt'>,
  today: string,
  completedThisLoop: boolean,
): 'auto' | 'growth' | null {
  // Paid users are past the paywall — permanently.
  if (state.entitlements.tier === 'paid') return null;

  const loops = loopsCompleted(state);

  // One-time modal: from the 3rd completed loop onward, on a completion
  // moment, for a user who has NEVER seen the paywall (no paywallSeenAt).
  // "Once" is enforced by the stamp: after "Continue free" (or a verified
  // upgrade) this can never fire again — including across relaunches. If the
  // app closed before the user engaged (kill mid-flow), re-offering on the
  // next completion is honest: they never declined anything.
  if (completedThisLoop && loops >= PAYWALL_TRIGGER_LOOPS && !state.paywallSeenAt) {
    return 'auto';
  }

  // Re-surface: small header button, earliest on day 7 after the decline.
  if (state.paywallSeenAt) {
    return daysSinceSeen(state.paywallSeenAt, today) >= PAYWALL_RENAG_DAYS ? 'growth' : null;
  }

  return null;
}

/**
 * Whole days since the paywall was declined ("Continue free"). Pure date
 * arithmetic on "YYYY-MM-DD" strings via addDays' parser — no wall clock.
 * (Local reimplementation rather than importing store.ts, which pulls
 * AsyncStorage into otherwise-pure consumers.)
 */
export function daysSinceSeen(seenAt: string, today: string): number {
  return Math.floor((parseDate(today) - parseDate(seenAt)) / 86_400_000);
}

/** Parse a "YYYY-MM-DD" local date string. Assumes well-formed input. */
function parseDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}
