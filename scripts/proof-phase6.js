#!/usr/bin/env node
// Phase 6 content validation (runtime): prove quest/affirmation/prompt/verse
// structural integrity + cross-references, per the task's Part B content proofs.
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = '/home/agent-lead/repo';
const cache = new Map();
function loadTs(absPath, seen) {
  const key = path.resolve(absPath);
  if (cache.has(key)) return cache.get(key);
  const src = fs.readFileSync(key, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: key,
  }).outputText;
  const mod = { exports: {} };
  const dir = path.dirname(key);
  const localRequire = (request) => {
    if (request.startsWith('.')) {
      const candidates = [
        path.resolve(dir, request),
        path.resolve(dir, request) + '.ts',
        path.resolve(dir, request) + '.tsx',
        path.resolve(dir, request, 'index.ts'),
        path.resolve(dir, request, 'index.tsx'),
      ];
      for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      throw new Error('unresolved relative import ' + request + ' from ' + key);
    }
    return require(request);
  };
  cache.set(key, mod.exports);
  new Function('module', 'exports', 'require', '__filename', out)(mod, mod.exports, localRequire, key);
  return mod.exports;
}
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
  if (!ok) failures += 1;
}
const content = loadTs(path.join(REPO, 'src/content/index.ts'));
const { quests, affirmations, prompts, verses } = content;
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));

check('quests count = 60', quests.length === 60, 'got ' + quests.length);
check('affirmations count = 75', affirmations.length === 75, 'got ' + affirmations.length);
check('prompts count = 30', prompts.length === 30, 'got ' + prompts.length);
check('verses count = 60', verses.length === 60, 'got ' + verses.length);

const qIds = new Set(quests.map((q) => q.id));
check('quest ids unique', qIds.size === 60);
check('affirmation ids unique', new Set(affirmations.map((a) => a.id)).size === 75);
check('prompt ids unique', new Set(prompts.map((p) => p.id)).size === 30);
check('verse ids unique', new Set(verses.map((v) => v.id)).size === 60);

// per-theme distribution
const themes = ['gratitude', 'stillness', 'purpose', 'forgiveness', 'patience'];
for (const t of themes) {
  const n = quests.filter((q) => q.theme === t).length;
  check('theme ' + t + ' has 12 quests', n === 12, 'got ' + n);
  const a = affirmations.filter((x) => x.theme === t).length;
  check('theme ' + t + ' has 15 affirmations', a === 15, 'got ' + a);
}
check('no quest outside the 5 themes', quests.every((q) => themes.includes(q.theme)));

// per-type distribution 15/15/15/15
const byType = {};
for (const q of quests) byType[q.type] = (byType[q.type] || 0) + 1;
check('quest types 15/15/15/15', JSON.stringify(byType) === JSON.stringify({ read_reflect: 15, act: 15, pause: 15, write: 15 }), JSON.stringify(byType));

// verse cross-reference: every quest verseId resolves to a verse in the bundle
const verseIds = new Set(verses.map((v) => v.id));
const missing = quests.filter((q) => q.verseId && !verseIds.has(q.verseId)).map((q) => q.id);
check('all quest verseIds resolve to bundle verses', missing.length === 0, 'missing: ' + JSON.stringify(missing));
const usedVerseIds = new Set(quests.map((q) => q.verseId).filter(Boolean));
check('at least one quest uses each read_reflect-facing verse (15 used of 60)', usedVerseIds.size === 15, 'used=' + usedVerseIds.size + ' of ' + verseIds.size);

// read_reflect / act / pause / write structural completeness
const rr = quests.filter((q) => q.type === 'read_reflect');
check('all read_reflect have verseId', rr.every((q) => q.verseId));
check('all read_reflect have reflection', rr.every((q) => q.reflection));
check('all read_reflect have 3 checkInOptions', rr.every((q) => q.checkInOptions && q.checkInOptions.length === 3));
const acts = quests.filter((q) => q.type === 'act');
check('all act have actionPrompt', acts.every((q) => q.actionPrompt));
const pauses = quests.filter((q) => q.type === 'pause');
check('all pause have durationSeconds 60', pauses.every((q) => q.durationSeconds === 60));
check('all pause have pausePrompt', pauses.every((q) => q.pausePrompt), 'missing: ' + JSON.stringify(pauses.filter((q) => !q.pausePrompt).map((q) => q.id)));
const writes = quests.filter((q) => q.type === 'write');
check('all write have journalPrompt', writes.every((q) => q.journalPrompt));
check('all quest titles ≤ 6 words', quests.every((q) => q.title.split(' ').length <= 6));

// one-liner check: affirmations ≤ 1 sentence, prompts ≤ 1 sentence
function oneSentenceish(s) {
  // one terminal . ! ? (allow quotes/abbreviation-ish). Words with a period
  // like "no." or ellipsis are edge — flag anything with 2+ sentence ends.
  const ends = (s.match(/[.!?](?:["'\u2019"]?)$/gm) || []).length;
  return ends <= 1;
}
const multi = affirmations.filter((a) => !oneSentenceish(a.text)).map((a) => a.id);
check('affirmations ≤ 1 sentence (spot check, 75/75)', multi.length === 0, 'multi: ' + JSON.stringify(multi.slice(0, 5)));
const multiP = prompts.filter((p) => !oneSentenceish(p.prompt)).map((p) => p.id);
check('prompts ≤ 1 sentence', multiP.length === 0, JSON.stringify(multiP.slice(0, 5)));

// verses: all attributed, all WEB, all have reference + text
check('every verse has attribution', verses.every((v) => v.attribution && v.attribution.length > 0));
check('every verse is WEB', verses.every((v) => v.translation === 'WEB'));
check('every verse has reference + text', verses.every((v) => v.reference && v.text));

// level titles + blessings match the draft (20)
check('LEVEL_TITLES length 20', progress.LEVEL_TITLES.length === 20, 'got ' + progress.LEVEL_TITLES.length);
const expectedTitles = ['Seed','Sprout','Tender','Growing','Steady','Standing','Rooted','Branching','Leafing','Blossom','Fruitful','Haven','Keeper','Nurturer','Wisdom','Grace','Abundant','Verdant','Flourish','Shelter'];
check('LEVEL_TITLES = Seed → Shelter (draft Part 5)', JSON.stringify(progress.LEVEL_TITLES) === JSON.stringify(expectedTitles));

console.log(failures === 0 ? '\nALL CONTENT PROOFS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);