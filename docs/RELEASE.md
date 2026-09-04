# Calm Quest — iOS Release Checklist (MVP → App Store / TestFlight)

## Identity (locked Sep 2026)
- App name: **Calm Quest**
- Domain: **questcalm.com**
- iOS bundle ID: **com.questcalm.app** (set in `app.json` → `expo.ios.bundleIdentifier`)
- Android package (port later): **com.questcalm.app** (`app.json` → `expo.android.package`)
- Expo slug: **calm-quest**

## App Store Connect (owner, after Apple Developer enrollment)
1. Create the app record:
   - Name: **Calm Quest**
   - Bundle ID: **com.questcalm.app** (register it in Certificates, Identifiers & Profiles first)
2. Create the two subscription products (exact IDs the code references):
   - `calmquest_monthly` — $9.99/month
   - `calmquest_yearly` — $59.99/year
3. Enable the **7-day free trial** as an introductory offer on both (auto-converts at period end — the app already shows the plain-language pre-trial confirmation).
4. Provide the usual listing assets: description, screenshots, privacy policy URL (on the site), subscription disclosure.

## Real money wiring (code, after the above exists)
- **`src/subscription/index.ts`** — swap the `StubSubscriptionService` for the real implementation (RevenueCat / `react-native-iap` + server-side receipt validation; products `calmquest_monthly` / `calmquest_yearly`).
- **`src/subscription/authStub.ts`** — swap the `StubAuthService` for real auth (Supabase/Firebase + Sign in with Apple) once a backend is connected; `mergeGuestState` (F10) already exists in `src/subscription/merge.ts`.
- Never flip `entitlements.tier` to `'paid'` without a verified store entitlement (spec F8 guard).

## TestFlight (owner + team)
1. Build via EAS (`eas build --platform ios` — EAS project to be created; slug `calm-quest`).
2. Submit for TestFlight from App Store Connect.
3. Invite the Apple Developer account email; accept in the TestFlight app.

## Notes
- The daily loop, grace streaks, paywall, and all paid gates are implemented, offline-first, and covered by the proof suites in `scripts/` (`proof-phase2a/2b/3/4a/4b`).
- Keep honest copy everywhere: no fake unlocks, no scarcity/urgency (acceptable-use is a hard line).