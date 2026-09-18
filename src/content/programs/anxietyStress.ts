/**
 * Calm Quest — Peace & Rest program (build 14, two-paths proposal §4).
 *
 * The in-app name is "Peace & Rest", not the spec's "Anxiety & Stress Support"
 * (owner decision, two-paths §4 naming flag: a health-adjacent term in a listing
 * that deliberately avoids health claims). The name lives in exactly ONE place —
 * `PEACE_AND_REST_LABEL` in src/content/themes.ts — so the owner can flip it in
 * the copy pass without touching a screen.
 *
 * PART 2 COMPLETE — 20 quests / 20 affirmations. The part-1 seed (five quests —
 * one per theme, all four quest types; five affirmations — one per theme) sits
 * byte-for-byte at the top of each array, and part 2 (content authoring) added
 * the rest to the lean Option-A target, continuing the `q-peace-NN` /
 * `aff-peace-NN` numbering to 20 each. Every string below was written against
 * the guardrail checklist in this header, one line at a time, and every rendered
 * string is mirrored in NEW_STRINGS.md under "Build 14 — part 2 (content)".
 * Nothing about the program's structure changed in part 2: same five theme keys,
 * same four quest types, same rotation. The bundle now holds five quests of each
 * type and four quests / four affirmations per theme.
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

  // =========================================================================== purpose
  {
    id: 'q-peace-06',
    theme: 'purpose',
    type: 'read_reflect',
    title: 'Be still and know',
    verseId: 'verse-psalm-46-10',
    reflection:
      'The verse asks for no working-out and no plan \u2014 only a moment of stopping to remember who is holding all of it. Nothing is required of you here except the stillness itself.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Trust' }, { label: 'Rest' }],
  },
  {
    id: 'q-peace-07',
    theme: 'purpose',
    type: 'pause',
    title: 'Nothing to carry here',
    durationSeconds: 60,
    pausePrompt:
      'One minute with nothing to hold \u2014 no decisions, no mending, no preparing the next thing. Let the minute be empty on purpose.',
  },
  {
    id: 'q-peace-08',
    theme: 'purpose',
    type: 'write',
    title: 'A gentler tomorrow',
    journalPrompt:
      'Write one line about one thing that would make tomorrow lighter \u2014 not a list, not a plan, just one line.',
  },

  // =========================================================================== patience
  {
    id: 'q-peace-09',
    theme: 'patience',
    type: 'read_reflect',
    title: 'Quietly waiting',
    verseId: 'verse-lam-3-26',
    reflection:
      'Hoping quietly is allowed to take time. This verse does not ask you to hurry your heart along \u2014 only to let hope stay with you while you wait.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Hope' }, { label: 'Rest' }],
  },
  {
    id: 'q-peace-10',
    theme: 'patience',
    type: 'act',
    title: 'One thing left for later',
    actionPrompt:
      'Choose one thing you were going to push through today and leave it for tomorrow instead. Some things go better rested, and letting them wait is allowed.',
  },
  {
    id: 'q-peace-11',
    theme: 'patience',
    type: 'write',
    title: 'What is taking time',
    journalPrompt:
      'Write one line about something that is taking longer than you hoped \u2014 and one kind thing you can say to yourself about the wait.',
  },

  // =========================================================================== gratitude
  {
    id: 'q-peace-12',
    theme: 'gratitude',
    type: 'read_reflect',
    title: 'Every good gift',
    verseId: 'verse-james-1-17',
    reflection:
      'Whatever good is in today arrived as a gift rather than a wage. Noticing that does not deny the hard parts of the day \u2014 it just names what was given, including the plain things.',
    checkInOptions: [{ label: 'Grateful' }, { label: 'Peace' }, { label: 'Calm' }],
  },
  {
    id: 'q-peace-13',
    theme: 'gratitude',
    type: 'pause',
    title: 'A minute for one good thing',
    durationSeconds: 60,
    pausePrompt:
      'For one minute, give your whole attention to one small good thing \u2014 a warm drink, a blanket, a light left on \u2014 and let it be enough for now.',
  },
  {
    id: 'q-peace-14',
    theme: 'gratitude',
    type: 'write',
    title: 'One ordinary good thing',
    journalPrompt:
      'Write one line about something ordinary that was good today, however small it seems. Ordinary counts.',
  },

  // =========================================================================== forgiveness
  {
    id: 'q-peace-15',
    theme: 'forgiveness',
    type: 'read_reflect',
    title: 'A weight already lifted',
    verseId: 'verse-psalm-32-1',
    reflection:
      'Being forgiven is spoken of here as a weight lifted, not a debt still owed. Whatever you are still holding against yourself, this verse does not ask you to keep carrying it.',
    checkInOptions: [{ label: 'Gentle' }, { label: 'Peace' }, { label: 'Hope' }],
  },
  {
    id: 'q-peace-16',
    theme: 'forgiveness',
    type: 'act',
    title: 'Say one kind sentence',
    actionPrompt:
      'Say one kind sentence to yourself today \u2014 out loud if you can \u2014 the way you would say it to a friend in your place. Kindness aimed inward counts the same as kindness aimed out.',
  },
  {
    id: 'q-peace-17',
    theme: 'forgiveness',
    type: 'pause',
    title: 'Softer than you think',
    durationSeconds: 60,
    pausePrompt:
      'One minute to notice where you are bracing \u2014 a jaw, a shoulder, a breath held high \u2014 and to let it be softer than it has been.',
  },

  // =========================================================================== stillness
  {
    id: 'q-peace-18',
    theme: 'stillness',
    type: 'act',
    title: 'Ten minutes without the phone',
    actionPrompt:
      'Put the phone in another room for ten minutes today and leave it there. Nothing that arrives in ten minutes needs you before you have had them.',
  },
  {
    id: 'q-peace-19',
    theme: 'stillness',
    type: 'pause',
    title: 'One long, slow out-breath',
    durationSeconds: 60,
    pausePrompt:
      'Let one breath out take its time, longer than the breath in. Then let the next one do the same.',
  },
  {
    id: 'q-peace-20',
    theme: 'stillness',
    type: 'write',
    title: 'What the day held',
    journalPrompt:
      'Write one line about what today held \u2014 no tidying it up, no making it sound better than it was.',
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

  // =========================================================================== gratitude
  {
    id: 'aff-peace-06',
    theme: 'gratitude',
    text: 'Something ordinary was good today, and I let myself notice it.',
  },
  {
    id: 'aff-peace-07',
    theme: 'gratitude',
    text: 'Noticing what is good does not mean pretending the rest is fine.',
  },
  {
    id: 'aff-peace-08',
    theme: 'gratitude',
    text: 'I can receive a small kindness without earning it first.',
  },

  // =========================================================================== stillness
  {
    id: 'aff-peace-09',
    theme: 'stillness',
    text: 'I can let this minute be empty and still be alright.',
  },
  {
    id: 'aff-peace-10',
    theme: 'stillness',
    text: 'There is nothing I have to solve in the next sixty seconds.',
  },
  {
    id: 'aff-peace-11',
    theme: 'stillness',
    text: 'Quiet is allowed to be simple \u2014 I do not have to fill it.',
  },

  // =========================================================================== purpose
  {
    id: 'aff-peace-12',
    theme: 'purpose',
    text: 'One small, kind step is a direction, and that is enough.',
  },
  {
    id: 'aff-peace-13',
    theme: 'purpose',
    text: 'I am allowed to be a beginner at getting through today.',
  },
  {
    id: 'aff-peace-14',
    theme: 'purpose',
    text: 'What I can do today is enough for today.',
  },

  // =========================================================================== forgiveness
  {
    id: 'aff-peace-15',
    theme: 'forgiveness',
    text: 'I can be patient with myself while I am still learning how.',
  },
  {
    id: 'aff-peace-16',
    theme: 'forgiveness',
    text: 'A hard day is not a measure of who I am.',
  },
  {
    id: 'aff-peace-17',
    theme: 'forgiveness',
    text: 'I can hold regret and gentleness at the same time.',
  },

  // =========================================================================== patience
  {
    id: 'aff-peace-18',
    theme: 'patience',
    text: 'Waiting is not wasted time; it is time I am allowed to have.',
  },
  {
    id: 'aff-peace-19',
    theme: 'patience',
    text: 'I do not have to hurry my heart along.',
  },
  {
    id: 'aff-peace-20',
    theme: 'patience',
    text: 'Things take the time they take, and I can be kind about that.',
  },
];
