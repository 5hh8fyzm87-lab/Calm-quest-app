/**
 * Calm Quest — AnalyticsService seam (Phase 5, feature spec §3 S5).
 *
 * THE SEAM: screens talk ONLY to this interface (via the `analytics`
 * instance exported from ./index.ts). When a real analytics provider lands
 * (PostHog / Firebase Analytics, Phase 6+), the real implementation drops in
 * behind the same interface — swapping stub → real is a one-file change in
 * index.ts, exactly the SubscriptionService/AuthService pattern.
 *
 * Honesty rules (unchanged by any provider):
 *  - The STUB never sends anything anywhere: it logs to the console in dev
 *    and is a no-op otherwise. No network call, no server, no fabricated
 *    events, no "sent" claims.
 *  - A real provider must send only what actually happened — an event is
 *    tracked at exactly the moment the action completed (quest completion,
 *    saved affirmation, paywall shown, trial granted, etc.).
 */

/**
 * The typed event set (spec §3 S5, verbatim) plus events derived internally:
 *  - quest_completed        — a daily (or bonus) quest was completed
 *  - glimpse_completed      — a Gratitude Glimpse was saved
 *  - affirmation_saved      — the Affirmation of the Day was saved (+5 XP)
 *  - streak_greater_than_0  — the user holds an active streak (day 1+)
 *  - grace_used             — a missed day put the streak into grace
 *  - paywall_seen           — the paywall was shown (auto or growth surface)
 *  - trial_started          — a verified trial/grant flow began
 *  - trial_converted        — a verified entitlement landed (paid tier)
 *  - unsubscribed           — a subscription ended (wired when the real
 *                             manage/subscription lifecycle lands — there is
 *                             no unsubscribe path in the MVP UI today)
 *  - level_up               — internally derivable at award time (a level
 *                             boundary crossed on a real completion)
 *  - restore_requested      — the user tapped Restore purchases (instrumented
 *                             no-op call; the seam stays honest either way)
 */
export type AnalyticsEvent =
  | 'quest_completed'
  | 'glimpse_completed'
  | 'affirmation_saved'
  | 'streak_greater_than_0'
  | 'grace_used'
  | 'paywall_seen'
  | 'trial_started'
  | 'trial_converted'
  | 'unsubscribed'
  | 'level_up'
  | 'restore_requested';

/**
 * Params a real provider may want (primitive values only — no nested objects,
 * no PII by convention: never send names, emails, or journal text).
 */
export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

/** The one abstraction every analytics consumer depends on. */
export interface AnalyticsProvider {
  /** Human-readable provider id ('console' stub, or 'posthog'/'firebase' later). */
  readonly name: string;
  /**
   * Record an event. MUST never throw (analytics must never break the app),
   * must be synchronous (logging/queueing style — a real provider can enqueue
   * and flush async internally).
   */
  track(event: AnalyticsEvent, params?: AnalyticsParams): void;
}