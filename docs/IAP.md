# Calm Quest — in-app purchases (Phase 7)

How the subscription works in code, what is real today, and what the owner (or the
next engineer) has to do before the first TestFlight build with a working paywall.

## The facts (locked Sep 2026)

| | |
|---|---|
| Apple Team ID | `3NNGCUL9V6` |
| Bundle ID | `com.questcalm.app` |
| Monthly product | `calmquest_monthly` — $9.99/mo |
| Yearly product | `calmquest_yearly` — $59.99/yr |
| Trial | 7 days, configured **in App Store Connect** on both products |
| App config | `app.json` → `expo.ios.bundleIdentifier`, `expo.ios.appleTeamId`, `expo.ios.buildNumber` |
| Build profiles | `eas.json` (`development`, `preview`, `production`) |

The client can never grant the trial: a free trial is a store-side setting on the
product. If the 7-day trial is not configured in App Store Connect, the store
simply sells the paid period — the app does not change.

## Where the code lives

```
src/subscription/
  service.ts          the seam (SubscriptionService, ServiceResult, reasons) — the contract
  mapping.ts          PURE store-payload → plan/entitlement mapping (the F8 guard)
  storeContracts.ts   narrow SDK-free shapes for products/purchases/errors
  bridge.ts           SDK seam, NON-native target: always null → stub service
  bridge.native.ts    SDK seam, iOS/Android: the ONLY file that imports react-native-iap
  iap.ts              IapSubscriptionService: fetch products, purchase, restore, sync
  trial.ts            runTrialFlow: auth (F10) → merge → purchase → apply entitlement
  stub.ts             StubSubscriptionService: the honest "no store in this build" path
  index.ts            picks the implementation (one file, one decision)
```

Wiring: `src/screens/PaywallScreen.tsx` (prices, CTA, honest per-ending copy) and
`src/screens/SettingsScreen.tsx` (Calm Quest+ tier, Restore purchases, Manage
subscription). Entitlements are written **only** by `applyEntitlement`
(`src/storage/store.ts`), which is fed **only** by a verified
`SubscriptionService` result — that is the F8 guard.

## Honesty rules encoded in the code (and proven)

* A confirmed transaction is the only thing that becomes `tier: 'paid'`.
* `pending` / deferred (Ask to Buy) grants **nothing** — the UI says the store
  hasn't confirmed yet.
* Cancelled → "no charge — nothing changed". Failed → "the store couldn't finish
  that". Expired, unknown-state, or non-Calm-Quest transactions grant nothing.
* Restore that finds nothing says so; it never downgrades (a signed-out store
  account reports nothing either).
* A store query that **fails** changes nothing. Only a store-given end date in the
  past downgrades a tier (checked on Settings focus).
* No store in this build (web, or a runtime without the SDK) → the stub answers
  `reason: 'stub'` and the existing "store setup coming soon" copy applies.
* Prices shown are the store's own localized `displayPrice` when the store
  answered; otherwise the configured prices. Never a made-up number.

## What is NOT done yet: server-side receipt validation

Per spec F8 the server is meant to be the source of truth for entitlements. There
is no backend yet, so today the store's own confirmation is the evidence and the
client is the judge. One file changes when Supabase lands:

1. Add a `verifyWithServer` step inside `src/subscription/iap.ts`
   (`purchase()` / `restore()` / `syncEntitlement()`) that posts the transaction
   (iOS: the JWS from `getTransactionJwsIOS`; Android: `purchaseToken`) to a
   Supabase edge function.
2. Only apply the entitlement when the server confirms it; otherwise return
   `reason: 'failed'`/`'pending'` and finish nothing.
3. Store the server's expiry on the account so entitlement sync (F10) can trust
   the account rather than the device.

Until then: an entitlement lives on the device, in the same local-first store as
everything else, and `mergeGuestState` still refuses to invent one.

## Testing on a device (owner-assisted steps)

Nothing below is runnable by the team — it needs interactive Apple/Expo logins.

```bash
# 1. once: link the project to an Expo account (creates extra.eas.projectId)
npx eas-cli@latest login
npx eas-cli@latest init

# 2. build for a real device (the SDK needs a native build — Expo Go cannot buy)
npx eas-cli@latest build --platform ios --profile preview
```

Then, in App Store Connect:

* **Sandbox testers** → add a sandbox Apple Account (Users and Access → Sandbox
  → Testers) and sign into it on the device under Settings → App Store.
* The two products must be in the **same subscription group** (monthly + yearly
  are alternative plans of one Calm Quest+ subscription), with the 7-day free
  trial configured on both, and at least one product must be
  "Ready to Submit" for the store to return it.
* Test: paywall prices should show the sandbox storefront's localized strings;
  a purchase should flip the Calm Quest+ chip in Settings to PLUS; Restore
  purchases should bring it back after a reinstall; cancelling the sheet should
  say "no charge — nothing changed".

Once TestFlight builds exist, `eas submit --platform ios --profile production`
uploads to App Store Connect (needs the owner's ASC API key or an interactive
login).
