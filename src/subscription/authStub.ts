/**
 * Calm Quest — STUB AuthService (Phase 4b).
 *
 * ⚠️ NOT REAL AUTH. ⚠️
 * Exists so the paywall's trial flow, the F10 merge wiring, and the proofs
 * are fully buildable and testable before a real auth provider exists
 * (Supabase/Firebase + Sign in with Apple, Phase 6). It:
 *   - reports isAvailable() → false (honest: nothing to sign into),
 *   - NEVER creates or signs into an account — every attempt fails with
 *     reason 'stub',
 *   - therefore never returns an account snapshot. No fabricated ids, no
 *     invented state, no "account created" moments anywhere.
 *
 * The real implementation must satisfy the same AuthService interface and
 * swap in via ./index.ts. On success it returns the account's remote state
 * snapshot so `mergeGuestState` can wire the guest's progress in (F10).
 */

import type { AuthResult, AuthService } from './auth';

export class StubAuthService implements AuthService {
  async isAvailable(): Promise<boolean> {
    // Honest: no auth provider is wired. The real service returns true once
    // the provider + account storage are live.
    return false;
  }

  async createOrSignIn(): Promise<AuthResult> {
    // The stub never fabricates an account — `account` stays undefined.
    return { ok: false, reason: 'stub' };
  }
}

/** The app-wide instance. Swap to the real service in ./index.ts when ready. */
export const authService: AuthService = new StubAuthService();
