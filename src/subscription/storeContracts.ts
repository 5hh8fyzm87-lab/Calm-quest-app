/**
 * Calm Quest — store contracts (Phase 7, feature spec §3 F8).
 *
 * The NARROW shapes the app consumes from whichever billing SDK is wired
 * (today: react-native-iap; the seam allows a swap to RevenueCat). Deliberately
 * SDK-free, pure types: no imports, no I/O.
 *
 * Why these exist: the pure mapping layer (`mapping.ts`) and its proofs must be
 * able to build store payloads by hand — a device, a sandbox account, and a
 * real App Store connection are not available in CI. The one file that touches
 * the SDK (`bridge.native.ts`) is responsible for ADAPTING the SDK's own types
 * into these shapes, which is also what lets `tsc` check that adaptation
 * against the real SDK typings.
 *
 * Field names mirror react-native-iap's `Product`/`ProductSubscription` and
 * `Purchase` (openiap schema): `displayPrice` (store-localized string),
 * `expirationDateIOS` (epoch ms), `purchaseState` ('pending' | 'purchased' | …).
 */

/** A subscription product as the store describes it (localized pricing). */
export interface StoreProduct {
  /** The store product id, e.g. 'calmquest_yearly'. */
  id: string;
  /** Store-localized price string, e.g. '$59.99' or '59,99 €'. */
  displayPrice?: string | null;
  /** Numeric price in `currency`, when the store provides it. */
  price?: number | null;
  /** ISO currency code, e.g. 'USD' (display only — never used for math). */
  currency?: string | null;
  title?: string | null;
  description?: string | null;
}

/**
 * A purchase/transaction as the store describes it.
 *
 * `purchaseState` is the honest pending signal: iOS deferred purchases (Ask to
 * Buy) and Android pending transactions arrive as 'pending' and must NEVER
 * grant an entitlement before the store confirms them.
 */
export interface StorePurchase {
  /** The product this transaction is for. */
  productId: string;
  /** Transaction identifier (required to finish an iOS transaction). */
  id?: string | null;
  /** Epoch ms the purchase was made. */
  transactionDate?: number | null;
  /** Epoch ms the subscription/period expires (iOS). Null/undefined = unknown. */
  expirationDateIOS?: number | null;
  /** Store-reported state: 'purchased' | 'pending' | 'restored' | … */
  purchaseState?: string | null;
}

/** An error the store/SDK surfaced. Everything is optional — stores are messy. */
export interface StoreError {
  code?: string | null;
  message?: string | null;
  productId?: string | null;
}
