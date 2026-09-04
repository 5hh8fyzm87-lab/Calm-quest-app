/**
 * Calm Quest — local-first persistence (feature spec §3 tech notes, F5, F10).
 *
 * AsyncStorage-backed, single local state key. No Supabase, no sync: this is
 * the local source of truth for the MVP. Structure is intentionally shaped so
 * a sync layer can be added later — server stores UTC timestamps only, while
 * day boundaries remain the client's local day (spec: "streak day = user's
 * local day").
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Affirmation,
  Entitlements,
  GlimpseEntry,
  Quest,
  StreakState,
  UserProfile,
} from '../models/types';
import { applyCompletion, applyMissDay } from '../streaks/streak';

/** The single key under which the entire app state is persisted. */
export const STORAGE_KEY = 'calmquest/appState/v1';

/**
 * Persisted app state. All fields are always present after `loadState`
 * (defaults are applied on load), so consumers never handle undefined.
 */
export interface AppState {
  profile: UserProfile;
  streak: StreakState;
  /** Quest content library is static JSON; this tracks usage, not content. */
  quests: {
    /** Quest ids the user has completed (one completion flag per day). */
    completedQuestIds: string[];
    /** Local date "YYYY-MM-DD" of the most recent quest completion. */
    lastQuestCompletionDate: string | null;
  };
  /** Affirmations the user has "saved to their day" (+5 XP). */
  savedAffirmationIds: string[];
  glimpses: GlimpseEntry[];
  entitlements: Entitlements;
  /** App content version — lets a future sync layer detect stale local data. */
  contentVersion: number;
}

/** Neutral first-run profile. Path is set during onboarding (Flow A). */
export function defaultProfile(): UserProfile {
  return {
    id: 'local_user',
    path: 'christian',
    onboarded: false,
    displayName: null,
    weekCheckIn: null,
    timeAvailable: null,
    reminderEnabled: true,
    reminderTime: null,
    createdAt: new Date().toISOString(),
  };
}

/** Fresh-install defaults, matching the spec's anonymous-first start. */
export function defaultState(): AppState {
  return {
    profile: defaultProfile(),
    streak: { streakDays: 0, graceDaysMissed: 0, lastQuestDate: null },
    quests: { completedQuestIds: [], lastQuestCompletionDate: null },
    savedAffirmationIds: [],
    glimpses: [],
    entitlements: { tier: 'free' },
    contentVersion: 1,
  };
}

/**
 * Load persisted state, falling back to fresh-install defaults.
 * Tolerates corrupt/partial JSON (fresh defaults, never throws to caller).
 */
export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultState();

    // Defaults-first merge keeps older payloads forward-compatible as the
    // model evolves (a sync layer can reuse the same shape).
    const base = defaultState();
    const data = parsed as Partial<AppState>;
    return {
      profile: { ...base.profile, ...(data.profile ?? {}) },
      streak: { ...base.streak, ...(data.streak ?? {}) },
      quests: { ...base.quests, ...(data.quests ?? {}) },
      savedAffirmationIds: data.savedAffirmationIds ?? base.savedAffirmationIds,
      glimpses: data.glimpses ?? base.glimpses,
      entitlements: { ...base.entitlements, ...(data.entitlements ?? {}) },
      contentVersion: data.contentVersion ?? base.contentVersion,
    };
  } catch {
    // Corrupt payload: start clean rather than crash-looping on launch.
    return defaultState();
  }
}

/**
 * Persist the full state. Local-first: the caller owns the write cadence;
 * a sync layer can hook in here later (push diff, then resolve by timestamp).
 */
export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------------------------------------------------------------------------
// Streak helpers — thin wrappers so callers never hand-roll rule wiring.
// Pure rule logic lives in ../streaks/streak; these only bridge storage.
// ---------------------------------------------------------------------------

/**
 * Reconcile missed days between the last quest date and `today` (local dates),
 * then apply the completion. Returns the next streak state.
 *
 * Flow C is deterministic from state + today's date: each full local day past
 * `lastQuestDate` that carried no completion is a grace day (or, past 3, a
 * reset). Callers pass the user's local date; no cron jobs, per spec F5.
 */
export function reconcileStreakForCompletion(
  streak: StreakState,
  lastQuestDate: string | null,
  today: string,
): StreakState {
  let next = streak;

  if (lastQuestDate === null) {
    // First-ever completion: day 1, no grace involved.
    return applyCompletion({ streakDays: 0, graceDaysMissed: 0, lastQuestDate: null }, today);
  }

  let cursor = lastQuestDate;
  // Guard against pathological clocks: iterate at most 8 days back.
  let guard = 8;
  while (cursor < today && guard-- > 0) {
    next = applyMissDay(next, cursor);
    cursor = addDays(cursor, 1);
  }

  return applyCompletion(next, today);
}

// ---------------------------------------------------------------------------
// Profile helpers — thin wrappers so callers never hand-roll rule wiring.
// ---------------------------------------------------------------------------

/**
 * Mark onboarding complete and persist the chosen path. Used by Flow A's
 * final CTA: profile ends up `{ path, onboarded: true }` so the root
 * navigator routes straight to Home on the next launch.
 */
export async function setOnboarded(
  state: AppState,
  path: UserProfile['path'],
): Promise<AppState> {
  const next: AppState = {
    ...state,
    profile: {
      ...state.profile,
      path,
      onboarded: true,
    },
  };
  await saveState(next);
  return next;
}

// ---------------------------------------------------------------------------
// Date helpers (local "YYYY-MM-DD" arithmetic; pure)
// ---------------------------------------------------------------------------

/** Parse a "YYYY-MM-DD" local date string. Assumes well-formed input. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a Date as a local "YYYY-MM-DD" string. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pure "YYYY-MM-DD" + n days. */
export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}
