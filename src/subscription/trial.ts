/**
 * Calm Quest — the trial/purchase flow (Phase 7, spec §2 Flow E + §3 F8/F10).
 *
 * Extracted from the paywall SCREEN so the whole sequence is testable without a
 * device, a store, or React — that is what lets the proofs cover the purchase
 * seam end to end. The screen is now a thin renderer over this.
 *
 * The sequence:
 *  1. F10 account step, best-effort: when a REAL auth provider is available, the
 *     account is created/signed into and the guest's local progress is merged in
 *     with `mergeGuestState` (higher streak wins, XP never drops, glimpses
 *     union, entitlements from the account only) and persisted. With the auth
 *     stub there is no account yet, so the purchase proceeds on the LOCAL
 *     profile — deliberately: blocking a real sale on an account that does not
 *     exist yet would strand the user, and nothing about it is faked. The
 *     account/cloud step lands with the Supabase backend.
 *  2. The store: `service.purchase(plan)`.
 *  3. Only a VERIFIED snapshot may flip tier to 'paid' (F8), applied through
 *     `applyEntitlement` — the single store-side writer of entitlements.
 *
 * Nothing here touches the paywall's grace rules: the modal still appears once
 * after the 3rd completed loop, declining still suppresses it for 7 days, and a
 * grant simply means it never appears again (see ./paywall.ts, untouched).
 */

import type { AppState } from '../storage/store';
import { applyEntitlement } from '../storage/store';
import type { AuthService } from './auth';
import { mergeGuestState } from './merge';
import type { EntitlementSnapshot, PlanId, SubscriptionService, UnavailableReason } from './service';

/** How the flow ended, in the seam's own vocabulary — never invented here. */
export type TrialStatus =
  | 'granted' // verified entitlement applied
  | 'stub' // no store in this build at all
  | 'store_unavailable' // store present but unreachable (Expo Go, no connection)
  | 'user_cancelled' // the user backed out — nothing charged
  | 'pending' // store has not confirmed yet
  | 'failed'; // the store reported a problem

export interface TrialOutcome {
  status: TrialStatus;
  /** The state after the flow (persisted by the time this resolves). */
  state: AppState;
  /** Present only when status === 'granted'. */
  entitlement?: EntitlementSnapshot;
  /** True when a real account was merged in during this flow (F10). */
  merged: boolean;
}

export interface TrialDeps {
  service: SubscriptionService;
  auth: AuthService;
  /** The guest's local snapshot at the moment the CTA was tapped. */
  guest: AppState;
  plan: PlanId;
  /** Persistence for the merged (pre-purchase) state; defaults to a no-op. */
  persist?: (state: AppState) => Promise<void>;
}

/** Map a seam reason onto the flow's status. */
export function statusForReason(reason: UnavailableReason | undefined): TrialStatus {
  switch (reason) {
    case 'stub':
      return 'stub';
    case 'store_unavailable':
      return 'store_unavailable';
    case 'user_cancelled':
      return 'user_cancelled';
    case 'pending':
      return 'pending';
    default:
      // 'failed', 'nothing_to_restore' (meaningless for a purchase) and a
      // missing reason all mean the same honest thing: it did not complete.
      return 'failed';
  }
}

export async function runTrialFlow(deps: TrialDeps): Promise<TrialOutcome> {
  const { service, auth, plan } = deps;
  const persist = deps.persist ?? (async () => {});
  let base = deps.guest;
  let merged = false;

  // 1. F10 — best-effort account step. Auth problems never block a purchase.
  try {
    if (await auth.isAvailable()) {
      const account = await auth.createOrSignIn();
      if (account.ok && account.account) {
        base = mergeGuestState(deps.guest, account.account);
        merged = true;
        await persist(base);
      }
    }
  } catch {
    // stay on the guest's local state
  }

  // 2. The store.
  let result;
  try {
    result = await service.purchase(plan);
  } catch {
    return { status: 'failed', state: base, merged };
  }

  if (!result.ok || !result.value) {
    return { status: statusForReason(result.reason), state: base, merged };
  }

  // 3. A verified snapshot — the only path to tier 'paid' (F8 guard).
  const next = await applyEntitlement(base, result.value);
  await persist(next);
  return { status: 'granted', state: next, entitlement: result.value, merged };
}
