/**
 * Calm Quest — STUB AnalyticsProvider (Phase 5, feature spec §3 S5).
 *
 * ⚠️ NOT A REAL ANALYTICS SEND. ⚠️
 * The stub proves the event layer end to end while no provider is wired:
 *   - tracks every event exactly as the real one will (same typed call site),
 *   - logs to the console in dev (`__DEV__`, the standard RN global), so a
 *     developer can see the app's real event stream,
 *   - is a complete no-op outside dev — it never touches the network, never
 *     writes storage, never fabricates a send, never claims success.
 *
 * The real implementation (Phase 6+): PostHog / Firebase Analytics behind the
 * same AnalyticsProvider interface, swapped in via ./index.ts. It may
 * enqueue/queue internally, but `track` stays synchronous and never throws.
 */

import type { AnalyticsEvent, AnalyticsParams, AnalyticsProvider } from './provider';

/** Console logger — reads the RN dev global if present, otherwise true. */
function isDev(): boolean {
  try {
    return typeof __DEV__ === 'boolean' ? __DEV__ : true;
  } catch {
    return true;
  }
}

export class StubAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'console';

  track(event: AnalyticsEvent, params?: AnalyticsParams): void {
    // Honest stub: dev-only console logging. Nothing is sent anywhere —
    // no network call, no storage write, no fabricated delivery. The real
    // provider replaces this body, not the interface.
    if (!isDev()) return;
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug(`[analytics] ${event}`, params ?? {});
    }
  }
}

/** The app-wide instance. Swap to the real provider in ./index.ts when ready. */
export const analytics: AnalyticsProvider = new StubAnalyticsProvider();