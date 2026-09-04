/**
 * Calm Quest — analytics barrel (Phase 5, feature spec §3 S5).
 *
 * THE ONE FILE TO CHANGE when a real analytics provider lands: export the
 * real provider (PostHog / Firebase Analytics) instead of the stub. Every
 * consumer imports from here (or from `analytics`' instance), so nothing else
 * moves — the same one-file-swap pattern as the subscription/auth seams.
 */

export type { AnalyticsProvider, AnalyticsEvent, AnalyticsParams } from './provider';
export { StubAnalyticsProvider, analytics } from './stub';