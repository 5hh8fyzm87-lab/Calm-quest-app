# Calm Quest — App

Mobile app (Expo managed workflow · React Native · TypeScript) for the Calm Quest Christian mindset MVP: daily quests, affirmations, gratitude glimpses, grace-centered streaks.

> **Owner-locked decisions:** iOS-first (Android later) · content authored in-house · scripture from the public-domain **World English Bible (WEB)** · backend **Supabase** (wired in a later phase) · no signup wall until the paywall · static bundled content, offline-first · AI features are **post-MVP and out of scope** · grace-centered streaks (no streak-guilt, no flame/chain-loss imagery anywhere).

## Status — Phase 1 (scaffold + data model + offline content bundle)

- Expo SDK 57 managed workflow, TypeScript strict.
- Typed data models + AsyncStorage-backed local store (Supabase sync layer slots in later).
- Offline content bundle under `content/` — **sample set, clearly marked for the in-house content pass** (Phase 6). Counts and layout: see `content/README.md`.
- Navigation structure and placeholder screens per build-order Phase 1.

## Status — Phase 5 (settings + analytics + compliance) — COMPLETE

- **Settings (spec §3 F9), extended:** sound on/off (persisted pref, default ON — an honest intent until a bundled audio asset exists in Phase 6, since the MVP reminder is deliberately muted); Log out (only ever rendered/enabled when the AuthService seam is `isAvailable()` — the stub keeps it an honest "coming soon" note, never a fabricated signed-out state); **Delete my data** — a REAL local wipe (`resetAllState` pure + `deleteAllData`) that restores a true fresh-install state (streak, XP/level, glimpses archive, quest + bonus completions, saved affirmations, entitlements snapshot, reminder + sound prefs, paywall stamp), cancels the scheduled reminder, and routes the next screen to Onboarding. Server-side GDPR deletion arrives with the real backend (stated honestly in the UI). Restore purchases / Manage subscription stay on the honest SubscriptionService seam (never fake success).
- **In-app Privacy & Terms** (`PrivacyTerms` screen): mirrors the site pages (`/privacy`, `/terms`) verbatim in a scroll view — no new legal text invented.
- **Analytics stub seam (spec §3 S5):** `src/analytics/index.ts` — typed `track(event, params)` with the full S5 event set (+ `level_up`, `restore_requested`); dev-only console logging, strict no-op otherwise, never throws, never fabricates sends. A real provider (PostHog/Firebase) swaps in via the same one-file pattern. Instrumented at the real call sites: quest completed (daily + bonus), glimpse completed, affirmation saved, streak > 0, grace used, level up, paywall seen, trial started/converted (only reachable with a verified service), restore requested.
- Proofs: `node scripts/proof-phase5.js` (29 checks) — wipe completeness, fresh-state identity, onboarding routing, sound pref round-trip + migration, log-out honesty, analytics console-capturability + no-op mode.

Docs: blueprint `/home/team/shared/feature-spec.md` · build order `/home/team/shared/build-order.md` · team workflow `/home/team/shared/WORKFLOW.md` · app conventions `AGENTS.md`.

## Commands

```bash
npm install        # install pinned deps
npm run typecheck  # tsc --noEmit
npm start          # expo dev server (iOS-first)
```

Env (later phases, not required now): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — never commit real values.
