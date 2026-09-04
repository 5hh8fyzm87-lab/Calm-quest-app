/**
 * Phase 5 proof (node): Settings + delete-data + analytics seam (spec §3 F9/S5).
 *
 * Same technique as proof-phase4b.js: TS transpiled in-memory, native-only
 * modules faked (stateful AsyncStorage lets the proof simulate close-and-reopen
 * through the real loadState path). Proves:
 *  1. Delete my data (F9, GDPR/App Store): a RICH persisted state is wiped to
 *     a TRUE fresh-install state — `deleteAllData` returns (and persistence
 *     holds) deep equality with `defaultState()`; glimpses, streak, XP/level,
 *     quest completions, bonus completions, saved affirmations, entitlements,
 *     paywall stamp, reminder + sound prefs are all gone; `profile.onboarded`
 *     is false again so RootNavigator routes the very next screen to
 *     Onboarding (fresh user). Idempotent on repeat. The pure wipe
 *     (`resetAllState`) is itself identity-equal to the initial state.
 *  2. Sound pref (F9): defaults ON in a fresh install; a pre-5 payload without
 *     the field loads with soundEnabled=true (forward-compatible); the
 *     setSoundPref round-trip persists and reads back.
 *  3. Log-out honesty (F9): the AuthService seam isAvailable() → false — the
 *     Settings row can only ever render the honest "coming soon" note, never a
 *     fabricated signed-out state.
 *  4. Analytics seam (S5): typed, exists, console-capturable in dev (every
 *     spec event + level_up/restore_requested fire and are visible), never
 *     throws, and is a strict no-op when __DEV__ is false (no fake sends).
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');

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

const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const analytics = loadTs(path.join(REPO, 'src/analytics/index.ts'));
const stubAuth = loadTs(path.join(REPO, 'src/subscription/authStub.ts'));

const {
  defaultState,
  loadState,
  saveState,
  resetAllState,
  deleteAllData,
  setSoundPref,
  STORAGE_KEY,
} = store;
const { StubAnalyticsProvider, analytics: analyticsInstance } = analytics;
const { StubAuthService } = stubAuth;

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  -> ${extra}` : ''}`);
}

/** A RICH, realistic pre-delete state (every deletable bucket filled). */
function richState() {
  const s = defaultState();
  s.profile = {
    ...s.profile,
    onboarded: true,
    displayName: 'Test User',
    weekCheckIn: 'steady',
    timeAvailable: 'ten_min',
    reminderEnabled: false,
    reminderTime: '21:15',
    soundEnabled: false,
  };
  s.progress = { totalXp: 745, level: 5 };
  s.streak = { streakDays: 12, graceDaysMissed: 0, lastQuestDate: '2026-09-20' };
  s.quests = {
    completedQuestIds: ['q1', 'q2'],
    completions: [
      { date: '2026-09-18', questId: 'q1' },
      { date: '2026-09-19', questId: 'q2' },
    ],
    lastQuestCompletionDate: '2026-09-20',
    bonusCompletions: [{ date: '2026-09-19', questId: 'bq1' }],
  };
  s.savedAffirmationIds = ['af1', 'af2'];
  s.glimpses = [
    { id: 'glimpse-2026-09-18', date: '2026-09-18', text: 'quiet morning', promptId: 'p1' },
    { id: 'glimpse-2026-09-19', date: '2026-09-19', text: 'warm tea', promptId: 'p2' },
  ];
  s.entitlements = { tier: 'paid', expiry: '2026-12-01T00:00:00.000Z' };
  s.paywallSeenAt = '2026-09-10';
  return s;
}

/**
 * Normalize a state for byte-identity comparison: `profile.createdAt` is a
 * wall-clock timestamp minted at defaultState() time, so two fresh states
 * created milliseconds apart differ by design. Everything else is compared
 * byte-for-byte; the per-field checks below prove each bucket is actually
 * wiped/reset.
 */
function normalize(s) {
  const { createdAt, ...profileRest } = s.profile;
  return { ...s, profile: { ...profileRest, createdAt: '<fresh>' } };
}

(async () => {
  // -------------------------------------------------------------------------
  // 1. Delete my data (F9) — wipes a rich state to a true fresh install
  // -------------------------------------------------------------------------

  const initial = defaultState();
  const initialJson = JSON.stringify(normalize(initial));

  check(
    'pure wipe resetAllState() is identity-equal to defaultState()',
    JSON.stringify(normalize(resetAllState())) === initialJson,
  );

  // Persist a rich state, then delete through the REAL storage path.
  const rich = richState();
  await saveState(rich);
  const storedBefore = await loadState();
  check(
    'rich fixture actually persisted (streak 12, XP 745, 2 glimpses, paid)',
    storedBefore.streak.streakDays === 12 &&
      storedBefore.progress.totalXp === 745 &&
      storedBefore.glimpses.length === 2 &&
      storedBefore.entitlements.tier === 'paid',
  );

  const wiped = await deleteAllData();
  const reloaded = await loadState();
  check(
    'deleteAllData returns the fresh state (deep-equal to initial, normalized createdAt)',
    JSON.stringify(normalize(wiped)) === initialJson,
  );
  check(
    'store is FULLY wiped: reloaded state deep-equals initial state (normalized)',
    JSON.stringify(normalize(reloaded)) === initialJson,
  );
  check(
    'streak gone (0 days, no grace, no last date)',
    reloaded.streak.streakDays === 0 &&
      reloaded.streak.graceDaysMissed === 0 &&
      reloaded.streak.lastQuestDate === null,
  );
  check(
    'XP/level gone (0 XP, level 1)',
    reloaded.progress.totalXp === 0 && reloaded.progress.level === 1,
  );
  check('glimpses archive gone', reloaded.glimpses.length === 0);
  check(
    'quest completions + bonus completions gone, no completed ids',
    reloaded.quests.completions.length === 0 &&
      reloaded.quests.bonusCompletions.length === 0 &&
      reloaded.quests.completedQuestIds.length === 0 &&
      reloaded.quests.lastQuestCompletionDate === null,
  );
  check('saved affirmations gone', reloaded.savedAffirmationIds.length === 0);
  check(
    'entitlements snapshot gone (back to free — no fabricated paid tier)',
    reloaded.entitlements.tier === 'free' && reloaded.entitlements.expiry === undefined,
  );
  check('paywall stamp gone', reloaded.paywallSeenAt === null);
  check(
    'reminder + sound prefs reset to defaults (reminder ON 08:00, sound ON)',
    reloaded.profile.reminderEnabled === true &&
      reloaded.profile.reminderTime === '08:00' &&
      reloaded.profile.soundEnabled === true,
  );
  check(
    'ONBOARDING IS THE NEXT SCREEN: profile.onboarded is false again (the root navigator boots a fresh user)',
    reloaded.profile.onboarded === false,
  );
  check(
    'raw AsyncStorage payload parses to the fresh state (nothing left over)',
    JSON.stringify(normalize(JSON.parse(asyncStore.get(STORAGE_KEY)))) === initialJson,
  );
  check(
    'deleteAllData is idempotent (second delete stays fresh)',
    JSON.stringify(normalize(await deleteAllData())) === initialJson &&
      JSON.stringify(normalize(await loadState())) === initialJson,
  );
  check(
    'deleting a FRESH state is a no-op (still fresh)',
    JSON.stringify(normalize(await deleteAllData())) === initialJson,
  );

  // -------------------------------------------------------------------------
  // 2. Sound pref (F9): default ON, forward-compatible load, round-trip
  // -------------------------------------------------------------------------

  check('fresh install: soundEnabled defaults to true', initial.profile.soundEnabled === true);

  // Pre-5 payload without the soundEnabled field → loads with the default.
  asyncStore.delete(STORAGE_KEY);
  const noSound = defaultState();
  delete noSound.profile.soundEnabled;
  await saveState(noSound);
  const loadedNoSound = await loadState();
  check(
    'pre-Phase-5 payload (no soundEnabled field) loads with soundEnabled=true',
    loadedNoSound.profile.soundEnabled === true,
  );

  // Round-trip: off → persisted → read back off; on → read back on.
  let s = defaultState();
  s = await setSoundPref(s, false);
  check('setSoundPref(false) persists soundEnabled=false', s.profile.soundEnabled === false);
  const reloadOff = await loadState();
  check('close-and-reopen: sound pref reads back false', reloadOff.profile.soundEnabled === false);
  s = await setSoundPref(reloadOff, true);
  const reloadOn = await loadState();
  check(
    'setSoundPref(true) persists back to on (toggle round-trip)',
    s.profile.soundEnabled === true && reloadOn.profile.soundEnabled === true,
  );

  // -------------------------------------------------------------------------
  // 3. Log-out honesty (F9): the auth seam stays stubbed
  // -------------------------------------------------------------------------

  const auth = new StubAuthService();
  check(
    'auth isAvailable() → false (Settings shows the honest "coming soon" note; a logout row can NEVER fabricate a signed-out state)',
    (await auth.isAvailable()) === false,
  );

  // -------------------------------------------------------------------------
  // 4. Analytics seam (S5): typed surface, console-capturable, never throws
  // -------------------------------------------------------------------------

  const ALL_EVENTS = [
    'quest_completed',
    'glimpse_completed',
    'affirmation_saved',
    'streak_greater_than_0',
    'grace_used',
    'paywall_seen',
    'trial_started',
    'trial_converted',
    'unsubscribed',
    'level_up',
    'restore_requested',
  ];

  // Install a capture for console.debug while the stub is in dev mode.
  const seen = [];
  const originalDebug = console.debug;
  console.debug = (...args) => {
    seen.push(
      args
        .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
        .join(' '),
    );
  };

  let threw = false;
  try {
    analyticsInstance.track('quest_completed', { questId: 'q1', type: 'act' });
    analyticsInstance.track('glimpse_completed', { promptId: 'p1', tier: 'free' });
    analyticsInstance.track('affirmation_saved', { affirmationId: 'af1' });
    analyticsInstance.track('streak_greater_than_0', { streakDays: 12 });
    analyticsInstance.track('grace_used', { graceDays: 2 });
    analyticsInstance.track('paywall_seen', { source: 'auto' });
    analyticsInstance.track('trial_started', { plan: 'monthly' });
    analyticsInstance.track('trial_converted', { plan: 'yearly', expiry: null });
    analyticsInstance.track('unsubscribed', {});
    analyticsInstance.track('level_up', { level: 3, totalXp: 220 });
    analyticsInstance.track('restore_requested', {});
  } catch (e) {
    threw = true;
    console.error('analytics threw:', e);
  }

  check('the stub analytics provider never throws across all events', !threw);
  check(
    'every event fired and is console-capturable in dev (11 events logged)',
    seen.length === ALL_EVENTS.length,
    `logged=${seen.length}`,
  );
  check(
    'which events are the spec S5 set + level_up + restore_requested (union intact)',
    ALL_EVENTS.every((ev) => seen.some((line) => line.includes(`[analytics] ${ev}`))),
  );
  check(
    'event params travel with the event (no PII by convention — ids/types only)',
    seen.some((l) => l.includes('questId') && l.includes('q1') && l.includes('type') && l.includes('act')),
  );

  // No-op path: with __DEV__ falsy the stub logs NOTHING — it never fabricates
  // a send, and never claims one.
  const hadDev = Object.prototype.hasOwnProperty.call(globalThis, '__DEV__');
  const devWas = globalThis.__DEV__;
  globalThis.__DEV__ = false;
  seen.length = 0;
  let noOpNoThrow = true;
  try {
    analyticsInstance.track('quest_completed', { questId: 'x' });
    analyticsInstance.track('paywall_seen', { source: 'growth' });
  } catch {
    noOpNoThrow = false;
  }
  check(
    'non-dev: track is a strict no-op and never throws (nothing sent, nothing claimed)',
    noOpNoThrow && seen.length === 0,
  );
  if (hadDev) globalThis.__DEV__ = devWas;
  else delete globalThis.__DEV__;

  // Provider identity: a real provider swaps in behind the same instance.
  check(
    'provider name is "console" (honest stub identity; real provider swaps in ./index.ts)',
    analyticsInstance.name === 'console',
  );
  check('StubAnalyticsProvider constructs and matches the seam instance', new StubAnalyticsProvider().name === 'console');

  console.debug = originalDebug;

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('PROOF ERROR:', e);
  process.exit(1);
});