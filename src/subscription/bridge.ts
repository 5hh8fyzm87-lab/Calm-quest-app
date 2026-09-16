/**
 * Calm Quest — billing bridge, NON-NATIVE fallback (Phase 7, feature spec §3 F8).
 *
 * THE SDK SEAM. `IapBridge` is the narrow, SDK-free surface the subscription
 * service talks to. Two files implement the loader:
 *  - `bridge.ts` (this file): every non-native target — web, Node proofs,
 *    anything without iOS/Android. Always returns null, so the app falls back
 *    to the stub service and shows its honest "store not connected" copy.
 *  - `bridge.native.ts`: iOS + Android. Lazily `require`s react-native-iap and
 *    adapts it to this interface (the only file in the app that imports the SDK).
 *
 * Metro resolves `./bridge` to `bridge.native.ts` on iOS/Android, so the real
 * implementation is what ships in a native build while web stays SDK-free.
 * Swapping react-native-iap for RevenueCat (or adding server-side receipt
 * validation) is a change to `bridge.native.ts` alone.
 */

import type { StoreProduct, StorePurchase } from './storeContracts';

/** A callback subscription returned by the bridge's store listeners. */
export interface BridgeSubscription {
  remove(): void;
}

/** Everything the subscription service needs from a billing SDK. */
export interface IapBridge {
  /** Connect to the store. Resolves false (or throws) when it cannot. */
  connect(): Promise<boolean>;

  /** Fetch subscription products by SKU (localized prices included). */
  fetchSubscriptions(skus: readonly string[]): Promise<StoreProduct[]>;

  /**
   * Dispatch a subscription purchase. The outcome is NOT the return value —
   * it arrives on `onPurchaseUpdate` (confirmed) or `onPurchaseError`.
   */
  purchaseSubscription(sku: string): Promise<void>;

  /** Active, non-consumable entitlements the store currently holds. */
  activePurchases(): Promise<StorePurchase[]>;

  /** Ask the store to sync/restore prior purchases. */
  restore(): Promise<void>;

  /** Acknowledge a completed transaction so the store stops replaying it. */
  finish(purchase: StorePurchase): Promise<void>;

  /** Listener for confirmed (or still-pending) transactions. */
  onPurchaseUpdate(cb: (purchase: StorePurchase) => void): BridgeSubscription;

  /** Listener for store/SDK errors, including user cancellation. */
  onPurchaseError(cb: (error: unknown) => void): BridgeSubscription;

  /** Open the platform subscription-management screen, when supported. */
  openManageSubscriptions?(): Promise<boolean>;
}

/**
 * Load the billing bridge for this target. Non-native targets have no store:
 * always null, which is exactly the honest answer for web and for the proofs.
 */
export function loadIapBridge(): IapBridge | null {
  return null;
}
