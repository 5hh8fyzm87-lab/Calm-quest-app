# Calm Quest — visual system (Visual-Richness Waves 1–3)

Companion to `/home/team/shared/visual-direction.md` (the owner-approved design spec).
This file is the **code-side contract** for the token retune and the drawn motifs, so
wave 3 (Onboarding / Paywall / Settings) reuses the same primitives instead of
inventing new ones.

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
node scripts/proof-wave2-visual.js        # Quest §3.3 / Glimpse §3.4 / overlay §4.3
node scripts/proof-wave3-visual.js        # Onboarding §3.1 / Paywall §3.5 / Settings §3.6 + a11y
node scripts/proof-settings-upgrade.js    # the Settings upgrade entry point (post-wave-3)
for f in scripts/proof-phase*.js scripts/qa-*.js; do node "$f" || echo "FAILED $f"; done
```

`scripts/proof-wave1-visual.js` invokes the motif components and traverses their element
trees, so it fails if a mark loses its accessibility hints, a grace drop stops matching
`graceRemaining`, the vine loses its 15 gold gate marks, or the gated theme label loses
its invitation copy.

`scripts/proof-wave2-visual.js` does the same for the wave-2 art and additionally
traverses the **level-up overlay** (the blessing is asserted against
`levelTitleInfo(n).blessing`, the title against a 34px serif style, the CTA as the only
button), so it fails if the bloom stops being a single ≤1.2s fade, the overlay stops
being full-screen, a saved Glimpse stops gaining its leaf (0 → 1), or any red/confetti
sneaks in. `LightBloom` is the one hook-owning mark: the traversal records it as a leaf
instead of invoking it, and its contract is asserted from `BLOOM_MS` / `BLOOM_LAYERS` +
source.

`scripts/proof-wave3-visual.js` (127 checks) renders the wave-3 art — the five-theme
swatch row built from the **real** gate derivation (`visibleThemes` + `THEME_LABELS`) so
the money screen cannot advertise a theme the user already has as "not theirs", the
miniature strip, the "Coming soon" chip, the section head, the bell / note / chevron
glyphs and the hollow sprout — and traverses their trees for the palette, the WCAG
floors it computes itself (`inkSoft` on `sand` = 5.17:1; the chip label on `card` =
6.38:1), the no-opacity-jail rule and the a11y contract (art hidden, real strings
announced). Screen-level checks are structural (the screens own hooks): plan-card
selected/unselected style pairs, tier chips, section heads, the verbatim approved copy
(with `\uXXXX` escapes decoded, so a copy edit fails the proof), Reduce Motion (wave 3
adds **no** motion), the safe-area contract and XXXL survival (no `numberOfLines`, no
fixed heights, no clamped text on any of the three screens).

---

# Wave 2 — the peak moments (§3.3 Quest · §3.4 Glimpse · §4.3 level-up overlay)

Presentation only: grace rules, XP, the paywall, timers, navigation and every approved
string are untouched. The two screens keep their `screenInsets` on every scroll
container (asserted by the proof).

## New primitives (`src/theme/motifs.tsx`)

| Export | What it draws |
|---|---|
| `TickRing({ lit, total, size, radius, tick, color, trackColor })` | the ambient tick ring — radial hairlines, `lit` of them in the focus hue, the rest `rule`. Used twice: the Glimpse ring (`tick 4`) and the Pause plate (`tick 3`). Static: it redraws from real elapsed seconds; nothing breathes or pulses. |
| `KeptSeal({ size, tone })` | a calm ring holding the drawn check (`CheckMark`, never a ✓ glyph); `sage` = kept, `gold` = value. Replaces the old `✓` text on both done cards. |
| `StemMark({ leaves, bud, size, color })` | a small stem whose drawn leaf count is the honest count: `bud: true, leaves: 0` is the Glimpse bud at the ring's base; `leaves: 1` is the same mark after a save / after a completed quest. |
| `LightBloom({ color, size, style })` | the one motion device in the app: a single `Animated` opacity fade over `BLOOM_MS = 900`, layered translucent discs standing in for a gradient. No loop, no particles, no sound; under Reduce Motion `isReduceMotionEnabled()` settles it instantly so nothing moves. |
| `LevelUpOverlay({ level, title, blessing, tierNote, dismissLabel, onDismiss })` | the full-screen peak moment: paper field, one bloom, `LEVEL n` chip, a 120px `StageGlyph`, a `goldBright` hairline + ✦, the title in serif 34px, the blessing, the tier note, one ghost CTA. **All copy arrives as props** — the art file never invents product text. |

`Ornament` gained an optional `ruleColor` (default `rule`) so the peak moment can carry
the same hairline in `goldBright`.

## The screens

- **QuestScreen** grid: the theme chip is filled with its own `tint`/`deep`, the type chip
  stays neutral (`sand` + `inkSoft`), the title is `typeScale.display` (serif 26). The
  verse plate is `vellum` + 3px theme rule + `typeScale.readingLg` (serif italic 19) +
  small-caps reference + `goldBright` ✦, attribution verbatim. Selected check-in rows take
  the theme accent/tint with a **filled leaf** in `deep`; the Act pill fills with the
  theme tint and draws a leaf; Pause digits sit in a soft stillness plate ringed by
  `TickRing` (no breath framing anywhere); the Write input is a `vellum` sheet with a
  theme hairline and a theme accent on focus. The completion card is `KeptSeal` (sage) +
  a gold `+50 XP` pill + a stem with the leaf it just gained.
- **GlimpseScreen**: the ring's lit ticks are gratitude amber and settle to **sage** when
  the minute completes; the track is `rule` hairlines; one amber wash (30%) sits behind
  the ring; a bud at the ring's base gains its leaf on save; the prompt is serif 20 with
  a ✦ above it; the entry box and the shown-back entry are `vellum` keepsakes with the
  theme left rule. Cap/gate states keep their exact copy, the Calm Quest+ line moves onto
  a `goldTint` strip and the ghost CTA gets a gold hairline. No confetti, no sound cue,
  no countdown bar, and the ring is never red.
- **Level-up overlay** is rendered by `QuestScreen` only when a real level-up happened
  (`result.leveledUp && !result.levelGated` — the free gate keeps its own card), as an
  absolute layer over the scroll body. Dismissing it runs the same
  `leaveAfterCompletion()` as before, so the one-time paywall still fires first when it
  was queued.

### Deliberate reads of the spec (worth knowing)

1. **Pause plate = stillness, always.** §3.3.3 names stillness blue for the Pause digits,
   and a Pause quest's own theme is not always `stillness`. The plate therefore uses
   `themeAccents.stillness` on every pause quest, giving that screen the day's theme plus
   stillness — and no gold ornament is added to the pause body, so the pair stays quiet.
2. **Glyphs became drawn art.** The `✓` in both done cards and in the Act pill is gone
   (the design keeps exactly two typographic marks, ✦ and ⚙︎); it is replaced by
   `KeptSeal`/`Leaf`. Prose is untouched: the Act label still reads "I did it".
3. **The XP pill splits one line.** The completion card now shows `+50 XP` as the gold
   pill and the frozen streak line beneath it, so `STREAK_MESSAGES.secured(n)` renders
   byte-identically ("Day N secured — whenever you're ready") without the old `·`
   separator.

---

# Wave 3 — the last three screens (§3.1 Onboarding · §3.5 Paywall · §3.6 Settings) + the a11y sweep

Presentation only, again: the onboarding flow and its storage path, every gate, the
purchase seam, the reminder scheduler, the delete-my-data path and every approved string
behave exactly as before. The only **copy** changes in the whole app are the two the owner
approved — the visible `Coming soon` chip on the two disabled onboarding rows, and (Sep
2026, post-wave-3) the Settings upgrade label `Upgrade to Calm Quest+`.

## New primitives (`src/theme/motifs.tsx`)

| Export | What it draws |
|---|---|
| `SectionHead({ label, style })` | a section label: the string in `typeScale.smallCaps` `inkFaint` **as real text** with `accessibilityRole="header"`, over a 24px `GoldRule`. Real text, so it is *not* hidden from assistive tech — VoiceOver's rotor can jump between sections. |
| `GoldRule({ width, color, style })` | the 24px `goldBright` hairline (`GOLD_RULE_WIDTH`), a hidden mark. |
| `ComingSoonChip({ label, style })` | the one approved copy addition: `card` fill + `paperEdge` hairline + `sandText` (`inkSoft`, full opacity) so it stays ≥4.5:1 on a `sand` row. Not hidden — VoiceOver reads it. |
| `BellMark({ size, disc, color })` / `NoteMark(...)` | the reminder card's bell and the sound card's note, drawn from `View`s in a `tealTint` disc with the mark in `tealDeep` (a `tealTint` mark on `card` would be ~1.05:1). No emoji. |
| `ChevronMark({ size, color, stroke })` | the legal rows' "more" mark: a rotated corner in neutral `inkFaint`, replacing the `›` glyph so the app keeps exactly two typographic marks (✦ and ⚙︎). |
| `ThemeSwatchRow({ items, size })` | the paywall hero: five discs, each **filled with its own real `tint`** and a filled leaf in its `deep` when the user holds that theme, or **that same tint at `GATED_TINT_ALPHA` (0.55) + a `goldBright` hairline + an outline-only leaf** when they do not — the same grammar Home uses for gated themes. Names are the real `THEME_LABELS`. |
| `ThemeSwatchStrip({ items, size })` | the Settings mini-echo: the same availability in 12px marks, purely decorative (the tier chip and tier line say it in words). |
| `ThemeSwatchItem` (type) | `{ theme, name, available }` — the shape both components take as props. **Neither component derives availability itself**: the screen owns the `visibleThemes()` derivation, so the art can never disagree with the gate. |

`Sprout` gained `hollow` (outline-only stem + leaves) for the two coming-soon path rows.

## The screens

- **OnboardingScreen (§3.1).** Dawn hero band: one purpose-gold `Wash` clipped to the
  band, a `rule` horizon hairline running behind the `CALM QUEST` badge, a drawn
  `goldDeep` sprout above the serif-32 headline; the band has **no fixed height** so it
  grows with Dynamic Type. Path rows get real grammar: live = `card` + 3px `teal` left
  edge + `tealTint` glyph disc + the gold "You're in the right place" chip; coming-soon =
  `sand` fill + `card` disc + the hollow sprout + the visible "Coming soon" chip. The old
  `opacity: 0.62` jail (which failed 4.5:1) is gone — availability is carried by the fill
  and the glyph weight; the label is full-opacity `inkSoft` (5.17:1 on `sand`). Disabled
  rows draw no radio at all (a disabled row is not an unselected choice); their a11y role
  and `disabled` state are unchanged. Fine print is a `vellum` note with a hairline left
  rule; the CTA keeps its single quiet pill, with a hairline above the hint.
- **PaywallScreen (§3.5).** The **five-theme swatch row is the hero** — on a `raised`
  card, above the value card — and it is built from `visibleThemes()` + `THEME_LABELS`,
  so it shows the user's real set. The value card's three bullets each sit on a
  `goldBright` ✦ with a hairline `rule` divider between them, and the free-forever note
  (copy verbatim) becomes an "already yours" `sand` strip. Plan cards: selected = `card`
  + 2px `teal` border + `flat` elevation, unselected = `paper` + 2px `sand` border (same
  border **width** in both states, so selecting never shifts the layout); the badge moved
  to the gold family and stays descriptive. Honest-state boxes keep `paperDeep` + a
  neutral `inkFaint` status dot — never red, because nothing was charged.
- **SettingsScreen (§3.6).** Still the quietest page: five `SectionHead`s (small-caps over
  a gold hairline) replace the old `cards.label` strings, every card takes the `flat`
  shadow, the reminder card gains the drawn bell and the sound card the drawn note, the
  Calm Quest+ card carries a 3px `goldBright` top edge with the filled tier chip
  (`PLUS` gold / `FREE` sand) and the mini swatch strip, the legal rows use the drawn
  chevron, and the delete row is the only place `brick` appears (text only). The title
  takes `flex: 1` + centred so it wraps at XXXL between its two spacers. Since Sep 2026 a
  FREE user's card also holds the upgrade door (below).

## The accessibility sweep (all three screens)

- **VoiceOver labels on functional elements:** every path row is a `radio` with
  `selected`/`disabled` state; every plan card is a `radio` with `selected` state; both
  paywall CTAs and all Settings rows are `button`s; the two toggles are `switch`es with
  labels and honest hints; each swatch name carries `"<Theme>, available"` or
  `"<Theme>, included with Calm Quest+"`; section labels are `header`s; the trial CTA
  reports `disabled` while the store sheet is open and the delete row while it is wiping.
- **Decorative hidden:** every drawn mark is a `Mark` (`accessibilityElementsHidden` +
  `importantForAccessibility="no-hide-descendants"` + `pointerEvents="none"`), and the
  three inline pieces of wave-3 decoration (the hero horizon, the CTA rule, the paywall
  status dot) keep the same contract. Real strings are never hidden — the "Coming soon"
  chip and the section labels stay announced.
- **Dynamic Type XXXL:** no `numberOfLines`, no `allowFontScaling={false}`, no
  `maxFontSizeMultiplier` on any of the three screens; the new containers are
  content-sized (hero band, swatch row's `flex: 1` items with wrapping names, section
  heads with no fixed height) and the Settings title wraps instead of overflowing.
- **Reduce Motion:** wave 3 adds **no motion at all**. `LightBloom` (wave 2) remains the
  app's only animated device and still consults `AccessibilityInfo.isReduceMotionEnabled`.

---

# Post-wave-3 — the Settings upgrade entry point (owner request, Sep 2026)

After the build-11 device review the owner found a real gap: a FREE user's Settings Calm
Quest+ card named their tier and showed which themes they held, but the only route to the
paywall ran through gated content. The card now carries **one** upgrade affordance, and
nothing else on the screen changed.

| Piece | What it is |
|---|---|
| `src/components/UpgradeInvitation.tsx` | The door: a `Pressable` built on `buttons.ghost`, so it keeps secondary-CTA parity with the Restore / Manage rows it sits above. `goldTint` paint under a 1px `gold` hairline, label in `goldDeep` (5.58:1 on the fill, 6.19:1 on `card`), trailing `ChevronMark` in `goldDeep`. Hooks-free, stateless, and copy-free — the label is a prop, the tap is forwarded, and it owns no purchase logic. |
| Settings COPY | `upgrade: 'Upgrade to Calm Quest+',` — the one approved copy addition, in exactly one file in `src/`. |
| Settings render site | `{loaded && tier === 'free' ? <UpgradeInvitation … /> : null}`, between the mini swatch strip and the Restore / Manage rows. PLUS users render no upgrade affordance at all — not even for the instant before the first load resolves, because the persisted tier is a precondition. |
| Settings handler | `onUpgrade()` — one `navigation.navigate('Paywall', { source: 'growth' })`, the same route + source the gated content (Home's gated theme rows, the Quest / Glimpse gates) already uses. `source: 'auto'` is never used from Settings: that surface belongs to the post-3rd-loop modal alone. The paywall file, its flow, the gates, IAP and grace rules are untouched. |

Two design notes worth keeping:

1. **Height parity, not a bigger button.** The 1px hairline is paid back out of the vertical
   padding (14 − 1), so the invitation is exactly the same height as the ghost rows under
   it. An invitation, not a louder CTA — no urgency, no badge, no countdown, no padlock.
2. **A purchase needs no restart.** The card's tier is read from the persisted snapshot
   inside `useFocusEffect`, and a verified purchase still lands through the single honest
   writer (`runTrialFlow` → `applyEntitlement` → `saveState`). Returning to Settings after a
   successful purchase therefore re-renders as PLUS on its own. That behavior is pre-existing
   and is *verified*, not rebuilt: `scripts/proof-settings-upgrade.js` (30 checks, added with
   the door) asserts both halves of the chain plus the render contract — the button's role and
   exact accessible name, the hidden chevron, the gold family, the computed contrast floors,
   the tap forwarding, the FREE-only guard, the unchanged PLUS rows and the shared paywall
   route.


