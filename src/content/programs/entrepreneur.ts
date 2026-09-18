/**
 * Calm Quest — Entrepreneur Mindset program (build 14, two-paths proposal §4).
 *
 * PART 2 COMPLETE — 20 quests / 20 affirmations. The part-1 seed (five quests —
 * one per theme, all four quest types; five affirmations — one per theme) sits
 * byte-for-byte at the top of each array, and part 2 (content authoring) added
 * the rest to the lean Option-A target, continuing the `q-entrepreneur-NN` /
 * `aff-entrepreneur-NN` numbering to 20 each. Nothing about the program's
 * structure changed: same five theme keys, same four quest types, same rotation.
 * The bundle now holds five quests of each type and four quests / four
 * affirmations per theme. Every rendered string in this file is mirrored in
 * NEW_STRINGS.md under "Build 14 — part 2 (content)" for the owner's single
 * copy pass.
 *
 * Faith alignment (proposal §4, owner-approved): scripture-aligned wisdom for a
 * founder's life. Every Read & Reflect quest takes an existing `verseId` from
 * the shared WEB library (src/content/verses.ts) — no new verse text, no new
 * translation work, no licensing question. Prompts stay shared too.
 *
 * Voice rules (the same guardrails the Christian bundle keeps): written as fact ·
 * no hype or hustle language · no guaranteed outcomes ("invites", never "will
 * make you successful") · no business advice, no money claims, no metrics · no
 * streak-guilt · no medical framing. Titles ≤ 6 words. This is mindset
 * training for someone building something — not a course, and not financial,
 * legal or business counsel.
 */
import type { Affirmation, Quest } from '../../models/types';

export const entrepreneurQuests: Quest[] = [
  {
    id: 'q-entrepreneur-01',
    theme: 'purpose',
    type: 'read_reflect',
    title: 'Commit the work',
    verseId: 'verse-prov-16-3',
    reflection:
      'A plan is a small act of hope. You can hand the outcome over and still do today\u2019s work well — the doing is yours, the results were never fully in your hands.',
    checkInOptions: [{ label: 'Purpose' }, { label: 'Peace' }, { label: 'Courage' }],
  },
  {
    id: 'q-entrepreneur-02',
    theme: 'patience',
    type: 'act',
    title: 'The long game',
    actionPrompt:
      'Choose the one thing that will still matter in a year and give it twenty unhurried minutes today. Slow work is still work, and no one is watching this part.',
  },
  {
    id: 'q-entrepreneur-03',
    theme: 'gratitude',
    type: 'act',
    title: 'The small win',
    actionPrompt:
      'Name one thing that went right today, however small \u2014 a reply that came, a page filled, a problem that finally made sense. Let it count before you move on to the next thing.',
  },
  {
    id: 'q-entrepreneur-04',
    theme: 'stillness',
    type: 'pause',
    title: 'Not by burning out',
    durationSeconds: 60,
    pausePrompt: 'One minute with nothing to build. The work will still be there.',
  },
  {
    id: 'q-entrepreneur-05',
    theme: 'forgiveness',
    type: 'write',
    title: 'A launch that failed',
    journalPrompt:
      'Write one line about something that did not work out, and one honest thing it taught you. One line is enough \u2014 this is not a post-mortem.',
  },

  // =========================================================================== purpose
  {
    id: 'q-entrepreneur-06',
    theme: 'purpose',
    type: 'act',
    title: 'One honest next step',
    actionPrompt:
      'Take the smallest real step toward the thing you are building — a message sent, a page written, a question asked — and let that be today\u2019s work. The next step is yours to take; the whole road was never yours to see.',
  },
  {
    id: 'q-entrepreneur-07',
    theme: 'purpose',
    type: 'pause',
    title: 'One minute off the clock',
    durationSeconds: 60,
    pausePrompt:
      'One minute where nothing is being built, sold or measured. The work waits, and it will still be yours when you come back.',
  },
  {
    id: 'q-entrepreneur-08',
    theme: 'purpose',
    type: 'write',
    title: 'What this is for',
    journalPrompt:
      'Write one line about why this work matters to you — the honest reason, not the polished one. One line is enough, and no one else reads it.',
  },

  // =========================================================================== patience
  {
    id: 'q-entrepreneur-09',
    theme: 'patience',
    type: 'read_reflect',
    title: 'A due season',
    verseId: 'verse-gal-6-9',
    reflection:
      'Nothing here sets a timeline. A due season is one you do not get to schedule — only to keep working through, without giving up on the work itself.',
    checkInOptions: [{ label: 'Steady' }, { label: 'Peace' }, { label: 'Trust' }],
  },
  {
    id: 'q-entrepreneur-10',
    theme: 'patience',
    type: 'pause',
    title: 'Slow is still moving',
    durationSeconds: 60,
    pausePrompt:
      'Sixty seconds with nothing to check. The work does not need you to be in a hurry, and neither does today.',
  },
  {
    id: 'q-entrepreneur-11',
    theme: 'patience',
    type: 'write',
    title: 'Something not yet ready',
    journalPrompt:
      'Write one line about something you are building that is not ready yet — and one honest thing it needs from you this week.',
  },

  // =========================================================================== gratitude
  {
    id: 'q-entrepreneur-12',
    theme: 'gratitude',
    type: 'read_reflect',
    title: 'Whatever you do',
    verseId: 'verse-col-3-17',
    reflection:
      'The verse puts giving thanks inside the work itself, not at the end of it. There is something to be glad of on an ordinary working day, before anything is finished.',
    checkInOptions: [{ label: 'Grateful' }, { label: 'Steady' }, { label: 'Peace' }],
  },
  {
    id: 'q-entrepreneur-13',
    theme: 'gratitude',
    type: 'pause',
    title: 'A minute of noticing',
    durationSeconds: 60,
    pausePrompt:
      'For one minute, notice what is already working — a tool that holds, a person who replied, the plain fact that you are still here doing this.',
  },
  {
    id: 'q-entrepreneur-14',
    theme: 'gratitude',
    type: 'write',
    title: 'A quiet thank-you note',
    journalPrompt:
      'Write one line of thanks to someone who made your work easier this week — you do not have to send it.',
  },

  // =========================================================================== stillness
  {
    id: 'q-entrepreneur-15',
    theme: 'stillness',
    type: 'read_reflect',
    title: 'Rest is not falling behind',
    verseId: 'verse-psalm-37-7',
    reflection:
      'The verse names the exact thing that keeps a founder up late — watching someone else prosper while you wait — and answers it with rest, not with a faster pace.',
    checkInOptions: [{ label: 'Rest' }, { label: 'Trust' }, { label: 'Peace' }],
  },
  {
    id: 'q-entrepreneur-16',
    theme: 'stillness',
    type: 'act',
    title: 'One unplugged hour',
    actionPrompt:
      'Take one hour today with no building and no comparing — no metrics, no scrolling, no catching up. Do something that has no outcome at all, and let that be the point.',
  },
  {
    id: 'q-entrepreneur-17',
    theme: 'stillness',
    type: 'write',
    title: 'What rest felt like',
    journalPrompt:
      'Write one line about the last time you truly rested — what it felt like, and what made it hard to stop.',
  },

  // =========================================================================== forgiveness
  {
    id: 'q-entrepreneur-18',
    theme: 'forgiveness',
    type: 'read_reflect',
    title: 'Compassion, again',
    verseId: 'verse-micah-7-19',
    reflection:
      'The compassion in this verse is something that keeps coming back — again, and again. What you are still holding against yourself does not have to be carried into the next season.',
    checkInOptions: [{ label: 'Gentle' }, { label: 'Peace' }, { label: 'Hope' }],
  },
  {
    id: 'q-entrepreneur-19',
    theme: 'forgiveness',
    type: 'act',
    title: 'Let one person off',
    actionPrompt:
      'Think of one person who let you down — a slow reply, a promised thing that never came — and quietly let them off the hook today. Not for their sake: for the room it makes in you.',
  },
  {
    id: 'q-entrepreneur-20',
    theme: 'forgiveness',
    type: 'pause',
    title: 'Put the ledger down',
    durationSeconds: 60,
    pausePrompt:
      'One minute of not keeping score — the numbers, the comparisons, the things you owe or are owed. Set the ledger down. It will keep.',
  },
];

export const entrepreneurAffirmations: Affirmation[] = [
  {
    id: 'aff-entrepreneur-01',
    theme: 'gratitude',
    text: 'Small progress is still progress, and I can be glad of it before it is finished.',
  },
  {
    id: 'aff-entrepreneur-02',
    theme: 'stillness',
    text: 'My worth is not measured by what I shipped today.',
  },
  {
    id: 'aff-entrepreneur-03',
    theme: 'purpose',
    text: 'The work in front of me is mine to do well, not to control the outcome of.',
  },
  {
    id: 'aff-entrepreneur-04',
    theme: 'forgiveness',
    text: 'A thing that failed is not the same as a person who failed.',
  },
  {
    id: 'aff-entrepreneur-05',
    theme: 'patience',
    text: 'Good work takes the time it takes, and I can stay with it.',
  },

  // =========================================================================== gratitude
  {
    id: 'aff-entrepreneur-06',
    theme: 'gratitude',
    text: 'Something good turns up in ordinary working hours, and I can notice it.',
  },
  {
    id: 'aff-entrepreneur-07',
    theme: 'gratitude',
    text: 'I can be glad of today\u2019s work without waiting for it to amount to something.',
  },
  {
    id: 'aff-entrepreneur-08',
    theme: 'gratitude',
    text: 'Building slowly is still building, and I can be thankful for the pace I keep.',
  },

  // =========================================================================== stillness
  {
    id: 'aff-entrepreneur-09',
    theme: 'stillness',
    text: 'I can stop for an hour without the work falling apart.',
  },
  {
    id: 'aff-entrepreneur-10',
    theme: 'stillness',
    text: 'Rest is part of the work, not a break from it.',
  },
  {
    id: 'aff-entrepreneur-11',
    theme: 'stillness',
    text: 'One unhurried minute is allowed, even in the middle of a launch.',
  },

  // =========================================================================== purpose
  {
    id: 'aff-entrepreneur-12',
    theme: 'purpose',
    text: 'One faithful step is enough for today, even when the whole path is unclear.',
  },
  {
    id: 'aff-entrepreneur-13',
    theme: 'purpose',
    text: 'What I am building can be done with a whole heart, quietly.',
  },
  {
    id: 'aff-entrepreneur-14',
    theme: 'purpose',
    text: 'I do not have to know how it ends to keep going.',
  },

  // =========================================================================== forgiveness
  {
    id: 'aff-entrepreneur-15',
    theme: 'forgiveness',
    text: 'I can learn from something that did not work without becoming its judge.',
  },
  {
    id: 'aff-entrepreneur-16',
    theme: 'forgiveness',
    text: 'I can let myself off the hook for what I could not have known.',
  },
  {
    id: 'aff-entrepreneur-17',
    theme: 'forgiveness',
    text: 'There is room for another attempt, and for being kind to myself in the meantime.',
  },

  // =========================================================================== patience
  {
    id: 'aff-entrepreneur-18',
    theme: 'patience',
    text: 'The season I am in is a season, not a verdict.',
  },
  {
    id: 'aff-entrepreneur-19',
    theme: 'patience',
    text: 'Something is growing even when it looks quiet from the outside.',
  },
  {
    id: 'aff-entrepreneur-20',
    theme: 'patience',
    text: 'I can wait for the due season without working myself ragged.',
  },
];
