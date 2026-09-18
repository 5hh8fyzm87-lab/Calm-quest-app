/**
 * Calm Quest — Phase 4b paid-feature gates (feature spec §5 free/paid split +
 * §3 S1 theme peek).
 *
 * PURE functions only: no I/O, no Date.now(). Callers pass persisted state +
 * the local "YYYY-MM-DD" date, and every answer derives deterministically —
 * the same honesty principle as Phase 4a's paywall logic. A close-and-reopen,
 * a clock change, or a hand-edited in-memory flag can never grant more than
 * the persisted ledger allows: the checks below evaluate the persisted state
 * AT INTERACTION TIME.
 *
 * The §5 split enforced here:
 *  - Gratitude Glimpse: free = 1 per local calendar day; paid = unlimited.
 *  - Theme peek (S1): paid sees all 5 themes + the full library; free sees
 *    only today's theme. The DAILY QUEST itself is never gated — free users
 *    simply don't see the full theme library (spec: "drives paywall desire
 *    without blocking play").
 *  - Second daily quest: paid only, one extra per day, XP reward only — the
 *    one-per-day loop/streak ledger is never touched (see
 *    store.completeBonusQuest, which owns the persistence).
 */

import { PATH_ORDER, pickToday, questPool } from '../content';
import { dayNumber } from '../content/rotation';
import type { PathId, Quest, QuestTheme } from '../models/types';
import type { AppState } from '../storage/store';

/** Free tier gets exactly one Gratitude Glimpse per local day (§5). */
export const FREE_DAILY_GLIMPSES = 1;

/** Canonical theme order (the 5 MVP themes, spec §4). */
export const THEME_ORDER: readonly QuestTheme[] = [
  'gratitude',
  'stillness',
  'purpose',
  'forgiveness',
  'patience',
];

// ---------------------------------------------------------------------------
// Program gates (build 14, two-paths §1 + §3) — the mirror-image of the theme
// gate at the level of whole programs.
//
// The honesty contract is identical to the theme gate's: both are PURE, both
// derive from the persisted snapshot AT INTERACTION TIME, and neither invents a
// "locked" state. Free HOLDS one program (the one the profile chose, and the
// daily loop still runs there in full); Calm Quest+ holds all three at once and
// switches any day. Nothing a user already earned depends on which program is
// held — streak, XP, levels and everything kept are read from ledgers that never
// mention a program.
// ---------------------------------------------------------------------------

/**
 * The state slices the program/theme gates need. Deliberately structural (not
 * `Pick<AppState, ...>`, which would demand a whole `UserProfile`): a caller
 * only ever knows these two facts, and the gates must be callable from a
 * pre-load render too (where the honest answer is "nothing is held yet").
 */
export interface ProgramGateSlice {
  entitlements: Pick<AppState['entitlements'], 'tier'>;
  profile: { path: PathId };
}

/**
 * The programs the user HOLDS right now. Free: exactly the one the profile
 * chose. Paid: all three, in canonical order.
 *
 * "Holds" is the honest word: it decides which pool the daily rotation and the
 * bonus quest run over, and which program the picker marks as current. It never
 * gates content the user already completed or kept (see `ALL_QUESTS`).
 */
export function programsFor(state: ProgramGateSlice): PathId[] {
  if (state.entitlements.tier === 'paid') return [...PATH_ORDER];
  return [state.profile.path];
}

/**
 * Whether the user may CHANGE which program is theirs.
 *
 * Owner decision (two-paths §3 fork (a), recommended and approved): free
 * switching is allowed — a free user holds exactly ONE program at a time and
 * may change which one whenever they like. The other rows in the picker say
 * what Calm Quest+ adds (holding all three at once), and the theme gate inside
 * each program still carries the wall that converts. Depth, not walls.
 *
 * Fork (b) — the locked-program fallback the owner did not take — is exactly
 * this one line: `return state.entitlements.tier === 'paid';`. The parameter is
 * kept so that flip needs no call-site change.
 */
export function canSwitchPrograms(
  state: Pick<AppState, 'entitlements'>,
): boolean {
  void state;
  return true;
}


// ---------------------------------------------------------------------------
// Gratitude Glimpse cap (§5: 1/day free, unlimited paid)
// ---------------------------------------------------------------------------

/** How many glimpses the persisted ledger holds for a local date. */
export function glimpsesToday(
  state: Pick<AppState, 'glimpses'>,
  date: string,
): number {
  return state.glimpses.filter((g) => g.date === date).length;
}

/**
 * Whether the free daily glimpse cap is reached for `date`. Always false for
 * paid users (unlimited). Derived from the persisted `glimpses` ledger at
 * interaction time — closing and reopening the app can never grant a second
 * glimpse, because the ledger is the only input.
 */
export function glimpseCapReached(
  state: Pick<AppState, 'entitlements' | 'glimpses'>,
  date: string,
): boolean {
  if (state.entitlements.tier === 'paid') return false;
  return glimpsesToday(state, date) >= FREE_DAILY_GLIMPSES;
}

// ---------------------------------------------------------------------------
// Theme peek (S1): paid = all 5 themes on demand; free = only today's quest
// ---------------------------------------------------------------------------

/** Paid users can browse the full theme library; free users cannot. */
export function canBrowseThemes(state: Pick<AppState, 'entitlements'>): boolean {
  return state.entitlements.tier === 'paid';
}

/**
 * The themes a user may SEE right now, inside the program they hold.
 * Paid: all 5, in canonical order. Free: only today's quest theme — resolved
 * from THEIR program's pool (build 14), so the daily quest is never removed,
 * only the full library is (S1: "free users see only today's quest").
 *
 * Signature note (build 14): the state slice now carries `profile`, because the
 * answer depends on which pool the profile rotates over. All three call sites
 * (Home, Paywall, Settings) pass the same persisted snapshot they already had.
 */
export function visibleThemes(
  state: ProgramGateSlice,
  today: string,
): QuestTheme[] {
  if (state.entitlements.tier === 'paid') return [...THEME_ORDER];
  const todays = pickToday(questPool(state.profile.path), today);
  return todays ? [todays.theme] : [];
}

/**
 * Real quest counts per theme, FROM THE POOL THE USER ROTATES OVER — the honest
 * "peek": what their program actually holds (nothing fabricated, no other
 * program counted in). Build 14: the pool is a parameter, because with three
 * programs there is no longer one bundle to count. Callers pass
 * `questPool(profile.path)`; the Christian program's pool is still the same
 * frozen 60-quest bundle, so its numbers are unchanged.
 */
export function themeQuestCounts(pool: readonly Quest[]): Record<QuestTheme, number> {
  const counts: Record<QuestTheme, number> = {
    gratitude: 0,
    stillness: 0,
    purpose: 0,
    forgiveness: 0,
    patience: 0,
  };
  for (const q of pool) counts[q.theme] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Second daily quest (§5 paid feature): XP reward only, never a loop/streak
// credit. `completeBonusQuest` (store) owns persistence; these are the pure
// availability + selection rules.
// ---------------------------------------------------------------------------

/**
 * Whether a paid user may pick up today's bonus (2nd) quest right now:
 * paid tier AND no bonus completion already recorded for the local day.
 * Free users can never reach true here — the surface simply never renders,
 * and the store guard (completeBonusQuest) rejects them anyway.
 */
export function bonusQuestAvailable(
  state: Pick<AppState, 'entitlements' | 'quests'>,
  today: string,
): boolean {
  if (state.entitlements.tier !== 'paid') return false;
  const bonus = state.quests.bonusCompletions ?? [];
  return !bonus.some((c) => c.date === today);
}

/**
 * Pick the bonus quest for today, deterministically (same date → same pick),
 * scoped to the program the profile holds (build 14).
 *
 * Rules:
 *  - never today's daily quest (the one-per-day loop must not double-credit);
 *  - prefer quests never completed at all (fresh library first — where
 *    "library" now means THIS program's pool);
 *  - when the pool is exhausted, fall back to repeats from the rest of the
 *    pool — the spec's "evergreen repeats" ("a familiar friend"); the UI
 *    already frames repeated quests gently, so no extra copy is fabricated.
 *  - returns undefined when the paid bonus slot is unavailable (free tier or
 *    already used today) — the caller must not render anything.
 *
 * A bonus quest can never come from another program: a free user never reaches
 * this function at all (the tier check below), and a paid user's second quest
 * belongs to the program they are rotating over today.
 */
export function pickBonusQuest(
  state: Pick<AppState, 'entitlements' | 'profile' | 'quests'>,
  today: string,
): Quest | undefined {
  if (!bonusQuestAvailable(state, today)) return undefined;

  const pool = questPool(state.profile.path);
  const todaysDaily = pickToday(pool, today);
  const todaysBonusIds = new Set(
    (state.quests.bonusCompletions ?? [])
      .filter((c) => c.date === today)
      .map((c) => c.questId),
  );
  const excluded = new Set<string>();
  if (todaysDaily) excluded.add(todaysDaily.id);
  for (const id of todaysBonusIds) excluded.add(id);

  const completed = new Set(state.quests.completedQuestIds ?? []);
  // Fresh library first: quests never completed (and not today's daily).
  const freshPool = pool.filter((q) => !excluded.has(q.id) && !completed.has(q.id));
  // Evergreen fallback: everything except today's daily (repeats are fine).
  const repeatPool = pool.filter((q) => !excluded.has(q.id));
  const candidates = freshPool.length > 0 ? freshPool : repeatPool;

  // An empty pool (a program with no content) yields no bonus quest — the card
  // simply does not render. Never a quest from another program as a stopgap.
  if (candidates.length === 0) return todaysDaily;
  return candidates[dayNumber(today) % candidates.length] as Quest;
}