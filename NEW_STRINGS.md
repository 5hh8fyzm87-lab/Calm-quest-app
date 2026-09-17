# Calm Quest — build 13 new strings (the "stay a while" layer)

**Status:** every string below is NEW copy written for build 13 and awaiting the owner's single review pass (proposal §6, decision 6: approve in ONE pass). Nothing here ships until that pass happens.
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
