/**
 * Calm Quest — real SubscriptionService over react-native-iap (Phase 7, spec §3
 * F8, §5, Flow E). Replaces the Phase 4a/4b stub on native builds.
 *
 * What it does, and what it refuses to do:
 *  - fetches the two configured App Store products and reports their REAL
 *    localized prices to the paywall (`getPlans`);
 *  - dispatches a purchase for either plan and waits for the store's own
 *    confirmation event (`purchase`), then acknowledges the transaction;
 *  - restores prior purchases (`restore`) — "nothing found" is reported as
 *    'nothing_to_restore', never as a fake success and never as a downgrade;
 *  - reconciles what the store says is active (`syncEntitlement`);
 *  - returns tier 'paid' ONLY from a confirmed, unexpired transaction for one of
 *    our two SKUs (F8 guard). Cancelled, pending, deferred, expired and
 *    unknown-state transactions grant nothing;
 *  - NEVER talks to a server. Server-side receipt validation arrives with the
 *    Supabase backend — see docs/IAP.md; until then the store's own
 *    confirmation is the only evidence, exactly as the F8 guard requires of a
 *    client with no backend yet.
 *
 * Every SDK call is wrapped in the bridge seam (`./bridge`), which is `null` on
 * web/Node so this class never even loads in those targets, and every call is
 * bounded by a timeout so a wedged store surfaces as an honest result rather
 * than a spinner forever.
 */

import type { BridgeSubscription, IapBridge } from './bridge';
import { loadIapBridge } from './bridge';
import {
  STORE_PRODUCT_IDS,
  STORE_SKUS,
  entitlementFromPurchase,
  entitlementFromPurchases,
  isCalmQuestProductId,
  isPendingPurchase,
  planInfoFromStoreProducts,
  reasonFromStoreError,
} from './mapping';
import type {
  EntitlementSnapshot,
  PlanId,
  PlanInfo,
  ServiceResult,
  ServiceSource,
  SubscriptionService,
  UnavailableReason,
} from './service';
import type { StorePurchase } from './storeContracts';

/** How long we wait for the store to confirm a purchase before saying so. */
export const DEFAULT_PURCHASE_TIMEOUT_MS = 120_000;
/** How long a product fetch / connect / restore may take before we give up. */
export const DEFAULT_STORE_TIMEOUT_MS = 15_000;

export interface IapServiceOptions {
  /** Bridge loader — injectable so the proofs can drive a fake store. */
  loadBridge?: () => IapBridge | null;
  /** Clock, in epoch ms (injected; never Date.now() in the derivations). */
  now?: () => number;
  purchaseTimeoutMs?: number;
  storeTimeoutMs?: number;
}

interface Waiter {
  settle(result: ServiceResult<EntitlementSnapshot>): void;
}

/** A store read (fetch/restore) that timed out is 'store_unavailable'. */
class StoreTimeoutError extends Error {}

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new StoreTimeoutError(label)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Why a PRODUCT FETCH failed. A fetch can never be "the user cancelled", and
 * "nothing to restore" is meaningless here — those collapse to 'failed' so the
 * paywall never shows nonsense copy.
 */
export function productFetchReason(error: unknown): UnavailableReason {
  const reason = reasonFromStoreError(error);
  return reason === 'store_unavailable' || reason === 'pending' ? reason : 'failed';
}

export class IapSubscriptionService implements SubscriptionService {
  /** A real billing SDK is compiled in: 'store' copy applies, not the stub's. */
  readonly source: ServiceSource = 'store';

  private readonly loadBridge: () => IapBridge | null;
  private readonly now: () => number;
  private readonly purchaseTimeoutMs: number;
  private readonly storeTimeoutMs: number;

  private connected = false;
  private connecting: Promise<boolean> | null = null;
  private listeners: BridgeSubscription[] = [];
  private waiters = new Map<string, Waiter>();
  private busy = false;

  constructor(options: IapServiceOptions = {}) {
    this.loadBridge = options.loadBridge ?? loadIapBridge;
    this.now = options.now ?? (() => Date.now());
    this.purchaseTimeoutMs = options.purchaseTimeoutMs ?? DEFAULT_PURCHASE_TIMEOUT_MS;
    this.storeTimeoutMs = options.storeTimeoutMs ?? DEFAULT_STORE_TIMEOUT_MS;
  }

  private bridge(): IapBridge | null {
    try {
      return this.loadBridge();
    } catch {
      return null;
    }
  }

  /** Connect once per app session; failures are remembered as "not connected". */
  private async connect(bridge: IapBridge): Promise<boolean> {
    if (this.connected) return true;
    if (!this.connecting) {
      this.connecting = (async () => {
        try {
          const ok = await withTimeout(bridge.connect(), this.storeTimeoutMs, 'store connect timed out');
          this.connected = Boolean(ok);
          if (this.connected) this.attachListeners(bridge);
        } catch {
          this.connected = false;
        } finally {
          this.connecting = null;
        }
        return this.connected;
      })();
    }
    return this.connecting;
  }

  /** Register the store listeners exactly once per bridge. */
  private attachListeners(bridge: IapBridge): void {
    if (this.listeners.length > 0) return;
    this.listeners.push(bridge.onPurchaseUpdate((purchase) => this.onPurchase(purchase)));
    this.listeners.push(bridge.onPurchaseError((error) => this.onError(error)));
  }

  /**
   * A transaction the store confirmed (or is still deciding about).
   * Confirmed + ours + unexpired → acknowledge it and settle the waiters.
   * Pending → nothing happens yet: the user is told the store hasn't confirmed.
   */
  private onPurchase(purchase: StorePurchase): void {
    if (!isCalmQuestProductId(purchase.productId)) return;
    if (isPendingPurchase(purchase)) return;
    const entitlement = entitlementFromPurchase(purchase, this.now());
    if (!entitlement) return;
    void this.acknowledge(purchase);
    const waiter = this.waiters.get(purchase.productId);
    if (waiter) {
      this.waiters.delete(purchase.productId);
      waiter.settle({ ok: true, value: entitlement });
    }
  }

  /** Acknowledge a confirmed transaction; a failure here is not fatal. */
  private async acknowledge(purchase: StorePurchase): Promise<void> {
    const bridge = this.bridge();
    if (!bridge) return;
    try {
      await bridge.finish(purchase);
    } catch {
      // The store will replay an unfinished transaction; granting up front and
      // acknowledging best-effort is the honest order for a client with no
      // server-side receipt validation yet.
    }
  }

  private onError(error: unknown): void {
    const reason = reasonFromStoreError(error);
    const productId = (error as { productId?: unknown } | null)?.productId;
    if (typeof productId === 'string' && this.waiters.has(productId)) {
      this.settle(productId, { ok: false, reason });
      return;
    }
    // No usable product id: the only in-flight attempt is the one that errored.
    for (const sku of Array.from(this.waiters.keys())) this.settle(sku, { ok: false, reason });
  }

  private settle(sku: string, result: ServiceResult<EntitlementSnapshot>): void {
    const waiter = this.waiters.get(sku);
    if (!waiter) return;
    this.waiters.delete(sku);
    waiter.settle(result);
  }

  private waitFor(sku: string): Promise<ServiceResult<EntitlementSnapshot>> {
    return new Promise<ServiceResult<EntitlementSnapshot>>((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(sku);
        // The store simply has not confirmed yet (deferred payment, slow
        // network, parental approval). Say exactly that — and grant nothing.
        resolve({ ok: false, reason: 'pending' });
      }, this.purchaseTimeoutMs);
      this.waiters.set(sku, {
        settle: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    const bridge = this.bridge();
    if (!bridge) return false;
    return this.connect(bridge);
  }

  async getPlans(): Promise<ServiceResult<readonly PlanInfo[]>> {
    const bridge = this.bridge();
    if (!bridge) return { ok: false, reason: 'store_unavailable' };
    if (!(await this.connect(bridge))) return { ok: false, reason: 'store_unavailable' };
    try {
      const products = await withTimeout(
        bridge.fetchSubscriptions(STORE_SKUS),
        this.storeTimeoutMs,
        'store product fetch timed out',
      );
      return { ok: true, value: planInfoFromStoreProducts(products) };
    } catch (error) {
      return { ok: false, reason: productFetchReason(error) };
    }
  }

  async purchase(plan: PlanId): Promise<ServiceResult<EntitlementSnapshot>> {
    if (this.busy) return { ok: false, reason: 'pending' };
    const bridge = this.bridge();
    if (!bridge) return { ok: false, reason: 'store_unavailable' };
    if (!(await this.connect(bridge))) return { ok: false, reason: 'store_unavailable' };

    const sku = STORE_PRODUCT_IDS[plan];
    this.busy = true;
    const outcome = this.waitFor(sku);
    try {
      await withTimeout(
        bridge.purchaseSubscription(sku),
        this.storeTimeoutMs,
        'store purchase dispatch timed out',
      );
    } catch (error) {
      // Dispatch failed (sheet could not open, invalid SKU, not connected…).
      // The waiter is settled honestly; a later store event is still
      // acknowledged by the listener above and picked up by syncEntitlement.
      this.settle(sku, { ok: false, reason: reasonFromStoreError(error) });
    } finally {
      this.busy = false;
    }
    return outcome;
  }

  async restore(): Promise<ServiceResult<EntitlementSnapshot>> {
    const bridge = this.bridge();
    if (!bridge) return { ok: false, reason: 'store_unavailable' };
    if (!(await this.connect(bridge))) return { ok: false, reason: 'store_unavailable' };
    try {
      await withTimeout(bridge.restore(), this.storeTimeoutMs, 'store restore timed out');
      const purchases = await withTimeout(
        bridge.activePurchases(),
        this.storeTimeoutMs,
        'store active-purchases query timed out',
      );
      const entitlement = entitlementFromPurchases(purchases, this.now());
      // Nothing active: report it plainly. The caller must NOT downgrade on this
      // (a signed-out store account also reports nothing) — only the local
      // expiry check may ever lower a tier.
      if (entitlement.tier !== 'paid') return { ok: false, reason: 'nothing_to_restore' };
      return { ok: true, value: entitlement };
    } catch (error) {
      return { ok: false, reason: reasonFromStoreError(error) };
    }
  }

  async syncEntitlement(): Promise<ServiceResult<EntitlementSnapshot>> {
    const bridge = this.bridge();
    if (!bridge) return { ok: false, reason: 'store_unavailable' };
    if (!(await this.connect(bridge))) return { ok: false, reason: 'store_unavailable' };
    try {
      const purchases = await withTimeout(
        bridge.activePurchases(),
        this.storeTimeoutMs,
        'store active-purchases query timed out',
      );
      return { ok: true, value: entitlementFromPurchases(purchases, this.now()) };
    } catch (error) {
      // A FAILED query proves nothing — callers must not downgrade on it.
      return { ok: false, reason: reasonFromStoreError(error) };
    }
  }

  async openManageSubscriptions(): Promise<boolean> {
    const bridge = this.bridge();
    if (!bridge || typeof bridge.openManageSubscriptions !== 'function') return false;
    try {
      return await bridge.openManageSubscriptions();
    } catch {
      return false;
    }
  }

  /** Detach store listeners (used by proofs; the app keeps them for its lifetime). */
  dispose(): void {
    for (const sub of this.listeners) {
      try {
        sub.remove();
      } catch {
        // best effort
      }
    }
    this.listeners = [];
  }
}
