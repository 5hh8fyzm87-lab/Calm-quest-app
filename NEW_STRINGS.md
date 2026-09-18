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

---

# Calm Quest — build 14 — part 2 (content): the two newer programs' quests and affirmations

**Status:** NEW copy authored for part 2 of build 14, awaiting the owner's single copy pass (two-paths proposal §7 batches it as its own content pass). Nothing here ships before that pass. The build-14 UI section above is untouched by this one, and the build-13 section above that stays closed.
**What part 2 is:** the content half of build 14. Part 1 (merged) built the gateway — pools, gates, the picker, its own manifest. Part 2 fills the two newer programs from their five-quest / five-affirmation seeds to the bundle size the owner approved (proposal §5, Option A): **20 quests and 20 affirmations in each** — five quests of each type, four quests and four affirmations per theme. The Christian bundle is untouched (60 quests / 75 affirmations), and the shared assets stay shared: 30 prompts and the 60 WEB verses, with every Read & Reflect quest pointing at a verse already in that library — no new verse text, no new translation, no new licensing.
**Rules every string keeps** (each file's header comment carries them in full, and they are the checklist this copy was written against): *Entrepreneur Mindset* — written as fact · no hype or hustle language · no guaranteed outcomes · no business, financial or legal advice · no money or metric claims · no streak-guilt · steady stewardship, never grind worship. *Peace & Rest* — everyday emotional language only (heavy days, restless nights, worry, a racing mind, carrying too much, resting, being gentle with yourself) · never a health or outcome claim, no scores, no before/after · comfort, rest, trust, breath, sabbath rest, setting burdens down · the practice is promised, never the result. Titles are six words or fewer; every affirmation is one sentence.
**IDs:** `q-entrepreneur-01…20` / `aff-entrepreneur-01…20` and `q-peace-01…20` / `aff-peace-01…20`. The part-1 seed is the first five entries of each array (`…-01` through `…-05`), kept byte-for-byte; part 2 added `…-06` through `…-20`.
**Check-in chips:** the three chips on a Read & Reflect quest (rows below list the quest's title and its body; the chips are the same words the app already ships — Peace · Calm · Rest · Steady · Trust · Hope · Courage · Gentle · Grateful, plus the part-1 seed's "Purpose" chip). Part 2 adds no new chip word, and `scripts/proof-programs.js` fails if one appears.
**How the proofs use this section:** `scripts/proof-programs.js` parses the numbered tables below exactly as it parses the UI section — it reads the file named in backticks in each `## ` heading and fails if a listed string is not verbatim in that file. In the other direction, it walks every rendered quest and affirmation field of both programs and fails if any of them is missing from this file (120 strings, both ways).

## 1. Entrepreneur Mindset — 20 quests — `src/content/programs/entrepreneur.ts`

Each quest contributes two rows: its title, and its one body line (a reflection, an action prompt, a pause prompt or a journal prompt — named in the "where" column). Work, diligence, stewardship and perseverance are the lane; the Read & Reflect entries are anchored to verses from the shared library.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 74 | q-entrepreneur-01 · title | Commit the work |
| 75 | q-entrepreneur-01 · reflection | A plan is a small act of hope. You can hand the outcome over and still do today’s work well — the doing is yours, the results were never fully in your hands. |
| 76 | q-entrepreneur-02 · title | The long game |
| 77 | q-entrepreneur-02 · actionPrompt | Choose the one thing that will still matter in a year and give it twenty unhurried minutes today. Slow work is still work, and no one is watching this part. |
| 78 | q-entrepreneur-03 · title | The small win |
| 79 | q-entrepreneur-03 · actionPrompt | Name one thing that went right today, however small — a reply that came, a page filled, a problem that finally made sense. Let it count before you move on to the next thing. |
| 80 | q-entrepreneur-04 · title | Not by burning out |
| 81 | q-entrepreneur-04 · pausePrompt | One minute with nothing to build. The work will still be there. |
| 82 | q-entrepreneur-05 · title | A launch that failed |
| 83 | q-entrepreneur-05 · journalPrompt | Write one line about something that did not work out, and one honest thing it taught you. One line is enough — this is not a post-mortem. |
| 84 | q-entrepreneur-06 · title | One honest next step |
| 85 | q-entrepreneur-06 · actionPrompt | Take the smallest real step toward the thing you are building — a message sent, a page written, a question asked — and let that be today’s work. The next step is yours to take; the whole road was never yours to see. |
| 86 | q-entrepreneur-07 · title | One minute off the clock |
| 87 | q-entrepreneur-07 · pausePrompt | One minute where nothing is being built, sold or measured. The work waits, and it will still be yours when you come back. |
| 88 | q-entrepreneur-08 · title | What this is for |
| 89 | q-entrepreneur-08 · journalPrompt | Write one line about why this work matters to you — the honest reason, not the polished one. One line is enough, and no one else reads it. |
| 90 | q-entrepreneur-09 · title | A due season |
| 91 | q-entrepreneur-09 · reflection | Nothing here sets a timeline. A due season is one you do not get to schedule — only to keep working through, without giving up on the work itself. |
| 92 | q-entrepreneur-10 · title | Slow is still moving |
| 93 | q-entrepreneur-10 · pausePrompt | Sixty seconds with nothing to check. The work does not need you to be in a hurry, and neither does today. |
| 94 | q-entrepreneur-11 · title | Something not yet ready |
| 95 | q-entrepreneur-11 · journalPrompt | Write one line about something you are building that is not ready yet — and one honest thing it needs from you this week. |
| 96 | q-entrepreneur-12 · title | Whatever you do |
| 97 | q-entrepreneur-12 · reflection | The verse puts giving thanks inside the work itself, not at the end of it. There is something to be glad of on an ordinary working day, before anything is finished. |
| 98 | q-entrepreneur-13 · title | A minute of noticing |
| 99 | q-entrepreneur-13 · pausePrompt | For one minute, notice what is already working — a tool that holds, a person who replied, the plain fact that you are still here doing this. |
| 100 | q-entrepreneur-14 · title | A quiet thank-you note |
| 101 | q-entrepreneur-14 · journalPrompt | Write one line of thanks to someone who made your work easier this week — you do not have to send it. |
| 102 | q-entrepreneur-15 · title | Rest is not falling behind |
| 103 | q-entrepreneur-15 · reflection | The verse names the exact thing that keeps a founder up late — watching someone else prosper while you wait — and answers it with rest, not with a faster pace. |
| 104 | q-entrepreneur-16 · title | One unplugged hour |
| 105 | q-entrepreneur-16 · actionPrompt | Take one hour today with no building and no comparing — no metrics, no scrolling, no catching up. Do something that has no outcome at all, and let that be the point. |
| 106 | q-entrepreneur-17 · title | What rest felt like |
| 107 | q-entrepreneur-17 · journalPrompt | Write one line about the last time you truly rested — what it felt like, and what made it hard to stop. |
| 108 | q-entrepreneur-18 · title | Compassion, again |
| 109 | q-entrepreneur-18 · reflection | The compassion in this verse is something that keeps coming back — again, and again. What you are still holding against yourself does not have to be carried into the next season. |
| 110 | q-entrepreneur-19 · title | Let one person off |
| 111 | q-entrepreneur-19 · actionPrompt | Think of one person who let you down — a slow reply, a promised thing that never came — and quietly let them off the hook today. Not for their sake: for the room it makes in you. |
| 112 | q-entrepreneur-20 · title | Put the ledger down |
| 113 | q-entrepreneur-20 · pausePrompt | One minute of not keeping score — the numbers, the comparisons, the things you owe or are owed. Set the ledger down. It will keep. |

## 2. Entrepreneur Mindset — 20 affirmations — `src/content/programs/entrepreneur.ts`

Four affirmations per theme (gratitude, stillness, purpose, forgiveness, patience), one sentence each.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 114 | aff-entrepreneur-01 · text | Small progress is still progress, and I can be glad of it before it is finished. |
| 115 | aff-entrepreneur-02 · text | My worth is not measured by what I shipped today. |
| 116 | aff-entrepreneur-03 · text | The work in front of me is mine to do well, not to control the outcome of. |
| 117 | aff-entrepreneur-04 · text | A thing that failed is not the same as a person who failed. |
| 118 | aff-entrepreneur-05 · text | Good work takes the time it takes, and I can stay with it. |
| 119 | aff-entrepreneur-06 · text | Something good turns up in ordinary working hours, and I can notice it. |
| 120 | aff-entrepreneur-07 · text | I can be glad of today’s work without waiting for it to amount to something. |
| 121 | aff-entrepreneur-08 · text | Building slowly is still building, and I can be thankful for the pace I keep. |
| 122 | aff-entrepreneur-09 · text | I can stop for an hour without the work falling apart. |
| 123 | aff-entrepreneur-10 · text | Rest is part of the work, not a break from it. |
| 124 | aff-entrepreneur-11 · text | One unhurried minute is allowed, even in the middle of a launch. |
| 125 | aff-entrepreneur-12 · text | One faithful step is enough for today, even when the whole path is unclear. |
| 126 | aff-entrepreneur-13 · text | What I am building can be done with a whole heart, quietly. |
| 127 | aff-entrepreneur-14 · text | I do not have to know how it ends to keep going. |
| 128 | aff-entrepreneur-15 · text | I can learn from something that did not work without becoming its judge. |
| 129 | aff-entrepreneur-16 · text | I can let myself off the hook for what I could not have known. |
| 130 | aff-entrepreneur-17 · text | There is room for another attempt, and for being kind to myself in the meantime. |
| 131 | aff-entrepreneur-18 · text | The season I am in is a season, not a verdict. |
| 132 | aff-entrepreneur-19 · text | Something is growing even when it looks quiet from the outside. |
| 133 | aff-entrepreneur-20 · text | I can wait for the due season without working myself ragged. |

## 3. Peace & Rest — 20 quests — `src/content/programs/anxietyStress.ts`

The non-clinical program: everyday language for heavy days, and a practice offered rather than a result. Every string here passes the file's guardrail header (the proof re-checks all of them on comment-stripped source).

| # | Where it appears | String (verbatim) |
|---|---|---|
| 134 | q-peace-01 · title | When the mind races |
| 135 | q-peace-01 · reflection | A racing mind is not a failure of faith. This verse does not ask you to stop the thoughts — only to let one steady thing hold you while they pass. |
| 136 | q-peace-02 · title | A minute of quiet |
| 137 | q-peace-02 · pausePrompt | Nothing to fix in this minute. Just this one minute, as it is. |
| 138 | q-peace-03 · title | One good thing noticed |
| 139 | q-peace-03 · actionPrompt | Notice one ordinary good thing today — warm water, a chair that holds you, a voice you like. Noticing is not pretending: it sits beside the hard thing instead of replacing it. |
| 140 | q-peace-04 · title | Being gentle with yourself |
| 141 | q-peace-04 · journalPrompt | Write one line you would say to a friend in your place. Then let it be said to you too. One line is enough. |
| 142 | q-peace-05 · title | Carrying too much |
| 143 | q-peace-05 · actionPrompt | Put down one thing today that is not yours to carry: a worry for later, one task, one expectation. Setting something down is allowed, and nothing here is lost by it. |
| 144 | q-peace-06 · title | Be still and know |
| 145 | q-peace-06 · reflection | The verse asks for no working-out and no plan — only a moment of stopping to remember who is holding all of it. Nothing is required of you here except the stillness itself. |
| 146 | q-peace-07 · title | Nothing to carry here |
| 147 | q-peace-07 · pausePrompt | One minute with nothing to hold — no decisions, no mending, no preparing the next thing. Let the minute be empty on purpose. |
| 148 | q-peace-08 · title | A gentler tomorrow |
| 149 | q-peace-08 · journalPrompt | Write one line about one thing that would make tomorrow lighter — not a list, not a plan, just one line. |
| 150 | q-peace-09 · title | Quietly waiting |
| 151 | q-peace-09 · reflection | Hoping quietly is allowed to take time. This verse does not ask you to hurry your heart along — only to let hope stay with you while you wait. |
| 152 | q-peace-10 · title | One thing left for later |
| 153 | q-peace-10 · actionPrompt | Choose one thing you were going to push through today and leave it for tomorrow instead. Some things go better rested, and letting them wait is allowed. |
| 154 | q-peace-11 · title | What is taking time |
| 155 | q-peace-11 · journalPrompt | Write one line about something that is taking longer than you hoped — and one kind thing you can say to yourself about the wait. |
| 156 | q-peace-12 · title | Every good gift |
| 157 | q-peace-12 · reflection | Whatever good is in today arrived as a gift rather than a wage. Noticing that does not deny the hard parts of the day — it just names what was given, including the plain things. |
| 158 | q-peace-13 · title | A minute for one good thing |
| 159 | q-peace-13 · pausePrompt | For one minute, give your whole attention to one small good thing — a warm drink, a blanket, a light left on — and let it be enough for now. |
| 160 | q-peace-14 · title | One ordinary good thing |
| 161 | q-peace-14 · journalPrompt | Write one line about something ordinary that was good today, however small it seems. Ordinary counts. |
| 162 | q-peace-15 · title | A weight already lifted |
| 163 | q-peace-15 · reflection | Being forgiven is spoken of here as a weight lifted, not a debt still owed. Whatever you are still holding against yourself, this verse does not ask you to keep carrying it. |
| 164 | q-peace-16 · title | Say one kind sentence |
| 165 | q-peace-16 · actionPrompt | Say one kind sentence to yourself today — out loud if you can — the way you would say it to a friend in your place. Kindness aimed inward counts the same as kindness aimed out. |
| 166 | q-peace-17 · title | Softer than you think |
| 167 | q-peace-17 · pausePrompt | One minute to notice where you are bracing — a jaw, a shoulder, a breath held high — and to let it be softer than it has been. |
| 168 | q-peace-18 · title | Ten minutes without the phone |
| 169 | q-peace-18 · actionPrompt | Put the phone in another room for ten minutes today and leave it there. Nothing that arrives in ten minutes needs you before you have had them. |
| 170 | q-peace-19 · title | One long, slow out-breath |
| 171 | q-peace-19 · pausePrompt | Let one breath out take its time, longer than the breath in. Then let the next one do the same. |
| 172 | q-peace-20 · title | What the day held |
| 173 | q-peace-20 · journalPrompt | Write one line about what today held — no tidying it up, no making it sound better than it was. |

## 4. Peace & Rest — 20 affirmations — `src/content/programs/anxietyStress.ts`

Four affirmations per theme, one sentence each.

| # | Where it appears | String (verbatim) |
|---|---|---|
| 174 | aff-peace-01 · text | I am allowed to move slowly through a heavy day. |
| 175 | aff-peace-02 · text | This moment will pass, and I do not have to hurry it. |
| 176 | aff-peace-03 · text | There is one small good thing near me, and it can be enough for now. |
| 177 | aff-peace-04 · text | I can be as kind to myself as I would be to a friend. |
| 178 | aff-peace-05 · text | I do not have to carry everything at once. |
| 179 | aff-peace-06 · text | Something ordinary was good today, and I let myself notice it. |
| 180 | aff-peace-07 · text | Noticing what is good does not mean pretending the rest is fine. |
| 181 | aff-peace-08 · text | I can receive a small kindness without earning it first. |
| 182 | aff-peace-09 · text | I can let this minute be empty and still be alright. |
| 183 | aff-peace-10 · text | There is nothing I have to solve in the next sixty seconds. |
| 184 | aff-peace-11 · text | Quiet is allowed to be simple — I do not have to fill it. |
| 185 | aff-peace-12 · text | One small, kind step is a direction, and that is enough. |
| 186 | aff-peace-13 · text | I am allowed to be a beginner at getting through today. |
| 187 | aff-peace-14 · text | What I can do today is enough for today. |
| 188 | aff-peace-15 · text | I can be patient with myself while I am still learning how. |
| 189 | aff-peace-16 · text | A hard day is not a measure of who I am. |
| 190 | aff-peace-17 · text | I can hold regret and gentleness at the same time. |
| 191 | aff-peace-18 · text | Waiting is not wasted time; it is time I am allowed to have. |
| 192 | aff-peace-19 · text | I do not have to hurry my heart along. |
| 193 | aff-peace-20 · text | Things take the time they take, and I can be kind about that. |

---

**Count:** 120 entries (rows 74–193) — every rendered string of the two newer programs: 20 quest titles + 20 quest bodies + 20 affirmations per program. The five-quest / five-affirmation part-1 seed of each program is included in that count, because this single pass is where the owner reads the whole program for the first time.
**Decisions recorded here:** part 2 completes what the part-1 decision note called seed sets, so the two newer programs now ship 20/20 each; `CONTENT_META` stays 1.1.0 (its note names no counts, and the colophon prints each held program's real array lengths, so nothing overstates); shared prompts and verses are untouched; the Peace & Rest program's display name still lives in exactly one constant (`PEACE_AND_REST_LABEL`); the routing note above (row 73) remains the only health-adjacent sentence the app ships and still renders nowhere in the daily loop.
**One fix carried in part 2 (not copy):** the part-1 seed's first quest pointed at a mistyped verse id (`verse-prov-16-3`). No such verse is in the 60-verse library, so that Read & Reflect card had no verse to show. Part 2 corrects the id to the library's real one (`verse-proverbs-16-3`, Proverbs 16:3 — the same verse the seed's reflection was written for). Nothing the owner reads changes; a broken lookup is repaired, and `scripts/proof-programs.js` now fails if any quest in either program points outside the shared library.
