/**
 * Calm Quest — Peace & Rest program (build 14, two-paths proposal §4).
 *
 * The in-app name is "Peace & Rest", not the spec's "Anxiety & Stress Support"
 * (owner decision, two-paths §4 naming flag: a health-adjacent term in a listing
 * that deliberately avoids health claims). The name lives in exactly ONE place —
 * `PEACE_AND_REST_LABEL` in src/content/themes.ts — so the owner can flip it in
 * the copy pass without touching a screen.
 *
 * ⚠️ SEED SET — PENDING PART-2 AUTHORING. Five quests (one per theme, all four
 * quest types) and five affirmations (one per theme) so that pools, gates and
 * proofs are fully exercisable. Part 2 (content authoring) fills the same file to
 * the lean Option-A target — 20 quests / 20 affirmations — continuing the
 * `q-peace-NN` / `aff-peace-NN` numbering. Same five theme keys, same four quest
 * types, same rotation; no structural change when that lands.
 *
 * Every Read & Reflect quest takes an existing `verseId` from the shared WEB
 * library (src/content/verses.ts) — no new verse text, no new translation work.
 * Prompts stay shared.
 *
 * ===========================================================================
 * CONTENT GUARDRAILS — carried verbatim from the two-paths proposal §4
 * (binding for every string in this file, and for part-2 authoring)
 * ===========================================================================
 *
 * **Anxiety & Stress Support — scripture-aligned comfort, strict honesty rules (content file header carries them):**
 * - **May say:** everyday emotional language — heavy days, restless nights, worry, a racing mind, carrying too much, resting, being gentle with yourself. Grace, comfort, presence, patience; scripture in the reading voice; gratitude as noticing, not a fix.
 * - **Must never say:** "anxiety", "stress relief", "reduces/relieves/eases anxiety or stress", "calms your nervous system", "treats/cures/heals", "therapy", "therapeutic", "clinical", "mental health condition", "symptoms", "diagnosis", "disorder", "panic attack", "depression"; no mood scores, severity scales, symptom checkers, before/after, breathing-sync or breath-counting claims; no outcome promises. Promise the practice, never the result.
 * - **One routing line** (vellum note, not a quest): *"Calm Quest is a companion, not care. If today is heavier than a companion can hold, please reach out to someone qualified — and if you're in crisis, a local crisis line."*
 * - **Naming flag:** "Anxiety & Stress Support" was spec-approved for a never-rendered row; live, it's a health-adjacent term in a listing that deliberately avoids health claims. **Consider a non-clinical in-app name** (e.g. "Peace & Rest", "Calm for Anxious Days"), keep all health-adjacent words out of store metadata. Owner's call.
 *
 * Reading of the rule that matters most here: the quests invite a practice
 * (notice, pause, be gentle, set something down). They never promise a result,
 * never score how someone feels, and never claim to be care.
 */
import type { Affirmation, Quest } from '../../models/types';

// --- COPY (build 14) — mirrored verbatim in NEW_STRINGS.md ---
/**
 * The program's ONE routing line (proposal §4), shown as a vellum note on the
 * Programs screen — never a quest, and never inside the daily loop. It quotes
 * the proposal byte-for-byte, including its ASCII apostrophe in "you're", so the
 * copy pass can see exactly what is proposed; the owner may flip it to the
 * app's typographic apostrophe in that pass.
 */
export const ROUTING_NOTE =
  "Calm Quest is a companion, not care. If today is heavier than a companion can hold, please reach out to someone qualified — and if you're in crisis, a local crisis line.";
// --- /COPY ---

export const anxietyStressQuests: Quest[] = [
  {
    id: 'q-peace-01',
    theme: 'stillness',
    type: 'read_reflect',
    title: 'When the mind races',
    verseId: 'verse-isaiah-26-3',
    reflection:
      'A racing mind is not a failure of faith. This verse does not ask you to stop the thoughts \u2014 only to let one steady thing hold you while they pass.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Steady' }, { label: 'Rest' }],
  },
  {
    id: 'q-peace-02',
    theme: 'patience',
    type: 'pause',
    title: 'A minute of quiet',
    durationSeconds: 60,
    pausePrompt: 'Nothing to fix in this minute. Just this one minute, as it is.',
  },
  {
    id: 'q-peace-03',
    theme: 'gratitude',
    type: 'act',
    title: 'One good thing noticed',
    actionPrompt:
      'Notice one ordinary good thing today \u2014 warm water, a chair that holds you, a voice you like. Noticing is not pretending: it sits beside the hard thing instead of replacing it.',
  },
  {
    id: 'q-peace-04',
    theme: 'forgiveness',
    type: 'write',
    title: 'Being gentle with yourself',
    journalPrompt:
      'Write one line you would say to a friend in your place. Then let it be said to you too. One line is enough.',
  },
  {
    id: 'q-peace-05',
    theme: 'purpose',
    type: 'act',
    title: 'Carrying too much',
    actionPrompt:
      'Put down one thing today that is not yours to carry: a worry for later, one task, one expectation. Setting something down is allowed, and nothing here is lost by it.',
  },
];

export const anxietyStressAffirmations: Affirmation[] = [
  {
    id: 'aff-peace-01',
    theme: 'stillness',
    text: 'I am allowed to move slowly through a heavy day.',
  },
  {
    id: 'aff-peace-02',
    theme: 'patience',
    text: 'This moment will pass, and I do not have to hurry it.',
  },
  {
    id: 'aff-peace-03',
    theme: 'gratitude',
    text: 'There is one small good thing near me, and it can be enough for now.',
  },
  {
    id: 'aff-peace-04',
    theme: 'forgiveness',
    text: 'I can be as kind to myself as I would be to a friend.',
  },
  {
    id: 'aff-peace-05',
    theme: 'purpose',
    text: 'I do not have to carry everything at once.',
  },
];
