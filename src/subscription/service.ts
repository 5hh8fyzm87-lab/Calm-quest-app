/**
 * Calm Quest — SubscriptionService seam (Phase 4a, feature spec §3 F8,
 * §2 Flow E, build-order Phase 4).
 *
 * THE SEAM: the paywall UI and the local entitlement flow talk only to this
 * interface. When the owner's Apple Developer account exists (Phase 4/6), the
 * real implementation — react-native-iap or RevenueCat plus server-side
 * receipt validation per F8's guard ("paid features must never be reachable
 * without a verified entitlement") — drops in behind the same interface.
 * Swapping stub → real is a one-file change in index.ts (and App.tsx wiring,
 * which passes the service to screens).
 *
 * THIS STUB IS NOT A REAL STORE. It talks to no billing SDK, no server, and
 * holds no receipts. It reports `available: false` forever, so the UI can
 * present its honest "Store setup coming soon" state. It never grants an
 * entitlement: no code path through this module can produce tier 'paid'.
 */

import type { Tier } from '../models/types';

/** The two subscription products, per spec §5 (store ids land with the real store). */
export type PlanId = 'monthly' | 'yearly';

/**
 * What the UI needs to render a plan row. Prices are presentation constants
 * here; the real service will surface store-provided localized pricing.
 */
export interface PlanInfo {
  id: PlanId;
  /** Honest display price, e.g. "$9.99". */
  price: string;
  /** Optional per-month framing, e.g. "≈ $5/mo" for yearly. */
  perMonth?: string;
  /** Optional badge, e.g. "Best value" — descriptive, never scarcity. */
  badge?: string;
  /** Store product id the real service will purchase against (F8). */
  storeProductId: string;
}

/** Plan presentation per spec §2 Flow E (Monthly $9.99 / Yearly $59.99 ≈ $5/mo). */
export const SUBSCRIPTION_PLANS: readonly PlanInfo[] = [
  { id: 'monthly', price: '$9.99', storeProductId: 'calmquest_monthly' },
  {
    id: 'yearly',
    price: '$59.99',
    perMonth: '≈ $5/mo',
    badge: 'Best value',
    storeProductId: 'calmquest_yearly',
  },
];

/** The 7-day trial window the real store grants on first subscribe (spec §5). */
export const TRIAL_DAYS = 7;

/** Why a purchase/restore attempt could not complete. */
export type UnavailableReason =
  | 'stub' // the seam is stubbed — store not wired yet (today's only reason)
  | 'store_unavailable' // real later: billing SDK unreachable
  | 'user_cancelled'; // real later: the user backed out of the sheet

/** What any availability/purchase/restore call returns. */
export interface ServiceResult<T> {
  ok: boolean;
  /** Populated only on success. */
  value?: T;
  /** Populated only on failure — the UI branches its honest copy on this. */
  reason?: UnavailableReason;
}

/**
 * The one abstraction the paywall + entitlement flow depend on. Keep methods
 * async and result-shaped so the real implementation (store sheet, receipt
 * round-trip) can be slower and still fit.
 */
export interface SubscriptionService {
  /** Is a real store wired up? Always false in the stub. */
  isAvailable(): Promise<boolean>;

  /** Plan rows to render (store-localized when real). */
  getPlans(): Promise<ServiceResult<readonly PlanInfo[]>>;

  /**
   * Begin a purchase (the trial is store-configured on the real products).
   * Success returns a VERIFIED entitlement snapshot — only then may tier
   * become 'paid'. The stub never succeeds (reason 'stub').
   */
  purchase(plan: PlanId): Promise<ServiceResult<{ tier: Tier; expiry?: string }>>;

  /** Restore prior purchases. Same honesty rules as purchase. */
  restore(): Promise<ServiceResult<{ tier: Tier; expiry?: string }>>;
}

/** Type guard for a ServiceResult failure with the stub reason. */
export function isStubUnavailable<T>(r: ServiceResult<T>): boolean {
  return !r.ok && r.reason === 'stub';
}
