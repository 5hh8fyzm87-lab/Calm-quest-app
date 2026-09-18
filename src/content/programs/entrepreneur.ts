/**
 * Calm Quest — Entrepreneur Mindset program (build 14, two-paths proposal §4).
 *
 * ⚠️ SEED SET — PENDING PART-2 AUTHORING. This file holds the minimal honest
 * seed the machinery pass needs so that pools, gates and proofs are fully
 * exercisable: five quests (one per theme, all four quest types) and five
 * affirmations (one per theme). Part 2 (content authoring) fills the same file
 * to the lean Option-A target — 20 quests / 20 affirmations — continuing the
 * `q-entrepreneur-NN` / `aff-entrepreneur-NN` numbering. Nothing else about this
 * program's structure changes when that lands: same five theme keys, same four
 * quest types, same rotation.
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
];
