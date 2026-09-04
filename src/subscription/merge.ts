/**
 * Calm Quest — guest-to-account merge (Phase 4a, feature spec §3 F10).
 *
 * PURE function, no network I/O. Real auth (Supabase/Firebase + Sign in with
 * Apple) is Phase 4b/6 — it will fetch the account's remote state and call
 * this with the two snapshots. The rules are the spec's, verbatim:
 *   "merge guest streak, level/XP, and My Glimpse entries into the new
 *    account; conflict resolution = keep the higher streak, union of entries."
 * Plus the F10 deliverable's "keep higher XP" — XP never goes down on merge
 * (no fake progress loss), and the level re-derives from the winning XP so
 * it can never drift (same invariant the store enforces on load).
 *
 * Local-only fields are carried through defensively: fresh-install defaults
 * are applied to anything the account snapshot lacks, so the merged state is
 * always complete (same contract as loadState).
 */

import type { AppState } from '../storage/store';
import { defaultState } from '../storage/store';
import { levelForXp } from '../progress/progress';

/**
 * Merge a guest's local state into an account's state at account creation
 * (F10). Pure: returns a new AppState, mutates nothing, does no I/O.
 *
 * Conflict rules (spec F10 + Phase 4a brief):
 *  - streak: keep the HIGHER streakDays (grace counters travel with it);
 *  - XP: keep the HIGHER totalXp; level re-derives from the winner;
 *  - glimpses: UNION by entry id (guest entries the account lacks are added);
 *  - affirmations: union of saved ids (same "nothing the guest did is lost" principle);
 *  - completed quest ids: union; completions history: union by (date, questId);
 *  - lastQuestCompletionDate: the later of the two (drives next-day rotation);
 *  - paywallSeenAt: the earlier stamp wins (a user who already declined the
 *    paywall must not be re-nagged by a merge);
 *  - entitlements: the account's (a paid account stays paid; a free account
 *    does not inherit 'paid' — entitlements come only from verified purchase,
 *    never from the merge);
 *  - profile/onboarding: the account's profile wins (they signed into it),
 *    with onboarding treated as done once either side completed it.
 */
export function mergeGuestState(guest: AppState, account: AppState): AppState {
  const base = defaultState();

  // Union of completions, deduped by (date, questId) — the same completion
  // recorded on both sides collapses to one.
  const seen = new Set<string>();
  const completions = [...account.quests.completions, ...guest.quests.completions].filter((c) => {
    const key = `${c.date}|${c.questId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Union of glimpses by id — "My Glimpses" entries survive account creation.
  const glimpseIds = new Set(account.glimpses.map((g) => g.id));
  const glimpses = [...account.glimpses, ...guest.glimpses.filter((g) => !glimpseIds.has(g.id))];

  // Keep the higher streak; grace counters belong to the streak they came with.
  const streak =
    guest.streak.streakDays > account.streak.streakDays ? guest.streak : account.streak;

  // Higher XP wins; level always re-derives from the winning XP.
  const totalXp = Math.max(guest.progress.totalXp, account.progress.totalXp);

  // Earlier paywall decline wins — never re-nag someone who already said no.
  const paywallSeenAt = firstNonNull(guest.paywallSeenAt, account.paywallSeenAt);

  const lastDate = [guest.quests.lastQuestCompletionDate, account.quests.lastQuestCompletionDate]
    .filter((d): d is string => typeof d === 'string')
    .sort()
    .pop();

  return {
    ...base,
    profile: {
      // The account's identity + preferences win; onboarding is done if the
      // guest had finished it (they clearly use the app) or the account had.
      ...(guest.profile.onboarded ? { ...account.profile, onboarded: true } : account.profile),
    },
    progress: { totalXp, level: levelForXp(totalXp) },
    streak,
    quests: {
      completedQuestIds: Array.from(new Set([...account.quests.completedQuestIds, ...guest.quests.completedQuestIds])),
      completions,
      lastQuestCompletionDate: lastDate ?? base.quests.lastQuestCompletionDate,
    },
    savedAffirmationIds: Array.from(new Set([...account.savedAffirmationIds, ...guest.savedAffirmationIds])),
    glimpses,
    // Entitlements come from the ACCOUNT only — never upgraded by a merge.
    entitlements: account.entitlements,
    paywallSeenAt,
    contentVersion: base.contentVersion,
  };
}

/** First defined value (used for paywallSeenAt precedence). */
function firstNonNull<T>(a: T | undefined | null, b: T | undefined | null): T | null {
  if (a != null) return a;
  if (b != null) return b;
  return null;
}
