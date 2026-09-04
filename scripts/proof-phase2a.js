/**
 * Phase 2a proof (node): content barrel loads + pickToday is deterministic,
 * in-range, and covers the bundle. TS is transpiled in-memory; relative
 * requires resolve against the real source layout via a virtual loader.
 * `npm run typecheck` already covers types — this proves runtime behavior.
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// Fakes for native-only modules (proof runs outside RN runtime).
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
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          return loadTs(c);
        }
      }
      // Non-TS relative (e.g. JSON) — resolution failure is a real bug.
      throw new Error(`unresolved relative import '${request}' from ${key}`);
    }
    return require(request);
  };
  cache.set(key, mod.exports); // set before executing (cycles tolerated)
  new Function('module', 'exports', 'require', '__filename', out)(
    mod,
    mod.exports,
    localRequire,
    key,
  );
  return mod.exports;
}

const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const streak = loadTs(path.join(REPO, 'src/streaks/streak.ts'));
const questsMod = loadTs(path.join(REPO, 'src/content/quests.ts'));
const affirmMod = loadTs(path.join(REPO, 'src/content/affirmations.ts'));
const rotation = loadTs(path.join(REPO, 'src/content/rotation.ts'));

const quests = questsMod.quests;
const affirmations = affirmMod.affirmations;

console.log('store loaded (defaultState):', typeof store.defaultState === 'function');
console.log('defaultProfile().onboarded === false:', store.defaultProfile().onboarded === false);
console.log('streak loaded (streakMessage):', typeof streak.streakMessage === 'function');
console.log('quests:', quests.length, 'affirmations:', affirmations.length);

// --- pickToday: deterministic for a fixed date, in-range ---
const fixed = '2026-09-04';
const t1 = rotation.pickToday(quests, fixed);
const t2 = rotation.pickToday(quests, fixed);
const a1 = rotation.pickToday(affirmations, fixed);
const a2 = rotation.pickToday(affirmations, fixed);
console.log('quest deterministic:', !!t1 && t1.id === t2.id, '->', t1 && t1.id);
console.log('affirm deterministic:', !!a1 && a1.id === a2.id, '->', a1 && a1.id);
console.log(
  'in-range quest:',
  !!t1 && quests.indexOf(t1) >= 0,
  '| in-range affirm:',
  !!a1 && affirmations.indexOf(a1) >= 0,
);
console.log('today quest:', t1 ? `${t1.id} | theme=${t1.theme} | type=${t1.type} | "${t1.title}"` : 'UNDEFINED');
console.log('today affirm:', a1 ? `${a1.id} | theme=${a1.theme} | "${a1.text.slice(0, 42)}"` : 'UNDEFINED');

// --- 30-day coverage: every day resolves, all quest ids rotate ---
const seen = new Set();
let unresolved = 0;
const startMs = Date.UTC(2026, 8, 4); // 2026-09-04
for (let i = 0; i < 30; i++) {
  const d = new Date(startMs + i * 86400000);
  const ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
  const q = rotation.pickToday(quests, ds);
  if (!q) unresolved++;
  else seen.add(q.id);
}
console.log(`30-day span: ${unresolved} unresolved, ${seen.size} distinct quests seen`);

// --- streak copy helpers with a sample state (grace tone) ---
const graceState = { streakDays: 12, graceDaysMissed: 2, lastQuestDate: null };
console.log('grace streakStatus:', streak.streakStatus(graceState));
console.log('grace streakMessage:', streak.streakMessage(graceState));
console.log('fresh streakMessage:', streak.streakMessage({ streakDays: 0, graceDaysMissed: 0, lastQuestDate: null }));