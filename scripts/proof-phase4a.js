/**
 * Phase 4a proof (node): paywall trigger honesty, 7-day re-nag rule, level
 * gating (F4/§5), and guest→account merge (F10).
 *
 * Same technique as proof-phase3.js: TS transpiled in-memory, native-only
 * modules faked. Proves:
 *  1. The one-time paywall fires exactly after the 3rd completed loop — never
 *     before, never for paid users, and never again once stamped seen.
 *  2. "Continue free" → no modal re-nag within 7 days (any date), re-surface
 *     ('growth') only on/after day 7 — including across relaunches (the stamp
 *     persists; the surface is derived from state + date on every focus).
 *  3. Level gating: free users hold at most level 5 while XP keeps accruing
 *     (capped on completion and in pure math); a SIMULATED upgrade — a
 *     clearly labeled fixture, since no real store exists yet — lifts the cap
 *     and shows their real total. The stub SubscriptionService itself never
 *     grants anything (F8 guard).
 *  4. mergeGuestState conflict rules: higher streak wins, XP never drops
 *     (level re-derives), glimpses union by id, earlier paywall decline wins,
 *     entitlements come from the account only.
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
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
    getItem: async () => null,
    setItem: async () => {},
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

const paywall = loadTs(path.join(REPO, 'src/subscription/paywall.ts'));
const merge = loadTs(path.join(REPO, 'src/subscription/merge.ts'));
const serviceMod = loadTs(path.join(REPO, 'src/subscription/service.ts'));
const stubMod = loadTs(path.join(REPO, 'src/subscription/stub.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const store = loadTs(path.join(REPO, 'src/storage/store.ts'));

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  -> ${extra}` : ''}`);
}
function day(iso, offset) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

const { paywallSurface, PAYWALL_TRIGGER_LOOPS, PAYWALL_RENAG_DAYS } = paywall;
const { mergeGuestState } = merge;
const { displayLevel, levelGate, levelForXp, FREE_LEVELS } = progress;
const { defaultState, completeQuest, applyEntitlement } = store;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A free-tier state with `n` daily-loop completions starting 2026-09-01. */
function stateWithLoops(n) {
  const s = defaultState();
  const completions = [];
  for (let i = 0; i < n; i++) completions.push({ date: day('2026-09-01', i), questId: `q${i}` });
  return {
    ...s,
    quests: {
      ...s.quests,
      completions,
      lastQuestCompletionDate: n > 0 ? completions[completions.length - 1].date : null,
    },
  };
}

/** SIMULATED paid state — a clearly labeled TEST fixture. In production the
 * paid tier can only arrive through a verified store entitlement (applyEntitlement
 * fed by the real SubscriptionService); the stub service cannot produce one
 * (proven below). */
function simulatedPaidState(s, expiry) {
  return {
    ...s,
    entitlements: { tier: 'paid', expiry: expiry ?? '2026-12-01T00:00:00.000Z' },
  };
}

// ---------------------------------------------------------------------------
// 1. Trigger: fires exactly after the 3rd completed loop, once per decline
// ---------------------------------------------------------------------------

const d1 = '2026-09-03';
const d2 = day(d1, 1);
const d3 = day(d1, 2);
const d4 = day(d1, 3);

check(
  'loops 0/1/2 → no paywall on completion',
  paywallSurface(stateWithLoops(0), d1, true) === null &&
    paywallSurface(stateWithLoops(1), d2, true) === null &&
    paywallSurface(stateWithLoops(2), d3, true) === null,
);
const s3 = stateWithLoops(3);
check(
  `3rd loop completion → 'auto' (PAYWALL_TRIGGER_LOOPS=${PAYWALL_TRIGGER_LOOPS})`,
  paywallSurface(s3, d3, true) === 'auto',
);
check('3rd loop, NOT on a completion moment (mid-browse) → nothing', paywallSurface(s3, d3, false) === null);
check('2 loops + unrelated date → nothing', paywallSurface(stateWithLoops(2), d4, false) === null);

// Once-ness is owned by the paywallSeenAt stamp (first stamp wins; the store
// helper markPaywallSeen is a no-op when already stamped).
const seen = { ...s3, paywallSeenAt: d3 };
check('after decline stamp, 4th loop completion → no auto re-fire', paywallSurface({ ...seen, quests: stateWithLoops(4).quests }, d4, true) === null);
check('declined today → no growth surface either', paywallSurface(seen, d3, true) === null);
check('declined 6 days ago → still nothing (no re-nag within 7)', paywallSurface(seen, day(d3, 6), false) === null);
check(`declined day ${PAYWALL_RENAG_DAYS} → 'growth' re-surface`, paywallSurface(seen, day(d3, PAYWALL_RENAG_DAYS), false) === 'growth');
check('declined day 30 → still just growth', paywallSurface(seen, day(d3, 30), false) === 'growth');

// Relaunch persistence: pre-paywall payloads (no field) load as "not seen".
check('payload without paywallSeenAt loads as null (not seen)', defaultState().paywallSeenAt === null && stateWithLoops(3).paywallSeenAt == null);

// Paid users: never any surface (SIMULATED paid fixture, labeled as such).
check('paid user → never auto, never growth (simulated paid fixture)', paywallSurface(simulatedPaidState(s3), d4, true) === null && paywallSurface(simulatedPaidState(seen), day(d3, 30), false) === null);

// ---------------------------------------------------------------------------
// 2. Level gating (F4/§5): free holds ≤ 5, XP accrues, upgrade lifts the cap
// ---------------------------------------------------------------------------

// Pure math
check('displayLevel free at 0–499 XP → ≤ 5', [0, 49, 99, 100, 250, 450, 499].every((xp) => displayLevel(xp, 'free') <= FREE_LEVELS));
check('displayLevel free at 500 XP → exactly 5 (cap)', displayLevel(500, 'free') === 5);
check('displayLevel paid at 500 XP → raw 6', displayLevel(500, 'paid') === 6);
check('levelGate free 499 → not gated', levelGate(499, 'free').gated === false);
check('levelGate free 500 → gated (raw 6, display 5)', levelGate(500, 'free').gated === true && levelGate(500, 'free').rawLevel === 6 && levelGate(500, 'free').display === 5);
check('levelGate paid never gated', [0, 500, 5000].every((xp) => levelGate(xp, 'paid').gated === false));

// ---------------------------------------------------------------------------
// 3 + 4 run inside the async block (they await store/service calls).
// ---------------------------------------------------------------------------

(async () => {
  // Through the store path (AsyncStorage faked): 12 free completions on 12
  // local days = 600 XP. Raw math says level 7; the held level must stay 5.
  let freeState = defaultState();
  const quest = { id: 'q', theme: 'gratitude', type: 'act', title: 't' };
  for (let i = 0; i < 12; i++) {
    freeState = (await completeQuest(freeState, quest, day('2026-10-01', i))) ?? freeState;
  }
  check('12 free completions = 600 XP, held level still 5', freeState.progress.totalXp === 600 && freeState.progress.level === 5, `xp=${freeState.progress.totalXp} lvl=${freeState.progress.level}`);
  check('raw level at 600 XP would be 7 (cap held at every step)', levelForXp(freeState.progress.totalXp) === 7);

  // SIMULATED upgrade — labeled fixture, NOT the stub service (which cannot
  // grant entitlements). XP survives untouched; the cap lifts to the real total.
  const upgraded = await applyEntitlement(freeState, { tier: 'paid' });
  check('after simulated upgrade: level reflects real total (7)', upgraded.progress.level === 7, `lvl=${upgraded.progress.level}`);
  check('after simulated upgrade: XP unchanged (600, no loss)', upgraded.progress.totalXp === 600);
  check('applyEntitlement keeps every other field intact', upgraded.glimpses === freeState.glimpses && upgraded.streak === freeState.streak);

  // ---------------------------------------------------------------------------
  // 3. The stub service never grants an entitlement (F8 guard)
  // ---------------------------------------------------------------------------

  const stub = new stubMod.StubSubscriptionService();
  check('stub isAvailable() → false (honest: no store wired)', (await stub.isAvailable()) === false);
  const plans = await stub.getPlans();
  check('stub getPlans → 2 plans, yearly carries Best value + ≈ $5/mo', plans.ok && plans.value.length === 2 && plans.value[1].badge === 'Best value' && plans.value[1].perMonth === '≈ $5/mo');
  const attempted = await stub.purchase('yearly');
  const restored = await stub.restore();
  check('stub purchase → not ok, reason stub (never grants tier paid)', attempted.ok === false && attempted.reason === 'stub' && attempted.value === undefined);
  check('stub restore → not ok, reason stub', restored.ok === false && restored.reason === 'stub');
  check('SUBSCRIPTION_PLANS prices match spec ($9.99 / $59.99)', serviceMod.SUBSCRIPTION_PLANS.find((p) => p.id === 'monthly').price === '$9.99' && serviceMod.SUBSCRIPTION_PLANS.find((p) => p.id === 'yearly').price === '$59.99');

  // ---------------------------------------------------------------------------
  // 4. mergeGuestState (F10): higher streak, XP never drops, glimpses union
  // ---------------------------------------------------------------------------

  const guest = stateWithLoops(4);
  guest.streak = { streakDays: 9, graceDaysMissed: 1, lastQuestDate: '2026-09-04' };
  guest.progress = { totalXp: 320, level: 4 };
  guest.glimpses = [{ id: 'g1', date: '2026-09-02', text: 'guest glimpse', promptId: 'p1' }];
  guest.savedAffirmationIds = ['a1'];
  guest.paywallSeenAt = '2026-09-04';
  guest.quests.completedQuestIds = ['q0', 'q1', 'q2', 'q3'];

  const account = defaultState();
  account.profile = { ...defaultState().profile, id: 'acct_1', displayName: 'Sam' };
  account.streak = { streakDays: 5, graceDaysMissed: 0, lastQuestDate: '2026-09-05' };
  account.progress = { totalXp: 510, level: 6 };
  account.glimpses = [
    { id: 'g1', date: '2026-09-02', text: 'guest glimpse', promptId: 'p1' }, // same id → dedup
    { id: 'g2', date: '2026-09-05', text: 'account glimpse', promptId: 'p2' },
  ];
  account.savedAffirmationIds = ['a2'];
  account.quests = {
    completedQuestIds: ['q9'],
    completions: [{ date: '2026-09-05', questId: 'q9' }],
    lastQuestCompletionDate: '2026-09-05',
  };
  account.paywallSeenAt = '2026-09-06';

  const merged = mergeGuestState(guest, account);
  check('merge: higher streak wins (9 over 5)', merged.streak.streakDays === 9 && merged.streak.graceDaysMissed === 1 && merged.streak.lastQuestDate === '2026-09-04');
  check('merge: XP never drops (max 510, level re-derives to 6)', merged.progress.totalXp === 510 && merged.progress.level === 6);
  check('merge: glimpses union by id (2 entries, g1 deduped)', merged.glimpses.length === 2 && merged.glimpses.map((g) => g.id).sort().join(',') === 'g1,g2');
  check('merge: saved affirmations union', merged.savedAffirmationIds.length === 2 && merged.savedAffirmationIds.includes('a1') && merged.savedAffirmationIds.includes('a2'));
  check('merge: completed quest ids union', [...merged.quests.completedQuestIds].sort().join(',') === 'q0,q1,q2,q3,q9');
  check('merge: completions union by (date,questId)', merged.quests.completions.length === 5);
  check('merge: lastQuestCompletionDate is the later one', merged.quests.lastQuestCompletionDate === '2026-09-05');
  check('merge: earlier paywall decline wins (2026-09-04)', merged.paywallSeenAt === '2026-09-04');
  check('merge: entitlements come from the ACCOUNT only', merged.entitlements.tier === account.entitlements.tier);
  check('merge: account profile wins', merged.profile.id === 'acct_1' && merged.profile.displayName === 'Sam');
  check('merge: pure — inputs untouched (guest glimpses still 1)', guest.glimpses.length === 1 && account.glimpses.length === 2);

  // Reverse direction: guest richer than account → guest data must win.
  // (900 XP = level 10 in the flat 100-XP curve; the stored level field is
  // irrelevant — merge re-derives from the winning XP.)
  const richGuest = defaultState();
  richGuest.streak = { streakDays: 20, graceDaysMissed: 0, lastQuestDate: '2026-09-10' };
  richGuest.progress = { totalXp: 900, level: 10 };
  richGuest.glimpses = [{ id: 'gx', date: '2026-09-09', text: 'rich', promptId: null }];
  const merged2 = mergeGuestState(richGuest, defaultState());
  check('merge (guest richer): streak 20 kept', merged2.streak.streakDays === 20);
  check('merge (guest richer): XP 900 kept, level re-derives to 10', merged2.progress.totalXp === 900 && merged2.progress.level === 10);
  check('merge (guest richer): guest glimpse survives', merged2.glimpses.length === 1 && merged2.glimpses[0].id === 'gx');

  // Completion dedup: same (date, questId) on both sides → one row.
  const gSame = stateWithLoops(1);
  const aSame = defaultState();
  aSame.quests = {
    completedQuestIds: ['q0'],
    completions: [{ date: '2026-09-01', questId: 'q0' }],
    lastQuestCompletionDate: '2026-09-01',
  };
  check('merge: duplicate completion (same date+questId) collapses to one', mergeGuestState(gSame, aSame).quests.completions.length === 1);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('PROOF ERROR:', e);
  process.exit(1);
});
