/**
 * Calm Quest — AuthService seam (Phase 4b, feature spec §3 F10 continuation).
 *
 * THE SEAM: the paywall's "Start trial" flow talks only to this interface.
 * When real auth lands (Supabase/Firebase + Sign in with Apple, Phase 6), the
 * real implementation drops in behind the same interface — swap stub → real
 * is a one-file change in index.ts (same pattern as SubscriptionService).
 *
 * Purpose (F10): at trial start, an account is created or signed into, and
 * the account's REMOTE state snapshot is returned so the guest's local state
 * can be merged with the pure `mergeGuestState` (src/subscription/merge.ts)
 * — nothing the guest did is lost: higher streak wins, XP never drops,
 * glimpses union, entitlements come only from the verified account.
 *
 * THIS STUB IS NOT REAL AUTH. It talks to no auth provider, holds no
 * sessions, and never fabricates an account: every attempt fails with
 * reason 'stub' and `account` stays undefined. No fake signup UI, no
 * "account created" toasts anywhere.
 */

import type { AppState } from '../storage/store';

/** Why an auth attempt could not complete. */
export type AuthUnavailableReason =
  | 'stub' // the seam is stubbed — no auth provider wired yet (today's only reason)
  | 'network' // real later: provider unreachable
  | 'user_cancelled'; // real later: the user backed out of the sheet

/** What any auth call returns. */
export interface AuthResult {
  ok: boolean;
  /**
   * On success ONLY: the account's remote state snapshot, ready for
   * `mergeGuestState(guest, account)`. The stub never populates this —
   * no fabricated account ids, no invented state.
   */
  account?: AppState;
  /** Populated only on failure — the UI branches its honest copy on this. */
  reason?: AuthUnavailableReason;
}

/**
 * The one abstraction the trial-start flow depends on. Keep methods async
 * and result-shaped so the real implementation (provider round-trip) can be
 * slower and still fit.
 */
export interface AuthService {
  /** Is a real auth provider wired up? Always false in the stub. */
  isAvailable(): Promise<boolean>;

  /**
   * Create-or-sign-in at the moment a trial starts (F10). Success returns
   * the account's remote snapshot for the guest→account merge. The stub
   * never succeeds (reason 'stub') and never returns an account.
   */
  createOrSignIn(): Promise<AuthResult>;
}

/** Type guard for an AuthResult failure with the stub reason. */
export function isStubAuthUnavailable(r: AuthResult): boolean {
  return !r.ok && r.reason === 'stub';
}
