# Release Checklist — Calm Quest (iOS, App Store)

Practical checklist for shipping the first build. Work the "Owner" items only after the
internal identity lock (this repo, `app.json`) is merged and the owner's Apple Developer
account exists.

## Locked identity (already in code — `app.json`)
- App name (display): **Calm Quest**
- Expo slug: `calm-quest`
- iOS bundle ID: `com.questcalm.app` · Android package (planned): `com.questcalm.app`
- Brand/domain: **questcalm.com** (owner purchasing; `$14` first yr / `~$47` renew)
- Version: `1.0.0`

## App Store Connect (Owner — needs Apple Developer account)
1. Create app record: **Calm Quest**, bundle ID `com.questcalm.app`.
2. Create subscription products (both with a **7-day free trial**):
   - `calmquest_monthly` — **$9.99 / month**
   - `calmquest_yearly` — **$59.99 / year** (≈ $5/mo, "Best value" anchor)
3. Give the team: **Team ID** + confirmations of bundle ID and product IDs, so real IAP
   can be wired (Phase 4/6 step — see below).

## TestFlight
- Submit via **EAS build** (`npx eas build --platform ios`).
- The TestFlight invite goes to the **Apple Developer account email**.

## Real IAP swap-in (Engineer — after owner creds exist; do NOT fake in the meantime)
- Replace the stub seams at:
  - `src/subscription/index.ts` (subscription service)
  - `src/subscription/authStub.ts` (auth service)
- Wire RevenueCat or `react-native-iap` against the store products above, and add
  **server-side validation** for entitlements. Until then the paywall is presentational
  only (honest — no fabricated purchases).

## Pre-flight checks
- `npm run typecheck` — exit 0.
- `node scripts/proof-phase*.js` (phase2a → phase4b) — all pass.
- `npx expo export --platform ios` — success.
- No `cq-tpl` / template leftovers in `src/` or `app.json` (identity is relocked).

## After first release
- Android port (package `com.questcalm.app`, ~2 weeks after iOS ships).
- Trademark check for "Calm Quest" is the owner's step (before store listing is final).