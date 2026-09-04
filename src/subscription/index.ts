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

// Phase 4b: AuthService seam (F10 continuation) — same one-file-swap pattern.
export type { AuthService, AuthResult, AuthUnavailableReason } from './auth';
export { isStubAuthUnavailable } from './auth';
export { StubAuthService, authService } from './authStub';
