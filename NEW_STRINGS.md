# Calm Quest — build 13 new strings (the "stay a while" layer)

**Status: OWNER-APPROVED AS WRITTEN (recorded during build 14).** Every string below is approved by the owner exactly as it appears here and ships verbatim. This section is CLOSED: build 14 does not re-edit or re-open any build-13 string — the strings build 14 adds or edits live under the build-14 heading further down this file, and `scripts/proof-keepsakes.js` checks the 41 rows below against the code (`scripts/proof-programs.js` owns the build-14 section).
**What build 13 is:** four read-only surfaces over content the app ALREADY stores on the device — the kept-glimpse archive (proposal §2 A), saved affirmations (§2 D), "Sit with a verse" (§2 I), and the "Kept this week" strip on Home (§2 H).
**Rules every string keeps:** written as fact · no hype · no congratulations energy · no urgency or scarcity · no medical framing · no guilt about streak or progress · verses always carry their attribution · growth metaphors are fine.
**What build 13 does NOT do:** no XP from any of these surfaces (browsing is not practice), no notification anywhere, nothing rotates, no new persistence, and no existing approved string changes — the paywall bullet "plus your whole archive" now has a real screen behind it, verbatim.
**How the proofs use this file:** `scripts/proof-keepsakes.js` parses the tables below, reads the file named in each section heading, and fails if a listed string is not in that file — or if a string in a screen's `COPY` block is missing from this file. The copied quote characters here are the typographic ones the app renders (’ “ ” — · ).

## 1. Kept screen — `src/screens/KeptScreen.tsx`

The archive (MY GLIMPSES) and the saved-affirmation collection, on one screen.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 1 | Header title | Kept |
| 2 | Header back row | ‹ Back |
| 3 | While the device state loads | Loading what you have kept… |
| 4 | Section label above the archive | MY GLIMPSES |
| 5 | Real count under the archive label (n = every kept glimpse on this device, not the visible slice) | `${n} kept` |
| 6 | VoiceOver hint on a kept row | Opens it for reading. Nothing here changes. |
| 7 | Gold gate line, free tier, exactly one glimpse beyond the last 7 | One more is part of Calm Quest+ — nothing you kept is lost. |
| 8 | Gold gate line, free tier, more than one beyond the last 7 | `The other ${n} are part of Calm Quest+ — nothing you kept is lost.` |
| 9 | Empty archive heading | Nothing kept here yet |
| 10 | Empty archive body | Your first kept glimpse lands here — one good thing, however small. |
| 11 | Empty archive button | Take today’s glimpse |
| 12 | Section label above the saved affirmations | SAVED AFFIRMATIONS |
| 13 | Real count under the affirmations label | `${n} saved` |
| 14 | One line under the saved affirmations (they are never gated) | These stay free — what you keep is yours. |
| 15 | Empty affirmations heading | No affirmations saved yet |
| 16 | Empty affirmations body | Save today’s affirmation and it will wait here for you. |
| 17 | A glimpse re-opened for reading | Kept as you wrote it. Reading it changes nothing. |
| 18 | Button back to the list from a re-opened glimpse | Back to everything kept |

The gold gate lines (7, 8) are followed by the app's existing invitation button — `See what Calm Quest+ includes` (row 38) — which opens the same paywall every other gated surface opens.

## 2. Home — "Kept this week" strip — `src/components/KeptThisWeekStrip.tsx`

One quiet card directly under the day's quest card. No badges, no "new" markers, no scroll, no notification.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 19 | Strip section label | KEPT THIS WEEK |
| 20 | Row meta, newest kept glimpse (prefixed by its real date, e.g. "17 Sep · ") | a glimpse kept |
| 21 | Row meta, most recently saved affirmation (the ledger stores no date for it, so none is invented) | an affirmation saved |
| 22 | Row meta, most recent completed quest (prefixed by its real date) | a quest completed |
| 23 | Strip with nothing kept yet | Nothing kept yet. Your first glimpse, affirmation or completed quest lands here. |
| 24 | Real counts under the rows (all three ledgers, nothing summed into one number) | `${g} glimpses · ${a} affirmations · ${q} quests kept` |
| 25 | Gold line into the archive, free tier | Everything you have kept |
| 26 | Gold line into the archive, Calm Quest+ (the whole archive) | Your whole archive |

## 3. Sit with a verse — `src/screens/SitWithVerseScreen.tsx`

Unlimited, zero-XP reading. Free = today's verse + a fixed evergreen ten; Calm Quest+ = all 60. Every verse renders with its reference, translation and attribution line.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 27 | Header title | Sit with a verse |
| 28 | Header back row | ‹ Back |
| 29 | Label above the plate when today's verse is open | TODAY’S VERSE |
| 30 | Label above the plate when a browsed verse is open | A VERSE YOU CHOSE |
| 31 | The one line of quiet guidance under the plate | Read it once, then once more — and let one word stay with you. |
| 32 | Honest count above the browse list (free: today's verse + the fixed ten, counted as unique verses; Calm Quest+: 60 of 60) | `${shown} of ${total} verses` |
| 33 | Gold line under the count, free tier | The rest of the library is part of Calm Quest+ — the day’s verse and ten evergreen ones stay open. |
| 34 | Section label above the browse list | BROWSE THE VERSES |
| 35 | Chip on the day's row in the browse list | today |
| 36 | Button back to today's verse after browsing | Back to today’s verse |
| 37 | Defensive empty-library line (unreachable while the bundle ships 60 verses) | The verse library is empty in this build. |

The gate line (33) is followed by the existing invitation button — `See what Calm Quest+ includes` (row 38).

## 4. The gold invitation button (REUSED, unchanged) — `src/components/PlusInvitation.tsx`

Not new copy: this is the exact label the app already ships on Home, in the Quest flow and in the Glimpse cap card. Build 13 reuses it verbatim through the same `UpgradeInvitation` door (gold tint, gold hairline, drawn chevron, no padlock, no urgency).

| # | Where it appears | String (verbatim) |
|---|---|---|
| 38 | Gold invitation button under the archive line (7/8) and the verse line (33) | See what Calm Quest+ includes |

## 5. Settings — the two doors — `src/screens/SettingsScreen.tsx`

Two plain rows (drawn chevron, no hue) that make both reading surfaces reachable from Settings as well as Home.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 39 | Section label | KEPT & READING |
| 40 | Row into the archive (same string as row 25 on Home) | Everything you have kept |
| 41 | Row into the verse reader (same string as row 27, its screen title) | Sit with a verse |

---

**Count:** 41 entries — 37 new distinct strings, 3 repeats of the same words on a second surface (rows 2/28, 25/40, 27/41), and 1 reused approved string (row 38).
**Owner decision recorded here:** the archive split is free = last 7 kept (proposal §6, option 1), which is why paywall bullet 3 stays verbatim; saved affirmations are never gated; every surface above grants zero XP.

---

# Calm Quest — build 14 new strings (three programs)

**Status:** every string below is NEW or EDITED copy written for build 14 and awaiting the owner's single copy pass (two-paths proposal §7: the UI strings in one pass, the longer content pass separately). Nothing here ships before that pass. The build-13 section above is untouched by this one.
**What build 14 is:** `profile.path` — already persisted, until now read by nothing — becomes the program a user rotates over. Three programs (Christian Mindset, Entrepreneur Mindset, Peace & Rest) share the five themes, the four quest types, the 30 gratitude prompts and the 60 verses. A free user holds ONE (and may change which, any day — fork (a), owner decision); Calm Quest+ holds all three at once. Nothing a user earned is affected by a switch.
**Rules every string keeps:** written as fact · no hype · no congratulations energy · no urgency or scarcity · no medical framing · no guilt about streak or progress · the Peace & Rest strings stay inside that program's guardrail header (everyday language only, promise the practice, never the result).
**Two strings keep the proposal's ASCII apostrophes on purpose (build-14 decision):** the picker's honest line (§3, row 50) and the routing note (§7, row 73) are copied byte-for-byte from `two-paths-proposal.md`, apostrophes included, so the proposal's wording can be diffed straight against the app. Every other string in the app uses the typographic ’.
**How the proofs use this file:** `scripts/proof-programs.js` parses the numbered tables below, reads the file named in backticks in each `## ` heading, and fails if a listed string is not in that file. `scripts/proof-keepsakes.js` parses ONLY the part of this file above the build-14 heading (its 41 rows), so the two waves are checked independently.

## 1. Program name — `src/content/themes.ts`

`PEACE_AND_REST_LABEL` is now the ONE place the Peace & Rest program's display name is written; `PATH_LABELS` points at it, so the picker, Home, Settings and the paywall can never disagree about it (proof: exactly one code occurrence in `src/`).

| # | Where it appears | String (verbatim) |
|---|---|---|
| 42 | The Peace & Rest program's display name, reused everywhere via `PATH_LABELS` | Peace & Rest |

## 2. Onboarding — three live rows — `src/screens/OnboardingScreen.tsx`

The two disabled "Coming soon" rows are now real radios. The approved badge moves from the hardcoded row to the SELECTED row; each row gains one one-liner. "You can change this anytime." was already approved and is finally literally true.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 43 | The badge on the selected path row (moved, not new) | You're in the right place |
| 44 | Sub-line, Christian Mindset row | Scripture-aligned quests, affirmations and gentle reflection. |
| 45 | Sub-line, Entrepreneur Mindset row | The same daily practice, for the life of building something. |
| 46 | Sub-line, Peace & Rest row | Comfort and quiet for the heavy days, at the pace you can keep. |

## 3. Program picker — `src/screens/ProgramsScreen.tsx`

Three rows, the held one marked; tap = switch. Real per-program quest counts. No padlocks: a row the user does not hold wears the gold "there is more here" grammar, and the switch itself is free.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 47 | Header title | Programs |
| 48 | Header back row | ‹ Back |
| 49 | Section label above the rows | CHOOSE YOUR PROGRAM |
| 50 | The one honest line under the section label (proposal §2, verbatim — ASCII apostrophe, see the note above) | Your streak, XP, levels and everything you've kept stay exactly as they are. |
| 51 | Chip on the row that is the user's program right now | YOUR PROGRAM |
| 52 | Real quest count on a row (that program's own pool only, never summed) | `${n} quest${n === 1 ? '' : 's'}` |
| 53 | Gold line under the rows, for anyone who does not hold all three | Calm Quest+ holds all three at once. Changing which one is yours is free, any day. |
| 54 | VoiceOver hint on a switchable row | Makes this your program. Nothing you have kept changes. |
| 55 | Alert title if the switch write fails | Could not switch your program |
| 56 | Alert body if the switch write fails | Your program is stored on this device — please try again. |

## 4. Home — the PROGRAMS card — `src/screens/HomeScreen.tsx`

The Themes card's grammar one level up, and a door to the picker (the rows open the picker; they never switch in place). De-jailed: real names at full contrast, the held program on the teal kept pair, the others on sand with the gold hairline and the already-approved "Included with Calm Quest+" line.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 57 | Card chip | PROGRAMS |
| 58 | Card title | A program for the season you’re in |
| 59 | Card subtitle, Calm Quest+ (holds all three) | All three are yours — switch any day, nothing resets. |
| 60 | Card subtitle, free (holds one) | The same five themes in each. Yours is the one your daily quest comes from. |
| 61 | Row mark, the program the user holds | Yours now |
| 62 | Row mark, a program the user does not hold (already-approved string) | Included with Calm Quest+ |
| 63 | Gold invitation line under the rows, free tier | Calm Quest+ holds all three at once. |
| 64 | VoiceOver label, held row | `${PATH_LABELS[p]}, your program` |
| 65 | VoiceOver label, row not held | `${PATH_LABELS[p]}, included with Calm Quest+` |
| 66 | VoiceOver hint on every row (they all open the picker) | Opens the program picker. |

## 5. Settings — the program door — `src/screens/SettingsScreen.tsx`

One plain section and one row (drawn chevron, no hue), with the held program's real name as the row's sub-line.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 67 | Section label | YOUR PROGRAM |
| 68 | Row into the picker | Choose your program |
| 69 | VoiceOver hint on the row | Opens the picker. Your streak, XP and everything you have kept stay as they are. |

## 6. Paywall — the program row and two edited strings — `src/screens/PaywallScreen.tsx`

The hero gains the three program marks above the five theme swatches (real availability from `programsFor`, gold ✦ grammar, no new hues). Bullet 1 is rewritten because "all five themes" understated three programs; the free strip now names the one-program rule. Bullets 2–3 stay verbatim.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 70 | Value bullet 1 (EDITED — was "All five themes, on demand") | All three programs, and every theme in each, on demand |
| 71 | The free strip (EDITED — now names the one-program rule) | Free, and staying free: the daily quest, Affirmation of the Day, one Glimpse a day, grace streaks, levels 1–5, and one program at a time — yours to choose. |
| 72 | Label above the program marks in the hero (the ✦ is the ornament, not copy) | PROGRAMS |

## 7. Peace & Rest content file — `src/content/programs/anxietyStress.ts`

Not a quest and not a screen string: the routing line renders once, as a vellum note on the picker screen, next to that program's row. Copied byte-for-byte from proposal §4 (ASCII apostrophes) and it is the only health-adjacent sentence the app ships.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 73 | Vellum routing note on the picker screen (`ROUTING_NOTE`) | Calm Quest is a companion, not care. If today is heavier than a companion can hold, please reach out to someone qualified — and if you're in crisis, a local crisis line. |

### Retired in build 14 — strings that left the app

Listed so the copy pass can see what went, not just what arrived. None of these render anywhere in build 14.

| String | Where it lived | Why it left |
|---|---|---|
| Coming soon | The chip on the two disabled onboarding rows (`ComingSoonChip`) | Both rows are real choices now — a program is no longer "later" |
| `${label} is coming soon` | Onboarding, `comingSoon()` alert title | The alert is gone: tapping a row SELECTS it |
| This path is on the way. For now, Christian Mindset is where the quests are — and it is yours for free. | Onboarding, `comingSoon()` alert body | Same alert, retired for the same reason |
| Anxiety & Stress Support | The spec's label for the third row (`PATH_LABELS`), never rendered live | Health-adjacent term in a listing that deliberately avoids health claims — in-app name is "Peace & Rest" (row 42) |

---

**Count:** 32 entries (rows 42–73) — 29 new distinct strings and 3 edits of strings the app already shipped (rows 70, 71, and row 43's badge, which MOVED from the hardcoded row to the selected row). 4 strings retired, listed above.
**Decisions recorded here:** free switching is live (fork (a), owner decision) — which is why the picker's gold line sells "all three at once" rather than "access to the others"; Home's PROGRAMS rows are doors to the picker, not in-place switches; the picker's row counts are real pool lengths, and `CONTENT_META` reads 1.1.0 with the two newer programs shipping seed sets until part 2 completes them; the two proposal-verbatim strings keep ASCII apostrophes.
