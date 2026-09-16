# Release Checklist — Calm Quest (iOS, App Store)

Practical checklist for shipping the first build. Work the "Owner" items only after the
internal identity lock (this repo, `app.json`) is merged and the owner's Apple Developer
account exists.

## Locked identity (already in code — `app.json`)
- App name (display): **Calm Quest**
- Expo slug: `calm-quest`
- iOS bundle ID: `com.questcalm.app` · Android package: `com.questcalm.app`
- Apple Team ID: `3NNGCUL9V6` (in `app.json` → `expo.ios.appleTeamId`)
- Brand/domain: **questcalm.com** (owner purchasing; `$14` first yr / `~$47` renew)
- Version: `1.0.0` · iOS build number `1` (EAS `appVersionSource: remote` manages it after the first build)

## App Store Connect (Owner — needs Apple Developer account)
1. Create app record: **Calm Quest**, bundle ID `com.questcalm.app`.
2. Create subscription products (both with a **7-day free trial**):
   - `calmquest_monthly` — **$9.99 / month**
   - `calmquest_yearly` — **$59.99 / year** (≈ $5/mo, "Best value" anchor)
   - both in ONE subscription group (two plans of one Calm Quest+ subscription)
3. Give the team: **Team ID** + confirmations of bundle ID and product IDs, so real IAP
   can be wired.

## TestFlight
- One-time: `npx eas-cli@latest login` then `npx eas-cli@latest init` (links the project,
  writes `extra.eas.projectId`) — owner-assisted, interactive.
- Build: `npx eas-cli@latest build --platform ios --profile preview` (internal distribution)
  or `--profile production` for App Store. EAS handles the signing credentials for Team
  `3NNGCUL9V6`.
- Upload/TestFlight: `npx eas-cli@latest submit --platform ios --profile production`.
- The TestFlight invite goes to the **Apple Developer account email**.

## Real IAP — DONE in Phase 7 (see `docs/IAP.md`)
- `react-native-iap` (+ `react-native-nitro-modules`) is wired behind the seam:
  `src/subscription/bridge.native.ts` is the only file that imports the SDK,
  `src/subscription/iap.ts` implements the seam, `src/subscription/mapping.ts` holds the
  pure (proven) product/entitlement mapping, and `src/subscription/index.ts` picks the
  implementation.
- Builds with no store (web, or a runtime without the SDK) fall back to the stub service
  and keep the honest "store setup coming soon" copy — never a fake success.
- The auth seam (`src/subscription/authStub.ts`) is still a stub: the purchase proceeds on
  the local profile and `runTrialFlow` merges the guest state the moment a real account
  provider exists (F10).
- **Still open:** server-side receipt validation — documented in `docs/IAP.md` with the
  exact one-file change for when the Supabase backend lands.

## Pre-flight checks
- `npm run typecheck` — exit 0.
- `node scripts/proof-phase*.js` (phase2a → phase7) — all pass.
- `npx expo export --platform ios` — success.
- No `cq-tpl` / template leftovers in `src/` or `app.json` (identity is relocked).

## Phase 6 content verified (2026-09-04)
The in-house content pack replaced the Phase 1 SAMPLE bundle wholesale:
- **60 quests** (5 themes × 12; per theme 3 read_reflect / 3 act / 3 pause / 3 write; every
  pause quest carries `durationSeconds: 60` + a `pausePrompt` shown during the Pause timer).
- **75 affirmations** (15 × 5, ≤ 1 sentence each).
- **30 Gratitude Glimpse prompts** ("one good thing — however small" family).
- **60 WEB verses** (public domain, always attributed — reference + translation + attribution
  line render wherever a verse appears; poetic line breaks preserved).
- **20 level titles + blessings** (Seed → Shelter) — confirmed identical to the draft, no change.
- Deterministic rotation unchanged (`pickToday`/`dayNumber` are pure date math), so saved
  progress maps sanely; the daily-loop gate is the local date (not the usage ledger), so a
  fresh-day quest is always playable even after a content swap.
- Saved-progress note: old Phase 1 completions reused ids like `q-gratitude-01`; the Phase 6
  bundle keeps the same id scheme, so a pre-release tester's completed-id ledger may name a
  quest whose CONTENT is new. XP/streak/level are never touched; the date gate means the only
  visible effect is the usage-history id mapping (cosmetic, no regression).

QA walkthrough log (all green, `node scripts/proof-phase2a..6.js` + typecheck + iOS export):
- Daily loop: onboarding → today's quest → complete (+50 XP, streak credit) → affirmation save
  (+5 XP) → Gratitude Glimpse (+20 XP) → level-up moment; paywall after 3rd loop; free glimpse
  cap 1/day with paid unlimited; theme peek free = today only / paid = all 5; bonus quest +50 XP
  on its OWN ledger (never the loop/streak/paywall).
- Grace streak: 4-day miss cycle — freeze on miss, 3-day grace, resume from frozen value,
  4th consecutive miss resets (exactly Flow C).
- Offline: quest completion + state persist via AsyncStorage local-first; reopen restores it.
- Delete data (Phase 5): returns the app to a true fresh install (onboarding next launch).
- Content proofs: 60/75/30/60 counts, unique ids, all quest verseIds resolve, every pause quest
  has a pausePrompt, titles ≤ 6 words, affirmations/prompts ≤ 1 sentence, all verses attributed WEB.

## After first release
- Android port (package `com.questcalm.app`, ~2 weeks after iOS ships).
- Trademark check for "Calm Quest" is the owner's step (before store listing is final).