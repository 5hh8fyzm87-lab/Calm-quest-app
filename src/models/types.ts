/**
 * Calm Quest — core domain models (MVP, feature spec §3).
 * Pure types only: no imports, no I/O, safe to share with a future sync layer.
 */

// ---------------------------------------------------------------------------
// Quests (§3 F1/F4)
// ---------------------------------------------------------------------------

/** The four daily-quest types. All share one completion flag per day. */
export type QuestType = 'read_reflect' | 'act' | 'pause' | 'write';

/** One of the 5 MVP themes (§4). */
export type QuestTheme =
  | 'gratitude'
  | 'stillness'
  | 'purpose'
  | 'forgiveness'
  | 'patience';

/** Gentle 3-choice check-in used by Read & Reflect quests. */
export interface CheckInOption {
  label: string;
}

/**
 * A daily quest. Exactly one is surfaced per day; content is static JSON.
 * Only the fields relevant to a given `type` need to be populated.
 */
export interface Quest {
  id: string;
  /** Rotation theme (5 themes × 12 quests each in the MVP library). */
  theme: QuestTheme;
  type: QuestType;
  title: string;
  /** Read & Reflect: 1–2 sentence reflection shown with the verse. */
  reflection?: string;
  /** Read & Reflect: verse this quest is anchored to. */
  verseId?: string;
  /** Read & Reflect: gentle 3-choice check-in (e.g. Peace / Courage / Rest). */
  checkInOptions?: CheckInOption[];
  /** Act: the small real-world action, completed by self-report tap. */
  actionPrompt?: string;
  /** Pause: silent stillness duration in seconds (60 in MVP). */
  durationSeconds?: number;
  /**
   * Pause: a one-line gentle prompt shown during the timer (Phase 6 content
   * pack — every pause quest carries one; optional for backward compat with
   * the Phase 1 sample bundle, which had none).
   */
  pausePrompt?: string;
  /** Write: one-line journal prompt. */
  journalPrompt?: string;
}

// ---------------------------------------------------------------------------
// Content: affirmations, gratitude prompts, verses (§3 F2/F3, §4)
// ---------------------------------------------------------------------------

/** "Affirmation of the Day" — ≤1 sentence, theme-tagged, deterministic rotation. */
export interface Affirmation {
  id: string;
  text: string;
  theme: QuestTheme;
}

/** Gratitude Glimpse prompt (30 in MVP, "one good thing — however small" family). */
export interface GratitudePrompt {
  id: string;
  prompt: string;
}

/**
 * Scripture verse. MVP translation is the World English Bible (public domain);
 * attribution fields are kept so the translation can be swapped (e.g. KJV)
 * without touching call sites. Never render without attribution.
 */
export interface Verse {
  id: string;
  /** e.g. "Psalm 46:10" */
  reference: string;
  /** Verse text from the bundled translation. */
  text: string;
  /** Abbreviated translation, e.g. "WEB". */
  translation: string;
  /** Attribution line, e.g. "World English Bible (WEB), public domain". */
  attribution: string;
}

// ---------------------------------------------------------------------------
// User profile (§3 F6 — onboarding path selection)
// ---------------------------------------------------------------------------

/** MVP paths. Christian is the lead niche; others are "coming soon" in onboarding. */
export type PathId = 'christian' | 'entrepreneur' | 'anxiety_stress';

export type WeekCheckIn = 'steady' | 'unsteady' | 'somewhere_between';
export type TimeAvailable = 'five_min' | 'ten_min' | 'more';

/** Anonymous-first local profile (§3 F10 — no signup wall before the paywall). */
export interface UserProfile {
  id: string;
  path: PathId;
  /** True once onboarding completes (Flow A step 6) — routes to Home on launch. */
  onboarded: boolean;
  /** Optional display name from onboarding ("for your quests"). */
  displayName: string | null;
  weekCheckIn: WeekCheckIn | null;
  timeAvailable: TimeAvailable | null;
  /** One gentle daily reminder, default ON with a user-picked time (§3 F7). */
  reminderEnabled: boolean;
  /** Local "HH:mm" reminder time. */
  reminderTime: string | null;
  /**
   * Sound on/off preference (§3 F9; Phase 5). Default ON. MVP note: this is a
   * persisted INTENT — the reminder is deliberately muted (no bundled audio
   * asset yet) and the Pause-quest chime is a Phase 6 sound-design item, so
   * today the pref is stored and truthful, and it wires to the reminder's
   * sound once an audio asset exists.
   */
  soundEnabled: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Progress: XP & levels (§3 F4)
// ---------------------------------------------------------------------------

/**
 * Growth progress, derived deterministically from `totalXp` in pure math
 * (100 XP/level — see src/progress/progress.ts). Both fields are kept so
 * future sync mirrors totals without re-deriving on every row.
 */
export interface ProgressState {
  /** Lifetime XP — the only value that grows (rewards never decay). */
  totalXp: number;
  /** Snapshot of the level achieved at the last award (for re-render only). */
  level: number;
}

/** A daily quest completion record (F1: one completion flag per local day). */
export interface QuestCompletion {
  /** Local date "YYYY-MM-DD" the quest was completed. */
  date: string;
  /** The quest that was completed that day. */
  questId: string;
}

/**
 * A bonus (2nd daily) quest completion record (§5 paid feature — Phase 4b).
 *
 * Deliberately SEPARATE from QuestCompletion: the one-per-day loop flag
 * (`lastQuestCompletionDate` + `completions`) is the full daily-loop ledger
 * that drives streaks and paywall placement. A bonus quest is an XP reward
 * ONLY — it must never credit the streak, advance the daily loop, or move
 * the paywall trigger. Keeping a dedicated ledger with its own date makes
 * that invariant structural: bonus completions can never be counted as a
 * daily loop because they never enter the daily-loop collections.
 */
export interface QuestBonusCompletion {
  /** Local date "YYYY-MM-DD" the bonus quest was completed. */
  date: string;
  /** The bonus quest that was completed that day. */
  questId: string;
}

// ---------------------------------------------------------------------------
// Streak (§2 Flow C, §3 F5 — grace-centered, never breaks)
// ---------------------------------------------------------------------------

/**
 * Streak state, derived deterministically from these three fields + today's
 * local date — no cron jobs. A missed day freezes the streak; it never
 * decrements it. See src/streaks/streak.ts for the exact rules.
 */
export interface StreakState {
  /** Current streak in days. Frozen during grace; only resets after grace exhausts. */
  streakDays: number;
  /** Consecutive missed days inside the current grace window (0–3). */
  graceDaysMissed: 0 | 1 | 2 | 3;
  /** Local date "YYYY-MM-DD" of the last completed quest, if any. */
  lastQuestDate: string | null;
}

// ---------------------------------------------------------------------------
// Gratitude Glimpse (§3 F3)
// ---------------------------------------------------------------------------

/** One saved glimpse entry ("My Glimpses" archive, local-first). */
export interface GlimpseEntry {
  id: string;
  /** Local date "YYYY-MM-DD" the glimpse was written. */
  date: string;
  /** Free text; completion required ≥1 character. */
  text: string;
  promptId: string | null;
}

// ---------------------------------------------------------------------------
// Entitlements (§3 F8, §5 — free vs Calm Quest+)
// ---------------------------------------------------------------------------

export type Tier = 'free' | 'paid';

/**
 * Entitlement snapshot. Client shows this; the server remains the source of
 * truth via receipt validation (no client-only unlock, per F8 guard).
 */
export interface Entitlements {
  tier: Tier;
  /** ISO timestamp when the paid period/trial ends, if applicable. */
  expiry?: string;
}
