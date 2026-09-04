/**
 * Calm Quest — STUB SubscriptionService (Phase 4a).
 *
 * ⚠️ NOT A REAL STORE. ⚠️
 * This implementation exists so the paywall UI, entitlement flow, and proofs
 * are fully buildable and testable before the owner's Apple Developer account
 * exists (build-order Phase 4 owner dependency). It:
 *   - reports isAvailable() → false (the UI shows its honest "coming soon" state),
 *   - NEVER completes a purchase or restore — every attempt fails with
 *     reason 'stub',
 *   - therefore can never grant tier 'paid'. No fake unlocks, no fabricated
 *     store results.
 *
 * There is deliberately NO "simulate a purchase" path here: a 'paid' tier may
 * only come from a verified store entitlement (F8 guard). Tests that need a
 * paid tier construct the AppState fixture directly and label it as simulated
 * (see scripts/proof-phase4a.js) — they bypass this service by design.
 *
 * The real implementation (Phase 4/6): react-native-iap or RevenueCat for the
 * sheet + products, then server-side receipt validation (F8 guard) before any
 * entitlement is returned. It must satisfy the same SubscriptionService
 * interface — swap it in via ./index.ts.
 */

import type { Tier } from '../models/types';
import type { PlanId, PlanInfo, ServiceResult, SubscriptionService } from './service';
import { SUBSCRIPTION_PLANS } from './service';

export class StubSubscriptionService implements SubscriptionService {
  async isAvailable(): Promise<boolean> {
    // Honest: no store is wired. The real service returns true once the
    // billing SDK + server-side validation are live.
    return false;
  }

  async getPlans(): Promise<ServiceResult<readonly PlanInfo[]>> {
    // Plans are static presentation data; showing them is honest even in the
    // stub (the UI labels the buy CTA as "store setup coming soon").
    return { ok: true, value: SUBSCRIPTION_PLANS };
  }

  async purchase(_plan: PlanId): Promise<ServiceResult<{ tier: Tier; expiry?: string }>> {
    // The stub never sells anything. A real, verified entitlement is the only
    // thing that may flip tier to 'paid' (F8 guard).
    return { ok: false, reason: 'stub' };
  }

  async restore(): Promise<ServiceResult<{ tier: Tier; expiry?: string }>> {
    // Nothing to restore from — no store. Same honest failure.
    return { ok: false, reason: 'stub' };
  }
}

/** The app-wide instance. Swap to the real service in ./index.ts when ready. */
export const subscriptionService: SubscriptionService = new StubSubscriptionService();
