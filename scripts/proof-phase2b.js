/**
 * Phase 2b proof (node): quest completion math — XP/level, grace-streak
 * credit with missed-day reconciliation, level-up boundary, affirmation save.
 *
 * Same technique as proof-phase2a.js: TS transpiled in-memory, native-only
 * modules faked (async-storage runs against an in-memory map so the real
 * save/load path is exercised). `npm run typecheck` covers types; this proves
 * runtime behavior of the completion flow.
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');

const memory = new Map();
const FLAKE = {
  'react-native': {
    StyleSheet: { create: (o) => o },
    Platform: { OS: 'web' },
    View: () => null,
    Text: () => null,
    Pressable: () => null,
    ScrollView: () => null,
    Alert: { alert: () => {} },
    ActivityIndicator: () => null,
  },
  '@react-native-async-storage/async-storage': {
    getItem: async (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: async (k, v) => memory.set(k, v),
  },
  'expo-status-bar': { StatusBar: () => null },
};
const cache = new Map();
function loadTs(absPath) {
  const key = path.resolve(absPath);
  if (cache.has(key)) return cache.get(key);
  const src = fs.readFileSync(key, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
    },
    fileName: key,
  }).outputText;
  const mod = { exports: {} };
  const dir = path.dirname(key);
  const localRequire = (request) => {
    if (Object.prototype.hasOwnProperty.call(FLAKE, request)) return FLAKE[request];
    if (request.startsWith('.')) {
      const candidates = [
        path.resolve(dir, request),
        path.resolve(dir, request) + '.ts',
        path.resolve(dir, request) + '.tsx',
        path.resolve(dir, request, 'index.ts'),
        path.resolve(dir, request, 'index.tsx'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      }
      throw new Error(`unresolved relative import '${request}' from ${key}`);
    }
    return require(request);
  };
  cache.set(key, mod.exports);
  new Function('module', 'exports', 'require', '__filename', out)(
    mod,
    mod.exports,
    localRequire,
    key,
  );
  return mod.exports;
}

const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const contentIdx = loadTs(path.join(REPO, 'src/content/index.ts'));

const { defaultState, completeQuest, saveAffirmation, saveGlimpse, loadState } = store;
const { levelForXp, xpForLevel, levelFloorXp, levelTitleInfo, levelTier, XP_QUEST, XP_AFFIRMATION, XP_GLIMPSE, XP_PER_LEVEL, TOTAL_LEVELS, FREE_LEVELS } = progress;
const quests = contentIdx.quests;
const affirmations = contentIdx.affirmations;

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  -> ${extra}` : ''}`);
}

const day1 = '2026-09-05';
const day2 = '2026-09-06';
const day3 = '2026-09-07';
const day4 = '2026-09-08';
const day5 = '2026-09-09';
const q = quests[0]; // any quest card works for the math proof
const aff = affirmations[0];

// ---------------------------------------------------------------------------
// Pure level math
// ---------------------------------------------------------------------------
check('level 1 at 0 XP', levelForXp(0) === 1);
check('level 1 at 99 XP', levelForXp(99) === 1);
check('level 2 at 100 XP', levelForXp(100) === 2);
check('level 2 at 149 XP', levelForXp(149) === 2);
// 150 XP = 1 full level + 50 → still level 2 (100/level; level 3 needs 200).
check('level 2 at 150 XP', levelForXp(150) === 2);
check('level 3 at 200 XP', levelForXp(200) === 3);
check('level 20 at 1900 XP', levelForXp(1900) === 20);
// No clamp above 20: the math keeps counting (level 51 at 5000 XP). The UI
// renders "20 of 20" via TOTAL_LEVELS; raw level never drives gating.
check('levelForXp(5000) === 51 (uncapped, harmless)', levelForXp(5000) === 51);
check(
  'levelTitleInfo(7) = Rooted',
  levelTitleInfo(7).title === 'Rooted' && levelTitleInfo(7).blessing.includes('Rooted'),
);
check('20 titles, no gaps (>= TOTAL_LEVELS)', levelTitleInfo(20).title === 'Shelter');
check('tier free <= 5', levelTier(5) === 'free');
check('tier paid at 6', levelTier(6) === 'paid');
check('xpForLevel/floor consistency', xpForLevel(3) === 200 && levelFloorXp(220) === 200);

// ---------------------------------------------------------------------------
// First completion: day 1 → streak 1, +50 XP
// ---------------------------------------------------------------------------
(async () => {
  let s = defaultState();
  s.profile.onboarded = true;
  s = await saveGlimpse(s, { id: 'glimpse-a', date: day1, text: 'Coffee + sun', promptId: null });
  check('glimpse +20 XP (total 20)', s.progress.totalXp === XP_GLIMPSE, `total=${s.progress.totalXp}`);

  s = await saveAffirmation(s, aff);
  check('affirmation +5 XP (total 25)', s.progress.totalXp === XP_GLIMPSE + XP_AFFIRMATION, `total=${s.progress.totalXp}`);
  const affAgain = await saveAffirmation(s, aff);
  check('affirmation credit once only (no double)', affAgain.progress.totalXp === s.progress.totalXp);
  check('affirmation id recorded', affAgain.savedAffirmationIds.includes(aff.id));

  // Completion day 1: streak 1, +50 → 75 XP, level 1
  const s1 = await completeQuest(s, q, day1);
  check('completeQuest returns state (not null)', s1 !== null);
  check('quest day credit: lastQuestCompletionDate', s1.quests.lastQuestCompletionDate === day1);
  check('quest archived in completions', s1.quests.completions.length === 1 && s1.quests.completions[0].questId === q.id);
  check('quest id added to completedQuestIds', s1.quests.completedQuestIds.includes(q.id));
  check('XP = 25 + 50 = 75', s1.progress.totalXp === XP_GLIMPSE + XP_AFFIRMATION + XP_QUEST, `total=${s1.progress.totalXp}`);
  check('level still 1 at 75 XP', s1.progress.level === 1);
  check('streak day 1', s1.streak.streakDays === 1 && s1.streak.graceDaysMissed === 0 && s1.streak.lastQuestDate === day1);

  // Re-credit same day → no-op
  const s1again = await completeQuest(s1, quests[1], day1);
  check('same-day re-completion is a no-op (null)', s1again === null);

  // Level-up boundary across 2 days: 75 → +50 = 125 XP → level 2 (Flow D)
  const s2 = await completeQuest(s1, quests[1], day2);
  check('level 2 at 125 XP (boundary crossed)', s2.progress.level === 2 && s2.progress.totalXp === 125);
  check('streak day 2', s2.streak.streakDays === 2 && s2.streak.graceDaysMissed === 0);
  check('completions archived (2 days)', s2.quests.completions.length === 2);

  // Miss a day (day3 skipped), complete day4 → grace credit: streak resumes to 3
  const s3 = await completeQuest(s2, quests[2], day4);
  check('grace resume: streak 3 (not reset), grace 0', s3.streak.streakDays === 3 && s3.streak.graceDaysMissed === 0, `days=${s3.streak.streakDays} grace=${s3.streak.graceDaysMissed}`);
  check('completion day counted (day4)', s3.streak.lastQuestDate === day4);

  // Miss 4 days (day5, day6, day7, day8 — 4th consecutive miss exhausts the
  // 3-day window and resets the streak), then complete day9 → fresh Day 1.
  const s4 = await completeQuest(s3, quests[3], '2026-09-13');
  check('grace exhausted on 4th consecutive miss → fresh Day 1', s4.streak.streakDays === 1 && s4.streak.graceDaysMissed === 0, `days=${s4.streak.streakDays}`);

  // Miss exactly 3 days (inside window), complete day 4 → streak resumes +1
  const miss3 = { streakDays: 10, graceDaysMissed: 0, lastQuestDate: '2026-01-01' };
  const after3Miss = await completeQuest(
    { ...defaultState(), streak: miss3, quests: { ...defaultState().quests, lastQuestCompletionDate: '2026-01-01' } },
    q,
    '2026-01-05',
  );
  check('3-day grace window fully used → streak 11 (resumes)', after3Miss.streak.streakDays === 11, `days=${after3Miss.streak.streakDays}`);

  // 4th consecutive miss: 10 → miss 4 → complete → fresh day 1
  const after4Miss = await completeQuest(
    { ...defaultState(), streak: miss3, quests: { ...defaultState().quests, lastQuestCompletionDate: '2026-01-01' } },
    q,
    '2026-01-06',
  );
  check('4-consecutive-miss → fresh Day 1', after4Miss.streak.streakDays === 1, `days=${after4Miss.streak.streakDays}`);

  // loadState edge: old flat lastQuestCompletionDate payload hoists correctly
  memory.clear();
  memory.set('calmquest/appState/v1', JSON.stringify({
    profile: defaultState().profile,
    streak: { streakDays: 5, graceDaysMissed: 0, lastQuestDate: '2026-08-30' },
    quests: { completedQuestIds: ['q-x'], completions: [] },
    lastQuestCompletionDate: '2026-08-30',
    savedAffirmationIds: [],
    glimpses: [],
    entitlements: { tier: 'free' },
    contentVersion: 1,
  }));
  const migrated = await loadState();
  check('migrated flat lastQuestCompletionDate → quests block', migrated.quests.lastQuestCompletionDate === '2026-08-30');
  check('migrated progress.level recomputes (0 XP → 1)', migrated.progress.level === 1 && migrated.progress.totalXp === 0);
  check('migrated streak preserved', migrated.streak.streakDays === 5);

  console.log(`\n${failures === 0 ? 'ALL PROOFS PASSED' : `${failures} PROOF(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})();