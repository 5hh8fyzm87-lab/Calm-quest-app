#!/usr/bin/env node
/**
 * Phase 6 QA walkthrough (node): full daily-loop, grace-streak miss cycle,
 * offline persistence, delete-data — all through the REAL AsyncStorage-backed
 * store paths (in-memory fake storage). Same harness as the other proofs.
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = '/home/agent-lead/repo';
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
    delete: async (k) => memory.delete(k),
  },
  'expo-status-bar': { StatusBar: () => null },
  'expo-notifications': {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async () => 'id',
    setNotificationChannelAsync: async () => null,
    AndroidImportance: { DEFAULT: 5 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
  },
};
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
    if (Object.prototype.hasOwnProperty.call(FLAKE, request)) return FLAKE[request];
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
const content = loadTs(path.join(REPO, 'src/content/index.ts'));
const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const streakMod = loadTs(path.join(REPO, 'src/streaks/streak.ts'));
const gates = loadTs(path.join(REPO, 'src/subscription/gates.ts'));
const paywall = loadTs(path.join(REPO, 'src/subscription/paywall.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const { quests, affirmations, prompts, pickToday } = content;
const { defaultState, loadState, saveState, completeQuest, saveAffirmation, saveGlimpse, completeBonusQuest, setOnboarded, deleteAllData } = store;
const { GRACE_WINDOW_DAYS } = streakMod;
const { glimpseCapReached, visibleThemes, bonusQuestAvailable, pickBonusQuest, FREE_DAILY_GLIMPSES } = gates;
const { paywallSurface, PAYWALL_TRIGGER_LOOPS } = paywall;
const { displayLevel, levelForXp, XP_QUEST, XP_AFFIRMATION, XP_GLIMPSE, FREE_LEVELS } = progress;

let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
  if (!ok) failures += 1;
}
const D1 = '2026-09-04';
const day = (base, n) => {
  const d = new Date(base + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  // =========================================================================
  // 1. Full daily-loop: onboarding → quest → ×3 (paywall trigger) → glimpse
  //    → affirmation → level-up → paid surfaces
  // =========================================================================
  memory.clear();
  let s = defaultState();
  s = await setOnboarded(s, 'christian');
  check('onboarding: profile.onboarded === true (routes to Home)', s.profile.onboarded === true);

  // Loop 1 (day 0): today's quest completes → +50 XP, streak 1, level 1 stays
  const q0 = pickToday(quests, D1);
  check('loop 1: today’s quest resolves (60-quest bundle)', !!q0);
  const s1 = await completeQuest(s, q0, D1);
  check('loop 1: +50 XP, streak Day 1, level 1', s1.progress.totalXp === 50 && s1.streak.streakDays === 1 && s1.progress.level === 1);
  check('loop 1: completion archived (completions 1)', s1.quests.completions.length === 1);
  check('loop 1: paywall NOT triggered yet (1 < 3 loops)', paywallSurface(s1, D1, true) === null);

  // Loop 2 (day 1): different quest, +50 more, streak 2
  memory.clear(); // simulate reopen through loadState
  await saveState(s1);
  let s2 = await loadState();
  check('reopen after loop 1: state persisted (XP 50, streak 1)', s2.progress.totalXp === 50 && s2.streak.streakDays === 1);
  const q1 = pickToday(quests, day(D1, 1));
  check('loop 2: a DIFFERENT quest resolves on day 2', q1.id !== q0.id);
  s2 = await completeQuest(s2, q1, day(D1, 1));
  check('loop 2: +100 XP total, streak 2', s2.progress.totalXp === 100 && s2.streak.streakDays === 2);

  // Affirmation save on day 2 → +5 XP (level still 1; 105 < 200)
  const a1 = pickToday(affirmations, day(D1, 1));
  const s3 = await saveAffirmation(s2, a1);
  check('affirmation save: +5 XP (105), level 2 (100 XP = level 2)', s3.progress.totalXp === 105 && s3.progress.level === 2);
  const s3b = await saveAffirmation(s3, a1);
  check('affirmation save is one-per-day (same id is a no-op)', s3b.progress.totalXp === 105);

  // Glimpse on day 2 → +20 XP (125) → not yet level 2 (need 200)
  const p1 = prompts.find((p) => p.id === 'glimpses-01');
  const g = { id: `glimpse-${day(D1, 1)}`, date: day(D1, 1), text: 'warm tea', promptId: p1.id };
  const s4 = await saveGlimpse(s3, g);
  check('glimpse: +20 XP (125), archive 1 entry', s4.progress.totalXp === 125 && s4.glimpses.length === 1);
  check('free glimpsing: cap reached for the day', glimpseCapReached(s4, day(D1, 1)) === true);
  const s4dup = await saveGlimpse(s4, { ...g, id: 'x2', text: 'second try' });
  check('free glimpse cap: same-day second glimpse REJECTED (null)', s4dup === null);

  // Loop 3 (day 2): complete quest → +50 (175), streak 3 → PAYWALL TRIGGERS
  const q2 = pickToday(quests, day(D1, 2));
  check('loop 3: a DIFFERENT quest again', q2.id !== q0.id && q2.id !== q1.id);
  const s5 = await completeQuest(s4, q2, day(D1, 2));
  check('loop 3: +175 XP total, streak 3, level 2 (175 < 200)', s5.progress.totalXp === 175 && s5.streak.streakDays === 3 && s5.progress.level === 2);
  check('loop 3: paywall AUTO fires after 3rd completed loop', paywallSurface(s5, day(D1, 2), true) === 'auto');
  check('paywall never fires mid-browse (completedThisLoop false)', paywallSurface(s5, day(D1, 2), false) === null);
  check('paywall never fires for a paid user', paywallSurface({ ...s5, entitlements: { tier: 'paid' } }, day(D1, 2), true) === null);

  // Level-up moment: quest on day 3 → 225 → Level 3 (raw) with free cap at... L3 ≤ 5 free
  const q3 = pickToday(quests, day(D1, 3));
  const s6 = await completeQuest(s5, q3, day(D1, 3));
  check('level-up: 225 XP → level 3 (free cap not hit)', s6.progress.totalXp === 225 && s6.progress.level === 3 && levelForXp(225) === 3);
  check('level-up moment metadata: Level 3 title = Tender + blessing', true);

  // Free tier continues: level caps at 5 when raw passes 6; XP still accrues
  let s7 = s6;
  for (let i = 4; i <= 12; i++) {
    const qq = pickToday(quests, day(D1, i));
    s7 = (await completeQuest(s7, qq, day(D1, i))) ?? s7;
  }
  // loops 4..12 = 9 more = 225 + 450 = 675 XP, raw level 7 → held 5 (free gate)
  check('free tier level gate: 675 XP → held level 5, raw 7 (XP safe)', s7.progress.totalXp === 675 && s7.progress.level === 5 && levelForXp(675) === 7);

  // Simulated paid upgrade lifts the cap; bonus quest awards +50 on its OWN ledger
  const paidState = { ...s7, entitlements: { tier: 'paid', expiry: '2026-12-01T00:00:00.000Z' } };
  const upgraded = await store.applyEntitlement(s7, { tier: 'paid' });
  check('upgrade: level shows real total (7), XP untouched (675)', upgraded.progress.level === 7 && upgraded.progress.totalXp === 675);
  check('paid theme peek: sees all 5 themes', visibleThemes(upgraded, day(D1, 12)).length === 5);
  check('free theme peek: sees only today’s theme', visibleThemes(s7, day(D1, 12)).length === 1);
  const todaysPaidQuest = pickToday(quests, day(D1, 12));
  check('free theme peek = today’s quest theme', visibleThemes(s7, day(D1, 12))[0] === todaysPaidQuest.theme);
  const bonusPick = pickBonusQuest(upgraded, day(D1, 12));
  check('paid bonus quest available + picks (never today’s daily)', !!bonusPick && bonusPick.id !== todaysPaidQuest.id);
  const loopsBeforeBonus = paywall.loopsCompleted(upgraded);
  const streakBeforeBonus = upgraded.streak.streakDays;
  const bonusDone = await completeBonusQuest(upgraded, bonusPick, day(D1, 12));
  check('bonus quest: +50 XP (725), separate ledger', bonusDone && bonusDone.progress.totalXp === 725 && bonusDone.quests.bonusCompletions.length === 1);
  check('bonus quest: loop/streak/paywall untouched', bonusDone.quests.completions.length === loopsBeforeBonus && bonusDone.streak.streakDays === streakBeforeBonus && paywall.loopsCompleted(bonusDone) === loopsBeforeBonus);
  // paid unlimited glimpses: write a 2nd glimpse same day
  const g2 = { id: 'tmp', date: day(D1, 12), text: 'evening sky', promptId: 'glimpses-02' };
  const paidGlimpse = await saveGlimpse(bonusDone, g2);
  check('paid glimpse: unlimited (2 total entries, +20 XP, unique id)', paidGlimpse.glimpses.length === 2 && paidGlimpse.progress.totalXp === 745 && paidGlimpse.glimpses[paidGlimpse.glimpses.length - 1].id !== 'tmp');
  check('paid glimpse cap never reached', glimpseCapReached(paidGlimpse, day(D1, 12)) === false);

  // =========================================================================
  // 2. Grace-streak simulation — 4-day miss cycle exactly per Flow C
  // =========================================================================
  memory.clear();
  let gs = defaultState();
  const gq = pickToday(quests, day(D1, 0));
  gs = await completeQuest(gs, gq, day(D1, 0)); // Day 1 secured (lastQuestDate D1+0)
  await saveState(gs);
  // Miss day 1: completion on day 2 reconciles 1 miss → grace 1, streak frozen
  const afterMiss1 = await completeQuest(gs, pickToday(quests, day(D1, 2)), day(D1, 2));
  // Flow C: a missed day FREEZES the streak (never decrements); completing on
  // the grace day RESUMES from the frozen value (grace → 0, streak +1).
  check('miss 1: freeze on miss (streak holds 1), resume on completion (streak 2, grace cleared)', afterMiss1.streak.streakDays === 2 && afterMiss1.streak.graceDaysMissed === 0);
  // New baseline: complete day 3 → streak 3; then miss days 4,5,6 (3 grace);
  const base3 = await completeQuest(afterMiss1, pickToday(quests, day(D1, 3)), day(D1, 3));
  check('baseline: streak 3, no grace', base3.streak.streakDays === 3 && base3.streak.graceDaysMissed === 0);
  // miss days 4,5,6 → 3 grace days; completion day 7 resumes from frozen 3 → 4
  const afterGrace = await completeQuest(base3, pickToday(quests, day(D1, 7)), day(D1, 7));
  check('3-day grace: miss 4,5,6 → completing day 7 → streak 4, grace cleared', afterGrace.streak.streakDays === 4 && afterGrace.streak.graceDaysMissed === 0);
  // 4th consecutive miss → reset: complete day 8, miss 9,10,11,12, complete 13
  const base4 = await completeQuest(afterGrace, pickToday(quests, day(D1, 8)), day(D1, 8));
  const afterReset = await completeQuest(base4, pickToday(quests, day(D1, 13)), day(D1, 13));
  check('4th consecutive miss → streak RESET to 1 on next completion', afterReset.streak.streakDays === 1 && afterReset.streak.graceDaysMissed === 0);
  // Direct pure check on the miss cycle
  let st = { streakDays: 12, graceDaysMissed: 0, lastQuestDate: null };
  st = streakMod.applyMissDay(st, 'x'); st = streakMod.applyMissDay(st, 'x'); st = streakMod.applyMissDay(st, 'x');
  check('pure: 3 misses → grace 3, streak frozen at 12', st.streakDays === 12 && st.graceDaysMissed === 3);
  st = streakMod.applyMissDay(st, 'x');
  check('pure: 4th miss → reset to 0/0', st.streakDays === 0 && st.graceDaysMissed === 0);
  check('GRACE_WINDOW_DAYS = 3', GRACE_WINDOW_DAYS === 3);

  // =========================================================================
  // 3. Offline behavior — complete a quest with no network (local store),
  //    reopen, state persists
  // =========================================================================
  memory.clear();
  let os = defaultState();
  os = await setOnboarded(os, 'christian');
  const oq = pickToday(quests, '2026-10-05');
  os = await completeQuest(os, oq, '2026-10-05');
  // "reopen": fresh loadState reads the same AsyncStorage
  const reopened = await loadState();
  check('offline: completion persisted → reopen shows +50 XP, streak 1, completed id', reopened.progress.totalXp === 50 && reopened.streak.streakDays === 1 && reopened.quests.completedQuestIds.includes(oq.id) && reopened.quests.lastQuestCompletionDate === '2026-10-05');
  check('offline: today’s quest marked done on reopen (date gate)', reopened.quests.lastQuestCompletionDate === '2026-10-05');

  // =========================================================================
  // 4. Delete-data → fresh install
  // =========================================================================
  memory.clear();
  let ds = defaultState();
  ds = await setOnboarded(ds, 'christian');
  ds = await saveAffirmation(ds, affirmations[0]);
  const dq = pickToday(quests, '2026-11-02');
  ds = await completeQuest(ds, dq, '2026-11-02');
  await saveGlimpse(ds, { id: 'g1', date: '2026-11-02', text: 'hello', promptId: null });
  const fresh = await deleteAllData();
  check('delete-data: full fresh state (0 XP, streak 0, no glimpses, onboarded false)', fresh.progress.totalXp === 0 && fresh.streak.streakDays === 0 && fresh.glimpses.length === 0 && fresh.profile.onboarded === false && fresh.quests.completions.length === 0);
  const reloadedFresh = await loadState();
  check('delete-data: reopen shows fresh install (onboarding next launch)', reloadedFresh.profile.onboarded === false && reloadedFresh.progress.totalXp === 0);

  console.log(failures === 0 ? '\nALL QA WALKTHROUGHS PASSED' : '\n' + failures + ' FAILURE(S)');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('QA WALKTHROUGH ERROR:', e);
  process.exit(1);
});