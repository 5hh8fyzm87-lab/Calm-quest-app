/**
 * Calm Quest — store payload mapping (Phase 7, feature spec §3 F8).
 *
 * PURE functions only: no SDK import, no I/O, no Date.now() — callers pass the
 * clock. This is the layer the proofs hammer, because the App Store itself
 * cannot be reached from CI.
 *
 * Rules it enforces (the F8 guard, restated):
 *  - Only the two configured SKUs may ever produce tier 'paid'.
 *  - A 'pending' transaction (Ask to Buy / deferred) grants NOTHING.
 *  - An expired transaction grants NOTHING.
 *  - Display prices come from the store when it gives them; otherwise the
 *    configured price is shown unchanged (never an invented/rounded number).
 */

import type { Entitlements } from '../models/types';
import type { UnavailableReason, PlanId, PlanInfo } from './service';
import { SUBSCRIPTION_PLANS } from './service';
import type { StoreError, StoreProduct, StorePurchase } from './storeContracts';

/**
 * The App Store Connect product ids the owner created (locked Sep 2026):
 * `calmquest_monthly` ($9.99/mo) and `calmquest_yearly` ($59.99/yr), both with
 * the 7-day introductory free trial configured in App Store Connect — the
 * trial is a STORE setting, never something the client can grant.
 */
export const STORE_PRODUCT_IDS: Readonly<Record<PlanId, string>> = {
  monthly: 'calmquest_monthly',
  yearly: 'calmquest_yearly',
};

/** Reverse lookup: store product id → plan. Only our two SKUs appear. */
export const PLAN_BY_STORE_PRODUCT_ID: Readonly<Record<string, PlanId>> = {
  [STORE_PRODUCT_IDS.monthly]: 'monthly',
  [STORE_PRODUCT_IDS.yearly]: 'yearly',
};

/** The SKUs to query from the store, in plan order. */
export const STORE_SKUS: readonly string[] = SUBSCRIPTION_PLANS.map((p) => p.storeProductId);

/** Is this one of Calm Quest's two subscription SKUs? */
export function isCalmQuestProductId(productId: string | null | undefined): boolean {
  return typeof productId === 'string' && productId in PLAN_BY_STORE_PRODUCT_ID;
}

/** The plan a store product id belongs to, if any. */
export function planForStoreProductId(productId: string): PlanId | undefined {
  return PLAN_BY_STORE_PRODUCT_ID[productId];
}

/**
 * Plan rows for the paywall, with REAL store prices when the store answered.
 *
 * `products` may be empty (store unreachable) — then the configured prices are
 * returned unchanged, which is what the app displayed before Phase 7. A product
 * the store did not return keeps its configured price for the same reason: the
 * row stays honest rather than blank.
 */
export function planInfoFromStoreProducts(
  products: readonly StoreProduct[],
): readonly PlanInfo[] {
  const byId = new Map<string, StoreProduct>();
  for (const p of products) if (p && typeof p.id === 'string') byId.set(p.id, p);

  return SUBSCRIPTION_PLANS.map((plan) => {
    const store = byId.get(plan.storeProductId);
    const localized = store?.displayPrice;
    const price =
      typeof localized === 'string' && localized.trim().length > 0
        ? localized.trim()
        : plan.price;
    return price === plan.price ? plan : { ...plan, price };
  });
}

/** True when the store says this transaction is not yet confirmed. */
export function isPendingPurchase(purchase: Pick<StorePurchase, 'purchaseState'>): boolean {
  const state = purchase.purchaseState?.toLowerCase();
  return state === 'pending' || state === 'deferred' || state === 'initiated';
}

/**
 * True only for a transaction the store CONFIRMED.
 *
 * A missing state counts as confirmed (some store surfaces do not report one,
 * and the transaction arrived on a confirmed-purchase channel), but 'unknown' —
 * the SDK's bucket for states it could not classify — counts as NOT confirmed:
 * an unclassified transaction must never unlock paid features.
 */
export function isConfirmedPurchase(purchase: Pick<StorePurchase, 'purchaseState'>): boolean {
  const state = purchase.purchaseState?.toLowerCase();
  if (state == null || state === '') return true;
  return state === 'purchased' || state === 'restored' || state === 'entitled';
}

/** True when a store-reported expiry has already passed. */
export function isExpiredPurchase(
  purchase: Pick<StorePurchase, 'expirationDateIOS'>,
  nowMs: number,
): boolean {
  const expiry = purchase.expirationDateIOS;
  return typeof expiry === 'number' && expiry > 0 && expiry <= nowMs;
}

/**
 * The VERIFIED entitlement a single confirmed transaction grants — or null.
 *
 * Null when: the transaction is not one of our SKUs, the store has not
 * confirmed it (pending/deferred/unknown), or its store-reported expiry has
 * passed. This is the only place a purchase can become tier 'paid' (F8 guard:
 * no client-only unlock).
 */
export function entitlementFromPurchase(
  purchase: StorePurchase,
  nowMs: number,
): Entitlements | null {
  if (!isCalmQuestProductId(purchase.productId)) return null;
  if (!isConfirmedPurchase(purchase)) return null;
  if (isExpiredPurchase(purchase, nowMs)) return null;

  const expiry =
    typeof purchase.expirationDateIOS === 'number' && purchase.expirationDateIOS > 0
      ? new Date(purchase.expirationDateIOS).toISOString()
      : undefined;
  return expiry ? { tier: 'paid', expiry } : { tier: 'paid' };
}

/**
 * The entitlement implied by a set of ACTIVE store purchases (restore, or the
 * launch-time re-check): 'paid' with the LATEST expiry when one of our SKUs is
 * active, else 'free'.
 *
 * Note for callers: 'free' here means "the store reports no active Calm Quest
 * subscription". Applying it is a deliberate, honest downgrade decision — the
 * service never applies it silently, and never downgrades when the store call
 * itself FAILED (a failed query proves nothing).
 */
export function entitlementFromPurchases(
  purchases: readonly StorePurchase[],
  nowMs: number,
): Entitlements {
  let best: Entitlements | null = null;
  for (const p of purchases) {
    const ent = entitlementFromPurchase(p, nowMs);
    if (!ent) continue;
    if (!best) best = ent;
    else if (ent.expiry && (!best.expiry || ent.expiry > best.expiry)) best = ent;
  }
  return best ?? { tier: 'free' };
}

/**
 * A stored entitlement whose expiry has passed is downgraded to free. Returns
 * null when nothing changes (no expiry recorded, or still in the future).
 *
 * Local-only and honest: the expiry came from the store's own transaction. No
 * server is consulted (server-side receipt validation arrives with the Supabase
 * backend — see docs/IAP.md); this simply stops an ended period from granting
 * paid features forever if the user never presses Restore.
 */
export function reconciledEntitlement(
  current: Entitlements,
  nowMs: number,
): Entitlements | null {
  if (current.tier !== 'paid') return null;
  if (!current.expiry) return null; // unknown expiry → keep (never punish)
  const expiryMs = Date.parse(current.expiry);
  if (Number.isNaN(expiryMs)) return null;
  if (expiryMs > nowMs) return null;
  return { tier: 'free' };
}

/**
 * Map an SDK/store error onto the seam's honest reason vocabulary.
 *
 * User cancellation is not a failure — it is the user's choice, and the UI
 * treats it as "no charge, nothing changed". A deferred/pending signal is not
 * a failure either: the store simply hasn't confirmed yet.
 */
export function reasonFromStoreError(error: unknown): UnavailableReason {
  const e = (error ?? {}) as StoreError;
  const code = typeof e.code === 'string' ? e.code.toLowerCase() : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  const haystack = `${code} ${message}`;

  if (
    haystack.includes('user-cancelled') ||
    haystack.includes('user cancelled') ||
    haystack.includes('user canceled') ||
    haystack.includes('usercancelled') ||
    haystack.includes('user_cancel') ||
    haystack.includes('e_user_cancelled') ||
    haystack.includes('cancelled by user') ||
    haystack.includes('payment-cancelled')
  ) {
    return 'user_cancelled';
  }
  if (haystack.includes('pending') || haystack.includes('deferred')) return 'pending';
  if (haystack.includes('not-installed') || haystack.includes('nitro')) {
    return 'store_unavailable';
  }
  return 'failed';
}

/** Convenience: is this entitlement the paid tier? */
export function isPaid(entitlement: Pick<Entitlements, 'tier'> | null | undefined): boolean {
  return entitlement?.tier === 'paid';
}
