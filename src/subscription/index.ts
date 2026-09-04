/**
 * Calm Quest — subscription barrel (Phase 4a).
 *
 * THE ONE FILE TO CHANGE when the real store lands: export the real service
 * (RevenueCat / react-native-iap + server validation) instead of the stub.
 * Every consumer imports from here, so nothing else moves.
 */

export type { SubscriptionService, PlanInfo, PlanId, ServiceResult, UnavailableReason } from './service';
export {
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
  isStubUnavailable,
} from './service';
export { StubSubscriptionService, subscriptionService } from './stub';
