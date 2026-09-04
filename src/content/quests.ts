/**
 * Calm Quest — daily quests (Phase 1 SAMPLE bundle).
 *
 * 30 quests: 6 per theme × 5 themes, all 4 quest types represented in every
 * theme (2 read_reflect, 2 act, 1 pause, 1 write). Faith-aligned but
 * non-denominational; grace-toned; no medical claims; no streak-guilt;
 * no guaranteed outcomes ("invites", not "will fix").
 *
 * Read & Reflect quests carry a `verseId` into src/content/verses.ts (WEB,
 * public domain). A few verseIds are intentionally reused across quests —
 * this is a starter set and the in-house content pass replaces it wholesale.
 *
 * NOTE: This is sample content for Phase 1 (see CONTENT_META in index.ts).
 */
import type { Quest } from '../models/types';

export const quests: Quest[] = [
  // ---------------------------------------------------------------- gratitude
  {
    id: 'q-gratitude-01',
    theme: 'gratitude',
    type: 'read_reflect',
    title: 'A day worth receiving',
    verseId: 'verse-psalm-118-24',
    reflection:
      'Even on a hard day, something is offered to you. The invitation is simply to notice it.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-gratitude-02',
    theme: 'gratitude',
    type: 'read_reflect',
    title: 'Thanks in all circumstances',
    verseId: 'verse-1thess-5-16-18',
    reflection:
      'Thanksgiving is not pretending everything is fine. It is choosing to look for the small good that is still there.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-gratitude-03',
    theme: 'gratitude',
    type: 'act',
    title: 'A one-line thank-you',
    actionPrompt:
      'Send one person a one-line thank-you — for something they did today or long ago. No need to be elaborate; one true sentence is enough.',
  },
  {
    id: 'q-gratitude-04',
    theme: 'gratitude',
    type: 'act',
    title: 'Notice three small good things',
    actionPrompt:
      'Before you finish today, notice three small good things — a warm drink, a kind word, a patch of sky. You do not have to write them down; just let them register.',
  },
  {
    id: 'q-gratitude-05',
    theme: 'gratitude',
    type: 'pause',
    title: 'A minute of simple thanks',
    durationSeconds: 60,
  },
  {
    id: 'q-gratitude-06',
    theme: 'gratitude',
    type: 'write',
    title: 'One gift today',
    journalPrompt:
      'Write one line about one good thing that came to you today — even something very small.',
  },
  // ----------------------------------------------------------------- stillness
  {
    id: 'q-stillness-01',
    theme: 'stillness',
    type: 'read_reflect',
    title: 'Be still',
    verseId: 'verse-psalm-46-10',
    reflection:
      'Stillness is not emptiness. It is a way of remembering who holds the day — and letting your shoulders come down.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-stillness-02',
    theme: 'stillness',
    type: 'read_reflect',
    title: 'Rest for the weary',
    verseId: 'verse-matt-11-28',
    reflection:
      'Rest is an invitation, not a reward you have to earn. You can lay down the load for a minute and nothing falls apart.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-stillness-03',
    theme: 'stillness',
    type: 'act',
    title: 'One slower thing',
    actionPrompt:
      'Choose one small thing today and do it slowly on purpose — your coffee, a walk, washing your hands. Let it take exactly as long as it takes.',
  },
  {
    id: 'q-stillness-04',
    theme: 'stillness',
    type: 'act',
    title: 'Put the phone down for a bit',
    actionPrompt:
      'For ten minutes today, put your phone in another room. You are not missing anything that cannot wait.',
  },
  {
    id: 'q-stillness-05',
    theme: 'stillness',
    type: 'pause',
    title: 'One silent minute',
    durationSeconds: 60,
  },
  {
    id: 'q-stillness-06',
    theme: 'stillness',
    type: 'write',
    title: 'What quiet sounds like',
    journalPrompt:
      'In one line, describe a moment of quiet you had today — or one you wish you had.',
  },
  // ------------------------------------------------------------------- purpose
  {
    id: 'q-purpose-01',
    theme: 'purpose',
    type: 'read_reflect',
    title: 'Made for good works',
    verseId: 'verse-ephes-2-10',
    reflection:
      'You are not here by accident, and the good you can do does not have to be grand. It was prepared before you — you get to walk into it today.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-purpose-02',
    theme: 'purpose',
    type: 'read_reflect',
    title: 'Trust the next step',
    verseId: 'verse-proverbs-3-5',
    reflection:
      'You do not need to see the whole road. You only need enough light for the next step — and that is usually all that is given.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-purpose-03',
    theme: 'purpose',
    type: 'act',
    title: 'One small service',
    actionPrompt:
      'Do one small thing for someone else today with no one watching — hold a door, make tea, send a thoughtful note. Small is exactly the right size.',
  },
  {
    id: 'q-purpose-04',
    theme: 'purpose',
    type: 'act',
    title: 'Use a gift',
    actionPrompt:
      'Use one thing you are good at today, even for five minutes — a skill, a kindness, a craft. Purpose often wears ordinary clothes.',
  },
  {
    id: 'q-purpose-05',
    theme: 'purpose',
    type: 'pause',
    title: 'A minute to remember why',
    durationSeconds: 60,
  },
  {
    id: 'q-purpose-06',
    theme: 'purpose',
    type: 'write',
    title: 'The shape of your purpose',
    journalPrompt:
      'In one line: what is one thing you feel you were made to do — this season, this week, or this lifetime?',
  },
  // --------------------------------------------------------------- forgiveness
  {
    id: 'q-forgiveness-01',
    theme: 'forgiveness',
    type: 'read_reflect',
    title: 'Forgiven, so forgive',
    verseId: 'verse-col-3-13',
    reflection:
      'Forgiveness is not saying it did not hurt. It is releasing the debt you were never meant to carry — and letting grace have the last word.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-forgiveness-02',
    theme: 'forgiveness',
    type: 'read_reflect',
    title: 'Kind and tender-hearted',
    verseId: 'verse-ephes-4-32',
    reflection:
      'You have been shown kindness you did not earn. Passing that same kindness on — to others and to yourself — is one of the bravest things you can do.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-forgiveness-03',
    theme: 'forgiveness',
    type: 'act',
    title: 'Release one small grudge',
    actionPrompt:
      'Think of one small offense you have been carrying — a curt word, a slight. Today, practice letting it go: say in your heart, "I release this." You are not pretending it did not happen; you are choosing not to carry it.',
  },
  {
    id: 'q-forgiveness-04',
    theme: 'forgiveness',
    type: 'act',
    title: 'Kindness toward yourself',
    actionPrompt:
      'Say something kind to yourself that you would say to a friend who made the same mistake. Forgiveness starts at home.',
  },
  {
    id: 'q-forgiveness-05',
    theme: 'forgiveness',
    type: 'pause',
    title: 'A minute to put it down',
    durationSeconds: 60,
  },
  {
    id: 'q-forgiveness-06',
    theme: 'forgiveness',
    type: 'write',
    title: 'What release could look like',
    journalPrompt:
      'In one line: is there a weight you would like to set down? Write what releasing it might look like — not how to do it, just what it would feel like.',
  },
  // ------------------------------------------------------------------ patience
  {
    id: 'q-patience-01',
    theme: 'patience',
    type: 'read_reflect',
    title: 'Strength for the waiting',
    verseId: 'verse-isaiah-40-31',
    reflection:
      'Waiting is not wasted time. Sometimes the strength you need is being renewed while you are still.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-patience-02',
    theme: 'patience',
    type: 'read_reflect',
    title: 'Near to the broken-hearted',
    verseId: 'verse-psalm-34-18',
    reflection:
      'You do not have to hold it together to be held. When your heart is low, you are not far from help — you are exactly where help can find you.',
    checkInOptions: [{ label: 'Peace' }, { label: 'Courage' }, { label: 'Rest' }],
  },
  {
    id: 'q-patience-03',
    theme: 'patience',
    type: 'act',
    title: 'Wait without rushing',
    actionPrompt:
      'Today, choose one moment where you would normally rush — a line, a red light, a slow reply — and simply let it take its time. Notice what changes.',
  },
  {
    id: 'q-patience-04',
    theme: 'patience',
    type: 'act',
    title: 'Gentle with someone slow',
    actionPrompt:
      'If someone is slower than you today — a child, an older person, a colleague — match their pace instead of pushing yours. Patience is a gift you give by staying.',
  },
  {
    id: 'q-patience-05',
    theme: 'patience',
    type: 'pause',
    title: 'A minute, nothing more',
    durationSeconds: 60,
  },
  {
    id: 'q-patience-06',
    theme: 'patience',
    type: 'write',
    title: 'Something worth waiting for',
    journalPrompt:
      'In one line: what good thing in your life is still growing and not finished yet?',
  },
];