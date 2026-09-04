/**
 * Calm Quest — typed navigation param list (Phase 2b).
 *
 * Native-stack root: Onboarding → Home → Quest (daily quest completion) and
 * Home → Glimpse (Gratitude Glimpse mini-game; full screen is Phase 2c — this
 * ships the entry point + a clean stub).
 */

export type AppRouteParamList = {
  Onboarding: undefined;
  Home: undefined;
  /** The daily quest: pass the quest id surfaced by Home's rotation. */
  Quest: { questId: string };
  /** Gratitude Glimpse: pass the prompt id chosen for today. */
  Glimpse: { promptId: string };
  /** Settings (Phase 3, F9): gentle-reminder toggle + time picker. */
  Settings: undefined;
  /**
   * PrivacyTerms (Phase 5, F9): in-app Privacy / Terms of Use, mirroring the
   * site pages. `doc` selects which document to show.
   */
  PrivacyTerms: { doc: 'privacy' | 'terms' };
  /**
   * Paywall (Phase 4a, Flow E): `auto` = the one-time post-3rd-loop modal;
   * `growth` = the small header re-surface after the 7-day quiet window.
   */
  Paywall: { source: 'auto' | 'growth' } | undefined;
};