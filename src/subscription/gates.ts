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

import { pickToday, quests } from '../content';
import { dayNumber } from '../content/rotation';
import type { Quest, QuestTheme } from '../models/types';
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
 * The themes a user may SEE right now. Paid: all 5, in canonical order.
 * Free: only today's quest theme — the daily quest itself is never removed,
 * only the full library is (S1: "free users see only today's quest").
 */
export function visibleThemes(
  state: Pick<AppState, 'entitlements'>,
  today: string,
): QuestTheme[] {
  if (state.entitlements.tier === 'paid') return [...THEME_ORDER];
  const todays = pickToday(quests, today);
  return todays ? [todays.theme] : [];
}

/**
 * Real quest counts per theme from the bundled library — the honest "peek":
 * paid users see what the library actually holds (nothing fabricated). The
 * MVP bundle ships 30 quests (6 per theme); the content pass ships the full
 * 60. When that lands, only the content changes, never this derivation.
 */
export function themeQuestCounts(): Record<QuestTheme, number> {
  const counts: Record<QuestTheme, number> = {
    gratitude: 0,
    stillness: 0,
    purpose: 0,
    forgiveness: 0,
    patience: 0,
  };
  for (const q of quests) counts[q.theme] += 1;
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
 * Pick the bonus quest for today, deterministically (same date → same pick).
 *
 * Rules:
 *  - never today's daily quest (the one-per-day loop must not double-credit);
 *  - prefer quests never completed at all (fresh library first);
 *  - when the library is exhausted, fall back to repeats from the rest of the
 *    library — the spec's "evergreen repeats" ("a familiar friend"); the UI
 *    already frames repeated quests gently, so no extra copy is fabricated.
 *  - returns undefined when the paid bonus slot is unavailable (free tier or
 *    already used today) — the caller must not render anything.
 */
export function pickBonusQuest(
  state: Pick<AppState, 'entitlements' | 'quests'>,
  today: string,
): Quest | undefined {
  if (!bonusQuestAvailable(state, today)) return undefined;

  const todaysDaily = pickToday(quests, today);
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
  const freshPool = quests.filter((q) => !excluded.has(q.id) && !completed.has(q.id));
  // Evergreen fallback: everything except today's daily (repeats are fine).
  const repeatPool = quests.filter((q) => !excluded.has(q.id));
  const pool = freshPool.length > 0 ? freshPool : repeatPool;

  if (pool.length === 0) return todaysDaily ?? quests[0];
  return pool[dayNumber(today) % pool.length] as Quest;
}