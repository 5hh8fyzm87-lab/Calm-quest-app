# Calm Quest — App

Mobile app (Expo managed workflow · React Native · TypeScript) for the Calm Quest Christian mindset MVP: daily quests, affirmations, gratitude glimpses, grace-centered streaks.

> **Owner-locked decisions:** iOS-first (Android later) · content authored in-house · scripture from the public-domain **World English Bible (WEB)** · backend **Supabase** (wired in a later phase) · no signup wall until the paywall · static bundled content, offline-first · AI features are **post-MVP and out of scope** · grace-centered streaks (no streak-guilt, no flame/chain-loss imagery anywhere).

## Status — Phase 1 (scaffold + data model + offline content bundle)

- Expo SDK 57 managed workflow, TypeScript strict.
- Typed data models + AsyncStorage-backed local store (Supabase sync layer slots in later).
- Offline content bundle under `content/` — **sample set, clearly marked for the in-house content pass** (Phase 6). Counts and layout: see `content/README.md`.
- Navigation structure and placeholder screens per build-order Phase 1.

Docs: blueprint `/home/team/shared/feature-spec.md` · build order `/home/team/shared/build-order.md` · team workflow `/home/team/shared/WORKFLOW.md` · app conventions `AGENTS.md`.

## Commands

```bash
npm install        # install pinned deps
npm run typecheck  # tsc --noEmit
npm start          # expo dev server (iOS-first)
```

Env (later phases, not required now): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — never commit real values.
