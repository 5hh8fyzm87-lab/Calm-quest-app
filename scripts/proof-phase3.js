/**
 * Phase 3 proof (node): honest streak-UI derivation across day sequences.
 *
 * Same technique as proof-phase2a.js: TS transpiled in-memory, native-only
 * modules faked. Proves the streak chip is HONEST on every day of Flow C:
 *  - secured when the last completion was today or yesterday
 *  - grace (same frozen streak, "grace remaining" shrinking) across missed days
 *  - resetsToday on the exact 3rd missed day (today = last chance)
 *  - fresh-start line after the window is fully past
 *  - completion on any grace day resumes the streak (13 after the spec's
 *    example: 12 → miss Mon, Tue → complete Wed)
 *  - the persisted ledger alone cannot mislead the chip (stale graceDaysMissed
 *    at rest is harmless)
 * Also proves the reminder-time parsing/formatting helpers (F7 time picker).
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
  // The native module never runs in node; only the pure helpers of
  // reminders.ts are under test here.
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

const ui = loadTs(path.join(REPO, 'src/streaks/ui.ts'));
const streak = loadTs(path.join(REPO, 'src/streaks/streak.ts'));
const reminders = loadTs(path.join(REPO, 'src/notifications/reminders.ts'));

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

// ---------------------------------------------------------------------------
// Day sequences (Flow C): complete Monday (completion day never counts as a
// miss; today never counts because it is still winnable).
// ---------------------------------------------------------------------------
const mon = '2026-09-07';
const tue = day(mon, 1);
const wed = day(mon, 2);
const thu = day(mon, 3);
const fri = day(mon, 4);

// Secured on the completion day and the day after.
const base = { streakDays: 12, graceDaysMissed: 0, lastQuestDate: mon };
let u = ui.streakUi(base, mon);
check('completion day → secured, 0 grace', u.status === 'secured' && u.missedDays === 0 && !u.inGrace, `status=${u.status} missed=${u.missedDays}`);
check('secured line says "Day 12 secured"', u.message.includes('Day 12 secured'));
u = ui.streakUi(base, tue);
check('next day, quest done today → still secured', u.status === 'secured' && u.missedDays === 0, `missed=${u.missedDays}`);

// Missed days: 1 → grace, 2 → grace, 3 → resets-today, 4 → fresh.
u = ui.streakUi(base, wed); // missed Mon→Tue = 1
check('1 missed day → grace, remaining 2', u.status === 'grace' && u.graceRemaining === 2 && u.resetsToday === false, `remaining=${u.graceRemaining}`);
check('grace keeps frozen streak value 12', u.message.includes('Day 12'));
check('grace line mentions remaining 2', u.message.includes('grace remaining: 2'));
u = ui.streakUi(base, thu); // missed Tue, Wed = 2
check('2 missed days → grace, remaining 1', u.status === 'grace' && u.graceRemaining === 1 && !u.resetsToday, `remaining=${u.graceRemaining}`);
u = ui.streakUi(base, fri); // missed Tue, Wed, Thu = 3 → last chance today
check('3 missed days → grace, resetsToday true', u.status === 'grace' && u.graceRemaining === 0 && u.resetsToday === true, `remaining=${u.graceRemaining} resets=${u.resetsToday}`);
check('last-chance line still grace (Day 12)', u.message.includes('Day 12') && u.message.includes('grace remaining: 0'));

// 4+ missed days → honest fresh start (even though the store's ledger still
// says streak 12/grace 0 — the store reconciles at the next completion, but
// the chip must NOT claim a secured streak the morning after the window).
u = ui.streakUi(base, day(mon, 5));
check('4 missed days → fresh-start line', u.status === 'fresh' && u.message.includes('fresh start'), `status=${u.status}`);
u = ui.streakUi(base, day(mon, 8));
check('8 missed days → still fresh, no pity count', u.status === 'fresh' && !u.message.includes('lost') && u.graceRemaining === 0);

// Completion on a grace day resumes the streak (spec example: 12 → miss Mon,
// Tue → complete Wed → 13).
const afterMiss = streak.applyMissDay(base, tue);
const afterComplete = streak.applyCompletion(afterMiss, wed);
check('spec example: 12 → miss 2 → complete Wed → 13', afterComplete.streakDays === 13 && afterComplete.graceDaysMissed === 0, `days=${afterComplete.streakDays}`);
u = ui.streakUi(afterComplete, wed);
check('resumed day → secured 13', u.status === 'secured' && u.message.includes('Day 13 secured'));

// Completing on the last-chance day (3rd miss) resumes too: 12 → 13.
const atEdge = streak.applyMissDay(streak.applyMissDay(streak.applyMissDay(base, tue), wed), thu);
const rescued = streak.applyCompletion(atEdge, fri);
check('last-chance completion rescues → 13', rescued.streakDays === 13 && rescued.graceDaysMissed === 0 && rescued.lastQuestDate === fri, `days=${rescued.streakDays}`);

// Ledger-at-rest honesty: a stale persisted graceDaysMissed (defensive) is
// overridden by the true calendar derivation, never underreported.
const stale = { streakDays: 5, graceDaysMissed: 0, lastQuestDate: day(mon, -3) };
check('calendar truth wins over stale ledger', ui.streakUi(stale, mon).status === 'grace', `status=${ui.streakUi(stale, mon).status}`);
const staleHigher = { streakDays: 5, graceDaysMissed: 2, lastQuestDate: day(mon, -3) };
check('ledger never underreports grace', ui.streakUi(staleHigher, mon).graceRemaining === 1);

// Fresh-start day when streak was never started.
u = ui.streakUi({ streakDays: 0, graceDaysMissed: 0, lastQuestDate: null }, mon);
check('streak 0 → fresh-start line', u.status === 'fresh' && u.message.includes('fresh start'));

// ---------------------------------------------------------------------------
// Tone guardrails (Flow C rule 6): the chip never speaks of loss or chains.
// ---------------------------------------------------------------------------
const messages = [
  ui.streakUi(base, wed).message,
  ui.streakUi(base, fri).message,
  ui.streakUi(base, day(mon, 5)).message,
  streak.STREAK_MESSAGES.secured(12),
].join(' ');
const banned = /(lost|broke|broken|flame|chain|penalty|gone)/i;
check('tone: no loss/broken/flame wording anywhere', !banned.test(messages), messages.slice(0, 60));

// ---------------------------------------------------------------------------
// Reminder helpers (F7): parse/format round-trips + sane fallback.
// ---------------------------------------------------------------------------
check('parse 08:00', reminders.parseReminderTime('08:00').hour === 8 && reminders.parseReminderTime('08:00').minute === 0);
check('parse 21:15', reminders.parseReminderTime('21:15').hour === 21 && reminders.parseReminderTime('21:15').minute === 15);
const bad = reminders.parseReminderTime('garbage');
check('garbage time → 08:00 fallback', bad.hour === 8 && bad.minute === 0);
check('format round-trip', reminders.formatReminderTime({ hour: 7, minute: 5 }) === '07:05');
check('format 08:00 → "08:00"', reminders.formatReminderTime(reminders.parseReminderTime('08:00')) === '08:00');

console.log(`\n${failures === 0 ? 'ALL PROOFS PASSED' : `${failures} PROOF(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);