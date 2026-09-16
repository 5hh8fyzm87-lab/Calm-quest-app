/**
 * Calm Quest — billing bridge, NATIVE (iOS + Android) — Phase 7, spec §3 F8.
 *
 * THE ONLY FILE IN THE APP THAT IMPORTS A BILLING SDK. It adapts
 * react-native-iap's openiap API to the narrow `IapBridge` interface; swapping
 * to RevenueCat (or adding server-side receipt validation) means changing this
 * file and nothing else.
 *
 * Why the module is loaded lazily (`await import(...)`) instead of at the top:
 * the SDK's native half does not exist in Expo Go or a plain JS runtime, and
 * merely evaluating it can crash there. Loading it on first use keeps the app
 * booting everywhere and lets `connect()` fail into an honest
 * 'store_unavailable' result instead of a white screen.
 *
 * Verified against react-native-iap 16.6.1 (openiap schema): `fetchProducts`,
 * `requestPurchase` (event-driven), `getAvailablePurchases`, `restorePurchases`,
 * `finishTransaction`, `purchaseUpdatedListener`, `purchaseErrorListener`,
 * `deepLinkToSubscriptionsIOS`. Product prices come from the store as
 * `displayPrice`; iOS expiry as `expirationDateIOS` (epoch ms).
 */

import { Linking } from 'react-native';
import type { ProductSubscription, Purchase } from 'react-native-iap';

import type { BridgeSubscription, IapBridge } from './bridge';
import type { StoreProduct, StorePurchase } from './storeContracts';

/** Apple's public subscription-management page — real, first-party, no guessing. */
export const APPLE_MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/** The subset of the SDK we use, typed with the SDK's own declarations. */
type IapModule = typeof import('react-native-iap');

/**
 * Adapt a store product to our narrow contract. Typed with the SDK's own
 * `ProductSubscription`, so `tsc` verifies these field names for real.
 */
export function toStoreProduct(product: ProductSubscription): StoreProduct {
  return {
    id: product.id,
    displayPrice: product.displayPrice ?? null,
    price: typeof product.price === 'number' ? product.price : null,
    currency: product.currency ?? null,
    title: product.title ?? null,
    description: product.description ?? null,
  };
}

/** Adapt a store transaction (or pending one) to our narrow contract. */
export function toStorePurchase(purchase: Purchase): StorePurchase {
  const maybeIos = purchase as { expirationDateIOS?: number | null };
  return {
    productId: purchase.productId,
    id: purchase.id ?? null,
    transactionDate:
      typeof purchase.transactionDate === 'number' ? purchase.transactionDate : null,
    expirationDateIOS:
      typeof maybeIos.expirationDateIOS === 'number' ? maybeIos.expirationDateIOS : null,
    purchaseState: typeof purchase.purchaseState === 'string' ? purchase.purchaseState : null,
  };
}

class ReactNativeIapBridge implements IapBridge {
  private module: IapModule | null = null;
  private loading: Promise<IapModule | null> | null = null;

  /** Load the SDK once; null when it is not present in this runtime. */
  private async sdk(): Promise<IapModule | null> {
    if (this.module) return this.module;
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const mod = (await import('react-native-iap')) as IapModule;
          if (!mod || typeof mod.initConnection !== 'function') return null;
          this.module = mod;
          return mod;
        } catch {
          return null;
        }
      })();
    }
    return this.loading;
  }

  async connect(): Promise<boolean> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    return Boolean(await sdk.initConnection());
  }

  async fetchSubscriptions(skus: readonly string[]): Promise<StoreProduct[]> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    const result = await sdk.fetchProducts({ skus: [...skus], type: 'subs' });
    const products = (Array.isArray(result) ? result : []) as ProductSubscription[];
    return products.filter((p) => Boolean(p) && typeof p.id === 'string').map(toStoreProduct);
  }

  async purchaseSubscription(sku: string): Promise<void> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    // Event-driven: the outcome arrives on the purchase listeners, never here.
    await sdk.requestPurchase({
      request: { apple: { sku }, google: { skus: [sku] } },
      type: 'subs',
    });
  }

  async activePurchases(): Promise<StorePurchase[]> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    // `onlyIncludeActiveItemsIOS` keeps this to what the store still honors —
    // an expired subscription must not come back as an active entitlement.
    const purchases = await sdk.getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    });
    return (Array.isArray(purchases) ? purchases : []).filter(Boolean).map(toStorePurchase);
  }

  async restore(): Promise<void> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    if (typeof sdk.restorePurchases === 'function') {
      await sdk.restorePurchases();
    }
  }

  async finish(purchase: StorePurchase): Promise<void> {
    const sdk = await this.sdk();
    if (!sdk) throw new Error('react-native-iap is not available in this runtime');
    if (!purchase.id) return; // nothing to finalize; the store will replay it
    await sdk.finishTransaction({
      // Only the id/productId are read by the SDK for finalization; the rest of
      // the transaction payload is not needed to acknowledge it.
      purchase: { id: purchase.id, productId: purchase.productId } as unknown as Purchase,
      isConsumable: false, // a subscription is never consumed
    });
  }

  onPurchaseUpdate(cb: (purchase: StorePurchase) => void): BridgeSubscription {
    let sub: BridgeSubscription | null = null;
    let cancelled = false;
    void this.sdk().then((sdk) => {
      if (!sdk || cancelled) return;
      sub = sdk.purchaseUpdatedListener((purchase) => cb(toStorePurchase(purchase)));
    });
    return {
      remove: () => {
        cancelled = true;
        sub?.remove();
      },
    };
  }

  onPurchaseError(cb: (error: unknown) => void): BridgeSubscription {
    let sub: BridgeSubscription | null = null;
    let cancelled = false;
    void this.sdk().then((sdk) => {
      if (!sdk || cancelled) return;
      sub = sdk.purchaseErrorListener((error) => cb(error));
    });
    return {
      remove: () => {
        cancelled = true;
        sub?.remove();
      },
    };
  }

  /**
   * Open the App Store's subscription screen. Prefers the SDK's own sheet and
   * falls back to Apple's public manage-subscriptions page — both are real
   * first-party surfaces; neither claims anything happened.
   */
  async openManageSubscriptions(): Promise<boolean> {
    const sdk = await this.sdk();
    if (sdk && typeof sdk.deepLinkToSubscriptionsIOS === 'function') {
      try {
        if (await sdk.deepLinkToSubscriptionsIOS()) return true;
      } catch {
        // fall through to the public page
      }
    }
    try {
      await Linking.openURL(APPLE_MANAGE_SUBSCRIPTIONS_URL);
      return true;
    } catch {
      return false;
    }
  }
}

let cached: IapBridge | null | undefined;

/**
 * The native bridge. Always returns an instance on iOS/Android: whether the
 * store can actually be reached is discovered by `connect()`, which fails
 * honestly (never a fake success) in Expo Go or without a store account.
 */
export function loadIapBridge(): IapBridge | null {
  if (cached === undefined) cached = new ReactNativeIapBridge();
  return cached;
}
