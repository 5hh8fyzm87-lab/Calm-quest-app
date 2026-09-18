/**
 * Calm Quest — the "kept" derivation layer (build 13, content-expansion
 * proposal §2 items A / D / H).
 *
 * PURE functions only: persisted state in, honest listings out. No I/O, no
 * `Date.now()`, and — the load-bearing rule of this whole layer — **no XP, no
 * streak and no daily-loop write of any kind**. Browsing what you already kept
 * is not practice: every value here is a READ of a ledger the app already
 * stores (`state.glimpses`, `state.savedAffirmationIds`,
 * `state.quests.completions`).
 *
 * Honesty rules kept here rather than in the screens:
 *  - Newest first, and same-day entries keep their true writing order (a Calm
 *    Quest+ user can write several glimpses in one day) — nothing is re-sorted
 *    into a story the ledger does not tell.
 *  - The free archive shows the LAST 7 and says how many more there are. It
 *    never fakes a total and never dims or fabricates the hidden rows.
 *  - A saved affirmation carries no date, because the ledger genuinely stores
 *    none — so nothing here invents one.
 */

import { ALL_AFFIRMATIONS, prompts, questById, THEME_LABELS } from '../content';
import type { Affirmation, GlimpseEntry, QuestTheme } from '../models/types';
import type { AppState } from '../storage/store';
import { THEME_ORDER } from '../subscription/gates';

/**
 * How many kept glimpses a FREE user sees in the archive — the owner's
 * Sep 2026 decision (proposal §6, option 1: free = last 7, so the approved
 * paywall bullet 3 "plus your whole archive" stays verbatim and becomes true).
 */
export const FREE_ARCHIVE_LIMIT = 7;

/** How many kept things Home's "Kept this week" strip shows (no scroll). */
export const KEPT_STRIP_LIMIT = 3;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "2026-09-17" → "September 2026". Pure string work — no locale, no clock. */
export function monthLabel(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1] ?? ''} ${y ?? ''}`.trim();
}

/** "2026-09-17" → "17 Sep" — the small-caps dateline on a kept row. */
export function dayLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d ?? 0} ${MONTHS_SHORT[(m ?? 1) - 1] ?? ''}`.trim();
}

// ---------------------------------------------------------------------------
// A — the kept-glimpse archive
// ---------------------------------------------------------------------------

/** The month a kept row belongs to, as a grouping key ("2026-09"). */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** One month of kept glimpses, newest month first. */
export interface MonthGroup {
  key: string;
  label: string;
  entries: GlimpseEntry[];
}

/**
 * Every kept glimpse, newest first. Same-day entries (Calm Quest+ can write
 * several) keep their true order — the later write reads first.
 */
export function glimpsesNewestFirst(state: Pick<AppState, 'glimpses'>): GlimpseEntry[] {
  return state.glimpses
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.date === b.entry.date ? b.index - a.index : a.entry.date < b.entry.date ? 1 : -1))
    .map((row) => row.entry);
}

/** Group kept rows by month, preserving newest-first order inside each month. */
export function groupByMonth(entries: readonly GlimpseEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const entry of entries) {
    const key = monthKey(entry.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: monthLabel(entry.date), entries: [entry] });
  }
  return groups;
}

/** What the archive can render right now, and what it honestly withholds. */
export interface ArchiveView {
  /** The rows this tier may read, newest first. */
  items: GlimpseEntry[];
  /** Month groups over `items` (never over the hidden tail). */
  groups: MonthGroup[];
  /** The real number of kept glimpses on this device. */
  total: number;
  /** How many of them the free archive holds back (0 for Calm Quest+). */
  hidden: number;
  /** True when a gate line belongs under the rows. */
  gated: boolean;
}

/**
 * The archive split (owner decision, Sep 2026): Calm Quest+ reads everything;
 * FREE reads the 7 most recent and is told the real number beyond them. The
 * `total` is always the honest ledger count — the visible `items` never
 * pretend to be the whole archive.
 */
export function archiveView(state: Pick<AppState, 'glimpses' | 'entitlements'>): ArchiveView {
  const all = glimpsesNewestFirst(state);
  const items = state.entitlements.tier === 'paid' ? all : all.slice(0, FREE_ARCHIVE_LIMIT);
  const hidden = all.length - items.length;
  return {
    items,
    groups: groupByMonth(items),
    total: all.length,
    hidden,
    gated: hidden > 0,
  };
}

/**
 * The prompt a kept glimpse answered, or null. Resolved from the bundled
 * prompt library; when a prompt id is missing from the bundle (or the entry
 * has none) the row renders the date and the entry only — the archive never
 * invents a prompt that was not asked.
 */
export function promptTextFor(entry: Pick<GlimpseEntry, 'promptId'>): string | null {
  if (!entry.promptId) return null;
  return prompts.find((p) => p.id === entry.promptId)?.prompt ?? null;
}

// ---------------------------------------------------------------------------
// D — saved affirmations (never gated: a user's own kept words)
// ---------------------------------------------------------------------------

/**
 * Every saved affirmation, in the order the user saved them (oldest first).
 *
 * Build 14 (two-paths §3): resolved against `ALL_AFFIRMATIONS` — the id-lookup
 * index over every program — never the pool of the program the profile happens
 * to hold today. An affirmation saved while a different program was held is the
 * user's own kept words and must still resolve after a switch.
 */
export function savedAffirmations(state: Pick<AppState, 'savedAffirmationIds'>): Affirmation[] {
  const byId = new Map(ALL_AFFIRMATIONS.map((a) => [a.id, a]));
  const out: Affirmation[] = [];
  for (const id of state.savedAffirmationIds) {
    const found = byId.get(id);
    if (found) out.push(found);
  }
  return out;
}

/** One theme's saved affirmations, with its real content label. */
export interface ThemeGroup {
  theme: QuestTheme;
  label: string;
  items: Affirmation[];
}

/**
 * Saved affirmations grouped by theme, in the app's canonical theme order.
 * Only themes the user actually has something in appear — no empty headings.
 */
export function savedByTheme(state: Pick<AppState, 'savedAffirmationIds'>): ThemeGroup[] {
  const saved = savedAffirmations(state);
  const groups: ThemeGroup[] = [];
  for (const theme of THEME_ORDER) {
    const items = saved.filter((a) => a.theme === theme);
    if (items.length > 0) groups.push({ theme, label: THEME_LABELS[theme], items });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// H — "Kept this week": the discovery door on Home
// ---------------------------------------------------------------------------

/** Real counts over the three keeping ledgers. Nothing summed, nothing faked. */
export interface KeptCounts {
  glimpses: number;
  affirmations: number;
  quests: number;
  total: number;
}

export function keptCounts(
  state: Pick<AppState, 'glimpses' | 'savedAffirmationIds' | 'quests'>,
): KeptCounts {
  const glimpses = state.glimpses.length;
  const affirmations = savedAffirmations(state).length;
  const quests = state.quests.completions.length;
  return { glimpses, affirmations, quests, total: glimpses + affirmations + quests };
}

/**
 * One row of the Home strip. `date` is null only where the ledger truly has no
 * date — saved affirmations are stored as ids, so the strip shows the words
 * instead of a date it would have to invent.
 */
export interface KeptHighlight {
  kind: 'glimpse' | 'affirmation' | 'quest';
  id: string;
  date: string | null;
  /** The real content: their glimpse line, the affirmation, the quest title. */
  text: string;
}

/**
 * Up to one highlight per kind — newest glimpse, most recently saved
 * affirmation, most recent completed quest — in the order the brief names them
 * (a glimpse, an affirmation, a quest). A kind with nothing kept contributes
 * nothing, so the strip is shorter instead of padded.
 */
export function keptHighlights(
  state: Pick<AppState, 'glimpses' | 'savedAffirmationIds' | 'quests'>,
  limit: number = KEPT_STRIP_LIMIT,
): KeptHighlight[] {
  const out: KeptHighlight[] = [];

  const newestGlimpse = glimpsesNewestFirst(state)[0];
  if (newestGlimpse) {
    out.push({
      kind: 'glimpse',
      id: newestGlimpse.id,
      date: newestGlimpse.date,
      text: newestGlimpse.text,
    });
  }

  const saved = savedAffirmations(state);
  const newestAffirmation = saved[saved.length - 1];
  if (newestAffirmation) {
    out.push({
      kind: 'affirmation',
      id: newestAffirmation.id,
      date: null,
      text: newestAffirmation.text,
    });
  }

  const completions = state.quests.completions;
  const lastCompletion = completions[completions.length - 1];
  if (lastCompletion) {
    // Build 14 (two-paths §3): the title resolves through ALL_QUESTS (via
    // `questById`), so a quest completed under another program is still named
    // correctly here. Still no fallback name: unresolvable → row not rendered.
    const title = questById(lastCompletion.questId)?.title;
    // No title resolvable → the row is not rendered rather than named wrongly.
    if (title) out.push({ kind: 'quest', id: lastCompletion.questId, date: lastCompletion.date, text: title });
  }

  return out.slice(0, Math.max(0, limit));
}
