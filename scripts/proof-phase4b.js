/**
 * Phase 4b proof (node): §5 free/paid split gates + F10 continuation seams.
 *
 * Same technique as proof-phase4a.js: TS transpiled in-memory, native-only
 * modules faked. Proves:
 *  1. Glimpse cap: free = ONE per local day, derived from the persisted
 *     ledger at interaction time — close-and-reopen (a fresh loadState from
 *     storage) can never grant a second glimpse; paid = unlimited (same-day
 *     glimpses append with unique ids and +20 XP each); the free tier's
 *     same-day re-save is a no-op (null), never a double credit.
 *  2. Theme peek (S1): free sees ONLY today's quest theme (the daily quest
 *     itself is never gated — its theme is always in the visible list);
 *     paid sees all 5 themes in canonical order with the real library peek.
 *  3. Second daily quest (paid): +50 XP via the same XP path, recorded in
 *     the DEDICATED bonusCompletions ledger — completions, lastQuest-
 *     CompletionDate, the streak, and the paywall trigger are untouched
 *     (one-daily-loop invariant). Free tier is rejected; a same-day second
 *     bonus is rejected; pickBonusQuest never picks today's daily quest.
 *  4. Restore-stub honesty: restore()/purchase() answer { ok:false,
 *     reason:'stub' } and grant nothing — no fake success exists.
 *  5. Auth-stub honesty (F10): createOrSignIn answers { ok:false,
 *     reason:'stub' } and never returns an account. mergeGuestState carries
 *     bonusCompletions through (union, own ledger), and a SIMULATED upgrade
 *     (labeled fixture) lifts the level cap exactly as in Phase 4a.
 *  6. Migration: a pre-4b payload without bonusCompletions loads as [];
 *     junk non-array values also load as [].
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
// Stateful AsyncStorage fake: lets the proof simulate close-and-reopen by
// writing state, then loading it back through the real loadState path.
const asyncStore = new Map();
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
    getItem: async (k) => (asyncStore.has(k) ? asyncStore.get(k) : null),
    setItem: async (k, v) => {
      asyncStore.set(k, v);
    },
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

const gates = loadTs(path.join(REPO, 'src/subscription/gates.ts'));
const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const paywall = loadTs(path.join(REPO, 'src/subscription/paywall.ts'));
const merge = loadTs(path.join(REPO, 'src/subscription/merge.ts'));
const stubSub = loadTs(path.join(REPO, 'src/subscription/stub.ts'));
const stubAuth = loadTs(path.join(REPO, 'src/subscription/authStub.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const content = loadTs(path.join(REPO, 'src/content/index.ts'));

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

const {
  FREE_DAILY_GLIMPSES,
  THEME_ORDER,
  glimpsesToday,
  glimpseCapReached,
  canBrowseThemes,
  visibleThemes,
  themeQuestCounts,
  bonusQuestAvailable,
  pickBonusQuest,
} = gates;
const {
  defaultState,
  loadState,
  saveGlimpse,
  completeQuest,
  completeBonusQuest,
  applyEntitlement,
  STORAGE_KEY,
} = store;
const { loopsCompleted, paywallSurface } = paywall;
const { mergeGuestState } = merge;
const { levelForXp, displayLevel, XP_QUEST, XP_GLIMPSE } = progress;
const { quests, pickToday } = content;

const D1 = '2026-09-15';
const D2 = day(D1, 1);

// SIMULATED paid state — a clearly labeled TEST fixture (same convention as
// proof-phase4a: the stub services cannot produce tier 'paid'; production
// reaches it only via applyEntitlement + a verified store entitlement).
function simulatedPaidState(s) {
  return { ...s, entitlements: { tier: 'paid', expiry: '2026-12-01T00:00:00.000Z' } };
}

function entryFor(date, text) {
  return { id: `glimpse-${date}`, date, text: text ?? 'quiet gratitude', promptId: null };
}

(async () => {
  // -------------------------------------------------------------------------
  // 1. Glimpse cap (§5): 1/day free, unlimited paid, reopen-proof
  // -------------------------------------------------------------------------

  check(`FREE_DAILY_GLIMPSES is 1`, FREE_DAILY_GLIMPSES === 1);

  const freeS = defaultState();
  check('free, no glimpses → cap not reached', glimpseCapReached(freeS, D1) === false);
  check('paid, no glimpses → cap never reached (unlimited)', glimpseCapReached(simulatedPaidState(freeS), D1) === false);

  const afterOne = await saveGlimpse(freeS, entryFor(D1));
  check('free first glimpse of the day saves (+20 XP)', afterOne !== null && afterOne.progress.totalXp === XP_GLIMPSE);
  check('glimpsesToday derives 1 from the ledger', glimpsesToday(afterOne, D1) === 1);
  check('free after 1 glimpse → cap reached', glimpseCapReached(afterOne, D1) === true);

  // Reopen-proof: persist, then load FRESH state through the real load path
  // (the fake AsyncStorage backing store) — the cap must still hold.
  const reopened = await loadState();
  check(
    'close-and-reopen (fresh loadState) → cap still reached, ledger persisted',
    glimpseCapReached(reopened, D1) === true && glimpsesToday(reopened, D1) === 1,
  );
  check(
    'reopen into a NEW local day → free glimpse available again',
    glimpseCapReached(reopened, D2) === false,
  );

  const doubleSave = await saveGlimpse(reopened, entryFor(D1, 'second attempt'));
  check('free same-day second save → null (no XP, no ledger row)', doubleSave === null);
  const stillOne = await loadState();
  check('free ledger still holds exactly 1 glimpse for the day', glimpsesToday(stillOne, D1) === 1);

  // Paid: unlimited — three same-day glimpses all archive and credit.
  asyncStore.delete(STORAGE_KEY); // fresh paid journey
  const paidS = simulatedPaidState(defaultState());
  const p1 = await saveGlimpse(paidS, entryFor(D1, 'one'));
  const p2 = await saveGlimpse(p1, entryFor(D1, 'two'));
  const p3 = await saveGlimpse(p2, entryFor(D1, 'three'));
  check('paid same-day glimpses all save (unlimited)', p1 !== null && p2 !== null && p3 !== null);
  check('paid 3 same-day glimpses = 3 ledger rows, 60 XP', glimpsesToday(p3, D1) === 3 && p3.progress.totalXp === 3 * XP_GLIMPSE);
  check('paid glimpse ids are unique (no collisions)', new Set(p3.glimpses.map((g) => g.id)).size === 3);
  check('paid cap check is always false', glimpseCapReached(p3, D1) === false);
  const paidReopen = await loadState();
  check('paid reopen: unlimited persists (still not capped)', glimpseCapReached(paidReopen, D1) === false && glimpsesToday(paidReopen, D1) === 3);

  // -------------------------------------------------------------------------
  // 2. Theme peek (S1): free sees only today, paid sees all 5 — daily quest
  //    itself never gated
  // -------------------------------------------------------------------------

  const todaysQuest = pickToday(quests, D1);
  const freeThemes = visibleThemes(defaultState(), D1);
  const paidThemes = visibleThemes(simulatedPaidState(defaultState()), D1);
  check('THEME_ORDER holds exactly the 5 MVP themes', THEME_ORDER.length === 5);
  check('free visibleThemes = [today’s theme] only', freeThemes.length === 1 && freeThemes[0] === todaysQuest.theme);
  check('free user: the DAILY QUEST is never gated (its theme always visible)', freeThemes.includes(todaysQuest.theme));
  check(
    'paid visibleThemes = all 5 in canonical order',
    paidThemes.length === 5 && JSON.stringify(paidThemes) === JSON.stringify(THEME_ORDER),
  );
  check('canBrowseThemes: free false, paid true', canBrowseThemes(defaultState()) === false && canBrowseThemes(simulatedPaidState(defaultState())) === true);
  const counts = themeQuestCounts();
  check(
    'themeQuestCounts reflects the real bundle (60 quests; each of the 5 themes holds ≥ 12)',
    Object.values(counts).reduce((a, b) => a + b, 0) === 60 &&
      Object.values(counts).every((n) => n >= 12),
  );

  // -------------------------------------------------------------------------
  // 3. Second daily quest (paid): +50 XP, dedicated ledger, one-loop invariant
  // -------------------------------------------------------------------------

  asyncStore.delete(STORAGE_KEY);
  // Paid user who has already completed today's daily loop.
  let bonusS = simulatedPaidState(defaultState());
  const daily = pickToday(quests, D1);
  bonusS = await completeQuest(bonusS, daily, D1);
  const loopsBefore = loopsCompleted(bonusS);
  const completionsBefore = bonusS.quests.completions.length;
  const streakBefore = { ...bonusS.streak };
  const lastDateBefore = bonusS.quests.lastQuestCompletionDate;
  const xpBefore = bonusS.progress.totalXp;

  check('bonusQuestAvailable (paid, none yet today) → true', bonusQuestAvailable(bonusS, D1) === true);
  const bonusPick = pickBonusQuest(bonusS, D1);
  check('pickBonusQuest yields a quest for the paid user', !!bonusPick);
  check('pickBonusQuest NEVER picks today’s daily quest', bonusPick && bonusPick.id !== daily.id);

  const withBonus = await completeBonusQuest(bonusS, bonusPick, D1);
  check('completeBonusQuest awards +50 XP (same XP path as daily quests)', withBonus !== null && withBonus.progress.totalXp === xpBefore + XP_QUEST);
  check('bonus completion lands ONLY in the dedicated ledger', withBonus.quests.bonusCompletions.length === 1 && withBonus.quests.bonusCompletions[0].questId === bonusPick.id && withBonus.quests.bonusCompletions[0].date === D1);
  check('daily-loop ledger untouched: completions length unchanged', withBonus.quests.completions.length === completionsBefore);
  check('daily-loop ledger untouched: lastQuestCompletionDate unchanged', withBonus.quests.lastQuestCompletionDate === lastDateBefore);
  check('streak untouched by the bonus quest (no second credit)', JSON.stringify(withBonus.streak) === JSON.stringify(streakBefore));
  check('paywall trigger untouched: loopsCompleted unchanged', loopsCompleted(withBonus) === loopsBefore);
  check('bonus completion cannot fire the paywall (paid tier never sees it)', paywallSurface(withBonus, D1, true) === null);

  const secondBonus = await completeBonusQuest(withBonus, bonusPick, D1);
  check('a same-day SECOND bonus → rejected (one bonus per day)', secondBonus === null);
  const afterReopen = await loadState();
  check('bonus ledger persists across reopen; availability re-derives false', bonusQuestAvailable(afterReopen, D1) === false && afterReopen.quests.bonusCompletions.length === 1);
  check('next day: the paid bonus slot is available again', bonusQuestAvailable(afterReopen, D2) === true);

  // Free tier: no surface, no store path.
  const freeBonusState = defaultState();
  const freeRejected = await completeBonusQuest(freeBonusState, pickBonusQuest(freeBonusState, D1) ?? daily, D1);
  check('free tier: completeBonusQuest rejected (null, nothing persisted)', freeRejected === null);
  check('free tier: bonusQuestAvailable is false (the surface never renders)', bonusQuestAvailable(freeBonusState, D1) === false && pickBonusQuest(freeBonusState, D1) === undefined);

  // -------------------------------------------------------------------------
  // 4. Restore-stub honesty (Settings → Calm Quest+)
  // -------------------------------------------------------------------------

  const sub = new stubSub.StubSubscriptionService();
  check('stub isAvailable() → false (no store wired)', (await sub.isAvailable()) === false);
  const restored = await sub.restore();
  check('stub restore → ok:false, reason stub (honest: nothing to restore, never fake success)', restored.ok === false && restored.reason === 'stub' && restored.value === undefined);
  const purchased = await sub.purchase('yearly');
  check('stub purchase → ok:false, reason stub (never grants tier paid)', purchased.ok === false && purchased.reason === 'stub');

  // -------------------------------------------------------------------------
  // 5. Auth-stub honesty (F10) + merge carries bonusCompletions
  // -------------------------------------------------------------------------

  const auth = new stubAuth.StubAuthService();
  check('auth stub isAvailable() → false (no provider wired)', (await auth.isAvailable()) === false);
  const authAttempt = await auth.createOrSignIn();
  check('auth stub createOrSignIn → ok:false, reason stub, NO fabricated account', authAttempt.ok === false && authAttempt.reason === 'stub' && authAttempt.account === undefined);

  // mergeGuestState: bonus ledger unions in its OWN lane; a bonus quest can
  // never become a daily loop via a merge.
  const guestRich = defaultState();
  guestRich.quests.bonusCompletions = [{ date: D1, questId: 'gq1' }];
  guestRich.quests.completions = [{ date: D1, questId: 'dq1' }];
  guestRich.progress = { totalXp: 300, level: 3 };
  const accountPlain = defaultState();
  const merged = mergeGuestState(guestRich, accountPlain);
  check('merge: guest bonusCompletions survive in their own ledger', merged.quests.bonusCompletions.length === 1 && merged.quests.bonusCompletions[0].questId === 'gq1');
  check('merge: daily completions union stays separate from bonus ledger', merged.quests.completions.length === 1 && merged.quests.completions[0].questId === 'dq1');
  const mergedTwice = mergeGuestState(guestRich, merged);
  check('merge is idempotent for the bonus ledger (union dedups)', mergedTwice.quests.bonusCompletions.length === 1);

  // SIMULATED upgrade (labeled fixture, as in Phase 4a) lifts the cap.
  let cappedFree = defaultState();
  const q = { id: 'q', theme: 'gratitude', type: 'act', title: 't' };
  for (let i = 0; i < 12; i++) {
    cappedFree = (await completeQuest(cappedFree, q, day('2026-10-01', i))) ?? cappedFree;
  }
  check('12 free daily loops → 600 XP, held level 5 (prior behavior intact)', cappedFree.progress.totalXp === 600 && cappedFree.progress.level === 5);
  const upgraded = await applyEntitlement(cappedFree, { tier: 'paid' });
  check('simulated upgrade: level shows the real total (7), XP untouched', upgraded.progress.level === 7 && upgraded.progress.totalXp === 600);
  check('simulated upgrade: bonus slot opens the same day', bonusQuestAvailable(upgraded, D1) === true);

  // -------------------------------------------------------------------------
  // 6. Migration: pre-4b payloads load forward-compatible
  // -------------------------------------------------------------------------

  asyncStore.delete(STORAGE_KEY);
  const pre4b = defaultState();
  const { bonusCompletions, ...questsWithoutBonus } = pre4b.quests;
  await store.saveState({ ...pre4b, quests: questsWithoutBonus });
  const loadedPre4b = await loadState();
  check('pre-4b payload (no bonusCompletions field) loads as []', Array.isArray(loadedPre4b.quests.bonusCompletions) && loadedPre4b.quests.bonusCompletions.length === 0);
  check('loaded pre-4b state is otherwise intact (XP, tier, completions)', loadedPre4b.progress.totalXp === pre4b.progress.totalXp && loadedPre4b.entitlements.tier === 'free');

  await store.saveState({
    ...pre4b,
    quests: { ...questsWithoutBonus, bonusCompletions: 'junk-not-an-array' },
  });
  const loadedJunk = await loadState();
  check('junk non-array bonusCompletions loads as [] (no crash)', Array.isArray(loadedJunk.quests.bonusCompletions) && loadedJunk.quests.bonusCompletions.length === 0);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('PROOF ERROR:', e);
  process.exit(1);
});
