# Calm Quest — visual system (Visual-Richness Wave 1)

Companion to `/home/team/shared/visual-direction.md` (the owner-approved design spec).
This file is the **code-side contract** for the token retune and the drawn motifs, so
waves 2–3 (Quest / Glimpse / level-up overlay; Onboarding / Paywall / Settings) reuse
the same primitives instead of inventing new ones.

## Hard constraints (owner decisions, Sep 2026)

- **No new dependencies.** No `react-native-svg`, no `expo-linear-gradient`, no custom
  fonts. All art is plain `View`/`Text`. (Guarded by `scripts/proof-wave1-visual.js`.)
- **No behaviour change, no copy change.** Grace rules, XP, paywall, navigation and every
  approved string are frozen; wave 1 is presentation only.
- **Two hues per screen** (the day's theme + gold), one wash per screen, no pure
  white/black, accents are decoration only, state always uses a `deep`.

## Tokens (`src/theme/colors.ts`)

| Token | Value | Job |
|---|---|---|
| `paper` / `paperDeep` / `vellum` / `card` | `#FCF9F4` / `#F4EEE3` / `#FBF7EE` / `#FFFDFA` | page, alt fills, reading surfaces, card surface |
| `paperEdge` / `rule` | `#EAE2D3` / `#E3DAC7` | card hairline / dividers + ornament rules |
| `sand` | `#EDE5D6` | disabled + chip fills |
| `ink` / `inkSoft` / `inkFaint` | `#26312C` / `#55615A` / `#7C877F` | body+headings / secondary / dateline (large text & decoration only) |
| `teal` / `tealDeep` / `tealTint` | `#0E7A72` / `#0A5F59` / `#DCEBE6` | **action**: buttons, switches, selected |
| `sageTint` / `sageMark` / `sageDeep` | `#E9F0E2` / `#7D8F6E` / `#4F6B45` | **kept/grown**: done card, kept seal |
| `goldTint` / `gold` / `goldDeep` / `goldBright` | `#FAF1D9` / `#B98A2F` / `#7A5B1F` / `#C9A227` | **value/light**: XP pill, Calm Quest+ chips, ornament |
| `noticeTint` / `noticeDeep` | `#EEEAF4` / `#4C4269` | **gentle notice (grace)** — replaced `softCoral` |
| `brick` | `#9E4B3F` | **destructive, text only** — the Settings "Delete my data" row |

Renames from the pre-wave-1 palette: `cream→paper`, `creamDeep→paperDeep`,
`white→card`, `border→paperEdge`, `tealSoft→tealTint`, `sageSoft→sageTint`,
`sage→sageMark`. `softCoral` is gone: Home's streak-reset chip now uses the violet
`notice` family (§1c), and Settings' delete row uses `brick` (its own job).

`themeAccents[theme]` carries `{ tint, accent, deep, wash }` per theme — `accent` is
paint only, `deep` is the only one allowed to carry text or state (every `deep` is
≥ 4.5:1 on its own `tint`; the proof suite asserts this). `withAlpha(hex, a)` builds
`rgba()` — used for gated rows (theme tint at `GATED_TINT_ALPHA = 0.55`) so text on top
keeps full contrast instead of sitting inside an opacity jail.

## Type, elevation, spacing (`src/theme/styles.ts`)

- `serifFamily` = `Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' })`.
- `typeScale.display` 26px serif · `typeScale.reading` serif **italic** 17px/25
  (verses, affirmations, glimpse prompts/entries, blessings) · `typeScale.smallCaps`
  (datelines, chips, meta) · `typeScale.ornament` (the single `goldBright` ✦).
- `shadows.flat` (y2/r8 @4%) · `shadows.card` (y6/r16 @7%, the default) ·
  `shadows.raised` (y12/r28 @10% — **only** today's quest card, the level-up overlay,
  the paywall hero). `cards.card` already carries the default weight + hairline.
- `radii.hero = 20` (today's quest card).

## Motifs (`src/theme/motifs.tsx`)

All marks are decorative: each is wrapped in `Mark`, which sets
`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"` and
`pointerEvents="none"`. They are static (no animation), so nothing needs a
Reduce-Motion gate in this wave.

| Export | What it draws |
|---|---|
| `Wash({ color, size, opacity })` | one soft bloom (the theme's `wash` rgba); Home's header uses `opacity={0.3}`, clipped by the header band |
| `Ornament()` | hairline `rule` + `goldBright` ✦ |
| `Leaf({ size, color, rotate, hollow })` | a leaf; `hollow` = outline only |
| `CheckMark({ size, color, stroke })` | the kept/done check, drawn as a rotated `-45°` bordered View (never a `✓` glyph) |
| `Sprout({ size, color })` | stem + two leaves |
| `StageGlyph({ stage, size, color })` | `seed` · `sprout` · `rooted` · `shelter` |
| `LevelSeal({ level, size, tone })` | 1.5px `rule` ring holding the held stage glyph, with the **next** stage ghosted at 25% behind it |
| `VineMeter({ pct, showGate })` | 4px stem, leaf marks at 25/50/75%, a bud that fills `goldBright` as XP accrues; free users get a gold-outlined region of 15 hollow marks (L6–20) |
| `StreakSprig({ days, graceRemaining, inGrace, resetDay, size })` | the header plant |

Pure helpers (also unit-checked): `stageForLevel` / `nextStageForLevel` (Seed L1–5,
Sprout L6–10, Rooted L11–15, Shelter L16–20 — the free tier is a *complete* stage),
`streakStage` (0 seed · 1–2 seedling · 3–6 two leaves · 7–29 stem+bud · 30–99 first
branch · 100+ three leaves), `LEAF_MARKS`, `GATED_LEVEL_MARKS = 15`.

Monotone-growth rule: nothing shrinks. Grace draws the stem **hollow** with up to three
water drops filled from the real `graceRemaining`; a reset day is a seed in soil with a
dusk-violet halo. No withered plant, no broken chain, no flame, no red anywhere.

## Verifying

```bash
npx tsc --noEmit
node scripts/proof-wave1-visual.js        # tokens + contrast + rendered motif trees
for f in scripts/proof-phase*.js scripts/qa-*.js; do node "$f" || echo "FAILED $f"; done
```

`scripts/proof-wave1-visual.js` invokes the motif components and traverses their element
trees, so it fails if a mark loses its accessibility hints, a grace drop stops matching
`graceRemaining`, the vine loses its 15 gold gate marks, or the gated theme label loses
its invitation copy.
