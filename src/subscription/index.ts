/**
 * Calm Quest — subscription barrel (Phase 4a, extended in Phase 7).
 *
 * THE ONE FILE THAT PICKS THE IMPLEMENTATION. Every consumer imports
 * `subscriptionService` from here, so swapping the billing SDK (react-native-iap
 * → RevenueCat) or adding server-side receipt validation never moves a call site.
 *
 * Selection (Phase 7):
 *  - native builds (iOS/Android): `IapSubscriptionService` over react-native-iap
 *    — real products, real localized prices, real restore. `bridge.native.ts` is
 *    what Metro loads there.
 *  - everywhere else (web, Node): `bridge.ts` answers null, so the stub service
 *    is used and the UI keeps its honest "store setup coming soon" copy. Nothing
 *    is faked in either world.
 */

export type {
  SubscriptionService,
  PlanInfo,
  PlanId,
  ServiceResult,
  ServiceSource,
  EntitlementSnapshot,
  UnavailableReason,
} from './service';
export {
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
  isStubUnavailable,
} from './service';
export { StubSubscriptionService, subscriptionService as stubSubscriptionService } from './stub';

// Phase 7: real store (native) + its honest non-native fallback.
export type { IapBridge, BridgeSubscription } from './bridge';
export { loadIapBridge } from './bridge';
export type { StoreProduct, StorePurchase, StoreError } from './storeContracts';
export {
  STORE_PRODUCT_IDS,
  STORE_SKUS,
  PLAN_BY_STORE_PRODUCT_ID,
  entitlementFromPurchase,
  entitlementFromPurchases,
  isCalmQuestProductId,
  isConfirmedPurchase,
  isExpiredPurchase,
  isPaid,
  isPendingPurchase,
  planInfoFromStoreProducts,
  planForStoreProductId,
  reasonFromStoreError,
  reconciledEntitlement,
} from './mapping';
export { IapSubscriptionService, DEFAULT_PURCHASE_TIMEOUT_MS, productFetchReason } from './iap';
export type { IapServiceOptions } from './iap';
export { runTrialFlow, statusForReason } from './trial';
export type { TrialDeps, TrialOutcome, TrialStatus } from './trial';

import { loadIapBridge } from './bridge';
import { IapSubscriptionService } from './iap';
import type { SubscriptionService } from './service';
import { subscriptionService as stubSubscriptionService } from './stub';

/**
 * The app-wide service: the real store where the bridge exists for this target,
 * the honest stub everywhere else.
 */
export function createSubscriptionService(): SubscriptionService {
  const bridge = loadIapBridge();
  return bridge ? new IapSubscriptionService({ loadBridge: () => bridge }) : stubSubscriptionService;
}

/** The instance every screen uses. */
export const subscriptionService: SubscriptionService = createSubscriptionService();

// Phase 4b: gate derivations (§5 free/paid split + S1 theme peek) — pure.
export {
  FREE_DAILY_GLIMPSES,
  THEME_ORDER,
  glimpsesToday,
  glimpseCapReached,
  canBrowseThemes,
  visibleThemes,
  themeQuestCounts,
  bonusQuestAvailable,
  pickBonusQuest,
} from './gates';
// Build 14 (two-paths §1/§3): the program-level mirror of the theme gate —
// free holds one program, Calm Quest+ holds all three, switching is free.
export { canSwitchPrograms, programsFor } from './gates';

// Phase 4b: AuthService seam (F10 continuation) — same one-file-swap pattern.
export type { AuthService, AuthResult, AuthUnavailableReason } from './auth';
export { isStubAuthUnavailable } from './auth';
export { StubAuthService, authService } from './authStub';

// Phase 4a: paywall trigger logic (unchanged — grace rules live here).
export { PAYWALL_RENAG_DAYS, PAYWALL_TRIGGER_LOOPS, loopsCompleted, paywallSurface } from './paywall';
export { mergeGuestState } from './merge';
