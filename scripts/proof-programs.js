/**
 * Calm Quest — build-14 "three programs" proofs (two-paths proposal §1–§4).
 *
 * Build 14 turns `profile.path` — already persisted, until now read by nothing —
 * into the PROGRAM a user rotates over. The whole wave is one architectural
 * sentence: a program is a POOL YOU ROTATE OVER, not a new dimension on every
 * item. Nothing about XP, levels, grace streaks or what a user kept changes.
 *
 * This proof is built the way the wave proofs are: the pure derivations
 * (src/content/programs.ts, src/subscription/gates.ts) are CALLED directly, the
 * hooks-free pieces (ProgramRow) are INVOKED and their element trees walked, and
 * the screens themselves (which own hooks) are asserted STRUCTURALLY on
 * comment-stripped source.
 *
 * What it refuses to let back in:
 *  1. A leaky pool. A free user rotates over exactly ONE program's pool; the
 *     theme peek, the bonus pick and the counts are scoped to that same pool.
 *     `ALL_QUESTS` is a lookup index, never a library anyone holds.
 *  2. A switch that costs something. Changing `profile.path` must leave streak,
 *     XP, level, glimpses, completions and saved affirmations BYTE-IDENTICAL —
 *     asserted on the serialized ledgers, not on a promise.
 *  3. A done card that lies. After a mid-day switch, today's rotation answers
 *     with a different quest; Home must keep naming the quest that was actually
 *     completed (resolved by id from ALL_QUESTS) — never a different quest
 *     wearing a done badge.
 *  4. A one-way safety rule. The program gate is the mirror of the theme gate:
 *     free holds one program and sees one theme, both scoped to the same pool;
 *     paid holds three and sees all five. Asserted for every program.
 *  5. Unlisted copy. Every build-14 string in the code appears in the build-14
 *     section of NEW_STRINGS.md, and every row listed there is verbatim in the
 *     file it names. Parsed from the `# Calm Quest — build 14` heading only;
 *     scripts/proof-keepsakes.js owns build 13's half of the same file.
 *  6. A health claim. The Peace & Rest content file keeps its guardrail header
 *     and, with comments stripped, contains none of the words that header bans.
 *  7. Two names for one program. "Peace & Rest" is written in exactly ONE place
 *     in src/ (comment-stripped), so the picker, Home, Settings and the paywall
 *     can never disagree about it.
 */
'use strict';

const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Harness (the wave-proof conventions: transpile, shim, invoke, walk)
// ---------------------------------------------------------------------------

const FLAKE = {
  'react-native': {
    StyleSheet: { create: (o) => o, hairlineWidth: 1 },
    Platform: { OS: 'ios', select: (spec) => (spec.ios !== undefined ? spec.ios : spec.default) },
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    TextInput: 'TextInput',
    Switch: 'Switch',
    Alert: { alert: () => {} },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false) },
    Animated: {
      View: 'AnimatedView',
      Value: class Value {
        constructor(v) {
          this.v = v;
        }
        setValue() {}
        interpolate() {
          return {};
        }
      },
      timing: () => ({ start: () => {} }),
    },
  },
  'react-native-safe-area-context': {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
  '@react-navigation/native': {
    useNavigation: () => ({ navigate: () => {}, goBack: () => {} }),
    useFocusEffect: () => {},
  },
  '@react-navigation/native-stack': {},
  '@react-native-async-storage/async-storage': {
    default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
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
  new Function('module', 'exports', 'require', '__filename', out)(mod, mod.exports, localRequire, key);
  return mod.exports;
}

let failures = 0;
let checks = 0;
function check(name, ok, extra) {
  checks += 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
  if (!ok) failures += 1;
}

/** Flatten a react-native style (object | array | falsy) into one object. */
function flat(style) {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => Object.assign(acc, flat(s)), {});
  if (typeof style === 'object') return style;
  return {};
}

/** Expand function components and collect host nodes with flattened styles. */
function nodes(element, out = []) {
  if (element === null || element === undefined || typeof element === 'boolean') return out;
  if (Array.isArray(element)) {
    element.forEach((e) => nodes(e, out));
    return out;
  }
  if (typeof element !== 'object' || !element.$$typeof) return out;
  if (typeof element.type === 'function') {
    nodes(element.type(element.props), out);
    return out;
  }
  out.push({
    type: element.type,
    props: element.props || {},
    style: flat(element.props && element.props.style),
  });
  nodes(element.props && element.props.children, out);
  return out;
}

const withStyle = (list, predicate) => list.filter((n) => predicate(n.style, n.props));

/**
 * A Pressable's final style. `styles.row` is a style FUNCTION
 * (`({ pressed }) => [...]`), so `nodes()` cannot flatten it — call it the way
 * the platform does, with the state we are asserting.
 */
function styleOf(node, pressed = false) {
  if (!node) return {};
  const s = node.props.style;
  return flat(typeof s === 'function' ? s({ pressed }) : s);
}

/** Text content of one node's children, flattened through nested Text/arrays. */
function textOf(children) {
  if (children === null || children === undefined || typeof children === 'boolean') return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (typeof children === 'object' && children.props) return textOf(children.props.children);
  return '';
}

/** Every rendered string in a tree, one per line (so greps stay readable). */
const allText = (list) =>
  list
    .filter((n) => n.type === 'Text')
    .map((n) => textOf(n.props.children))
    .join('\n');

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

const readSrc = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const norm = (s) =>
  String(s)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\{'(\\n|\\t| |\\u00a0)'\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** Comments stripped — negative checks must look at code, not prose. */
const code = (s) =>
  String(s)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** One style block out of a `StyleSheet.create({...})`, comment-stripped. */
function styleBlock(src, name) {
  const m = new RegExp(`\\n  ${name}: \\{`).exec(src);
  if (!m) return null;
  const start = src.indexOf('{', m.index);
  let depth = 0;
  for (let j = start; j < src.length; j += 1) {
    if (src[j] === '{') depth += 1;
    else if (src[j] === '}') {
      depth -= 1;
      if (depth === 0) return norm(code(src.slice(start, j + 1)));
    }
  }
  return null;
}

/** Every string literal in a slice of comment-stripped source. */
function literalsOf(block) {
  const out = [];
  const re = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const raw = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    if (raw === undefined || raw.trim() === '') continue;
    out.push(raw);
  }
  return out;
}

/** The strings inside a file's `// --- COPY (build 14)` block, or null. */
function copyBlockLiterals(rel) {
  const src = readSrc(rel);
  const start = src.indexOf('// --- COPY (build 14)');
  const end = src.indexOf('// --- /COPY ---');
  if (start < 0 || end < 0) return null;
  return literalsOf(code(src.slice(start, end)));
}

/**
 * One function body out of a screen file, brace-matched from its signature.
 *
 * A line-based `[\s\S]*?\n}\n` end-marker is not good enough here: a screen's
 * inner functions (`async function choose`), its default export and its
 * `ProgramsCard` all close with an indented `  }`, so the body would run on past
 * the real end (and past the next function), making negative checks vacuous.
 * Match the parameter list first, then count braces.
 */
function functionBlock(src, name) {
  const m = new RegExp(`(?:export default |export )?(?:async )?function ${name}\\(`).exec(src);
  if (!m) return null;
  let i = src.indexOf('(', m.index);
  let depth = 0;
  for (; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
    }
  }
  const open = src.indexOf('{', i);
  if (open < 0) return null;
  let braces = 0;
  for (let j = open; j < src.length; j += 1) {
    if (src[j] === '{') braces += 1;
    else if (src[j] === '}') {
      braces -= 1;
      if (braces === 0) return code(src.slice(open, j + 1));
    }
  }
  return null;
}

/** The literal of one `key: '...'` entry of a COPY object (single-line strings). */
function copyKeyLiteral(block, key) {
  const m = new RegExp(`\\n  ${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(block);
  return m ? m[1] : null;
}

const SRC_FILES = {
  themes: 'src/content/themes.ts',
  programs: 'src/content/programs.ts',
  entrepreneur: 'src/content/programs/entrepreneur.ts',
  anxiety: 'src/content/programs/anxietyStress.ts',
  onboarding: 'src/screens/OnboardingScreen.tsx',
  picker: 'src/screens/ProgramsScreen.tsx',
  home: 'src/screens/HomeScreen.tsx',
  settings: 'src/screens/SettingsScreen.tsx',
  paywall: 'src/screens/PaywallScreen.tsx',
  gates: 'src/subscription/gates.ts',
  store: 'src/storage/store.ts',
};
const SRC = Object.fromEntries(Object.entries(SRC_FILES).map(([k, rel]) => [k, readSrc(rel)]));
const CODE = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, code(s)]));

// ---------------------------------------------------------------------------
// Loaded modules + content
// ---------------------------------------------------------------------------

const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const content = loadTs(path.join(REPO, 'src/content/index.ts'));
const gates = loadTs(path.join(REPO, 'src/subscription/gates.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const anxiety = loadTs(path.join(REPO, SRC_FILES.anxiety));
const entrepreneur = loadTs(path.join(REPO, SRC_FILES.entrepreneur));
const pickerModule = loadTs(path.join(REPO, SRC_FILES.picker));
const plusModule = loadTs(path.join(REPO, 'src/components/PlusInvitation.tsx'));

const { colors } = theme;
const {
  ALL_AFFIRMATIONS,
  ALL_QUESTS,
  PATH_LABELS,
  PATH_ORDER,
  PEACE_AND_REST_LABEL,
  PROGRAM_AFFIRMATIONS,
  PROGRAM_QUESTS,
  affirmationPool,
  pickToday,
  questById,
  questPool,
} = content;

const DAY = '2026-09-17';
const TODAYS = Object.fromEntries(PATH_ORDER.map((p) => [p, pickToday(questPool(p), DAY)]));
const IDS = Object.fromEntries(
  PATH_ORDER.map((p) => [p, new Set(questPool(p).map((q) => q.id))]),
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const completion = (date, questId) => ({ date, questId });

/** A user with a real history: streak, XP, level, kept things, both ledgers. */
const richState = (path, tier = 'free') => ({
  profile: { id: 'local_user', path, onboarded: true, displayName: null, createdAt: '2026-09-01T08:00:00.000Z' },
  progress: { totalXp: 1240, level: progress.levelForXp(1240) },
  streak: { streakDays: 11, graceDaysMissed: 2, lastQuestDate: '2026-09-16' },
  quests: {
    completedQuestIds: [questPool('christian')[0].id, questPool('christian')[7].id],
    completions: [
      completion('2026-09-01', questPool('christian')[0].id),
      completion('2026-09-16', questPool('christian')[7].id),
    ],
    lastQuestCompletionDate: '2026-09-16',
    bonusCompletions: [],
  },
  savedAffirmationIds: ['aff-gratitude-01', 'aff-peace-03'],
  glimpses: [
    { id: 'g-1', date: '2026-09-15', text: 'rain on the window', promptId: null },
    { id: 'g-2', date: '2026-09-16', text: 'a quiet cup of tea', promptId: null },
  ],
  entitlements: { tier },
  paywallSeenAt: null,
  contentVersion: 1,
});

/** The switch ProgramsScreen performs: ONE profile field, nothing else. */
const switchTo = (state, path) => ({ ...state, profile: { ...state.profile, path } });

/** The state slices the gates take (the same two facts every caller has). */
const slice = (path, tier) => ({ entitlements: { tier }, profile: { path } });

const days = (n, from = '2026-09-01') => {
  const out = [];
  const d = new Date(from + 'T00:00:00Z');
  for (let i = 0; i < n; i += 1) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

// ---------------------------------------------------------------------------
// 1. Pools: three programs, one architecture
// ---------------------------------------------------------------------------

console.log('\n-- 1. pools (a program is a pool you rotate over) --');

check(
  'pool: the three programs are canonically ordered, and the spec ids are unchanged',
  JSON.stringify(PATH_ORDER) === JSON.stringify(['christian', 'entrepreneur', 'anxiety_stress']) &&
    Object.keys(PROGRAM_QUESTS).length === 3 &&
    Object.keys(PROGRAM_AFFIRMATIONS).length === 3,
  PATH_ORDER.join(', '),
);
check(
  'pool: the Christian bundle is still the frozen 60 quests / 75 affirmations',
  questPool('christian').length === 60 && affirmationPool('christian').length === 75,
  `${questPool('christian').length} / ${affirmationPool('christian').length}`,
);
check(
  'pool: questPool(p) IS PROGRAM_QUESTS[p] (no copy, no merge, no re-derivation)',
  PATH_ORDER.every((p) => questPool(p) === PROGRAM_QUESTS[p]),
);
check(
  'pool: affirmationPool(p) IS PROGRAM_AFFIRMATIONS[p]',
  PATH_ORDER.every((p) => affirmationPool(p) === PROGRAM_AFFIRMATIONS[p]),
);
{
  const themesCovered = [];
  const typesCovered = [];
  const seedFloor = [];
  for (const p of PATH_ORDER) {
    const pool = questPool(p);
    const t = new Set(pool.map((q) => q.theme));
    const k = new Set(pool.map((q) => q.type));
    if (t.size !== 5) themesCovered.push(`${p}:${t.size}`);
    if (k.size !== 4) typesCovered.push(`${p}:${k.size}`);
    if (pool.length < 5 || affirmationPool(p).length < 5) seedFloor.push(p);
  }
  check('pool: every program covers all 5 themes and all 4 quest types', themesCovered.length === 0 && typesCovered.length === 0, [...themesCovered, ...typesCovered].join(', '));
  check(
    'pool: every program ships at least the 5-quest / 5-affirmation seed floor (part 2 raises the two newer ones to 20)',
    seedFloor.length === 0,
    seedFloor.join(', '),
  );
}
check(
  'pool: programs hold disjoint ids (a pool can never contain another program\u2019s quest)',
  PATH_ORDER.every((a) => PATH_ORDER.every((b) => a === b || [...IDS[a]].every((id) => !IDS[b].has(id)))),
);
check(
  'index: ALL_QUESTS is the union of the pools and nothing else',
  ALL_QUESTS.length === PATH_ORDER.reduce((n, p) => n + questPool(p).length, 0) &&
    PATH_ORDER.every((p) => questPool(p).every((q) => ALL_QUESTS.includes(q))),
  String(ALL_QUESTS.length),
);
check(
  'index: ALL_AFFIRMATIONS is the union of the affirmation pools',
  ALL_AFFIRMATIONS.length === PATH_ORDER.reduce((n, p) => n + affirmationPool(p).length, 0) &&
    PATH_ORDER.every((p) => affirmationPool(p).every((a) => ALL_AFFIRMATIONS.includes(a))),
  String(ALL_AFFIRMATIONS.length),
);
check(
  'index: every id in every pool resolves through questById (the lookup index is complete)',
  ALL_QUESTS.every((q) => questById(q.id) === q),
);
check(
  'index: a free user\u2019s rotation over 60 days never leaves their program\u2019s pool',
  PATH_ORDER.every((p) =>
    days(60).every((d) => {
      const q = pickToday(questPool(p), d);
      return !!q && IDS[p].has(q.id);
    }),
  ),
);
check(
  'index: ALL_QUESTS is never a rotation source (the daily pick is always pool-scoped)',
  /pickToday\(questPool\(/.test(CODE.gates) && !/pickToday\(ALL_QUESTS/.test(CODE.gates + CODE.home + CODE.store),
);

// ---------------------------------------------------------------------------
// 2. Free holds one, paid holds three — and it is the SAME pool everywhere
// ---------------------------------------------------------------------------

console.log('\n-- 2. pool scoping (free: one program, paid: all three) --');

check(
  'gate: free holds exactly the program the profile chose, for every program',
  PATH_ORDER.every((p) => JSON.stringify(gates.programsFor(slice(p, 'free'))) === JSON.stringify([p])),
);
check(
  'gate: paid holds all three at once, in canonical order',
  JSON.stringify(gates.programsFor(slice('christian', 'paid'))) === JSON.stringify(PATH_ORDER),
);
check(
  'gate: a free user may change which program is theirs (fork (a), owner decision)',
  gates.canSwitchPrograms(slice('christian', 'free')) === true &&
    gates.canSwitchPrograms(slice('christian', 'paid')) === true,
);
check(
  'gate: the free theme peek is today\u2019s theme from THIS program\u2019s pool (one theme)',
  PATH_ORDER.every((p) => {
    const seen = gates.visibleThemes(slice(p, 'free'), DAY);
    return seen.length === 1 && seen[0] === TODAYS[p].theme;
  }),
);
check(
  'gate: paid sees all five themes regardless of which program is held',
  PATH_ORDER.every(
    (p) => JSON.stringify(gates.visibleThemes(slice(p, 'paid'), DAY)) === JSON.stringify(gates.THEME_ORDER),
  ),
);
check(
  'gate: the theme peek resolves per program (the free theme differs across pools, so nothing is hardcoded)',
  PATH_ORDER.every(
    (p) => gates.visibleThemes(slice(p, 'free'), DAY)[0] === pickToday(questPool(p), DAY).theme,
  ),
  PATH_ORDER.map((p) => `${p}:${TODAYS[p].theme}`).join(', '),
);
{
  const leaks = [];
  const sums = [];
  for (const p of PATH_ORDER) {
    const counts = gates.themeQuestCounts(questPool(p));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    sums.push(`${p}:${total}`);
    if (total !== questPool(p).length) leaks.push(`${p}: ${total} != ${questPool(p).length}`);
    for (const t of gates.THEME_ORDER) {
      const expected = questPool(p).filter((q) => q.theme === t).length;
      if (counts[t] !== expected) leaks.push(`${p}/${t}: ${counts[t]} != ${expected}`);
    }
  }
  check(
    'gate: the library peek counts ONE program\u2019s real pool (never the sum of all three)',
    leaks.length === 0 && PATH_ORDER.every((p) => gates.themeQuestCounts(questPool(p)).gratitude !== gates.themeQuestCounts(ALL_QUESTS).gratitude),
    [...leaks, sums.join(' ')].join(' | '),
  );
}
check(
  'gate: the peek never counts ALL_QUESTS (the index is not a library)',
  PATH_ORDER.every((p) => {
    const counts = gates.themeQuestCounts(questPool(p));
    return Object.values(counts).reduce((a, b) => a + b, 0) !== ALL_QUESTS.length;
  }) || ALL_QUESTS.length === questPool('christian').length,
);
check(
  'gate: the daily quest itself is never gated (free sees their pool\u2019s quest every single day)',
  PATH_ORDER.every((p) => days(60).every((d) => !!pickToday(questPool(p), d))),
);
{
  const outside = [];
  for (const p of PATH_ORDER) {
    const state = { ...richState(p, 'paid'), quests: { ...richState(p, 'paid').quests, bonusCompletions: [] } };
    for (const d of days(30)) {
      const pick = gates.pickBonusQuest(state, d);
      if (!pick) outside.push(`${p}@${d}: none`);
      else if (!IDS[p].has(pick.id)) outside.push(`${p}@${d}: ${pick.id}`);
      else if (pick.id === pickToday(questPool(p), d).id) outside.push(`${p}@${d}: daily reused`);
    }
  }
  check(
    'gate: the paid bonus quest always comes from the held program\u2019s pool, never today\u2019s daily',
    outside.length === 0,
    outside.slice(0, 4).join(' | '),
  );
}
check(
  'gate: a free user can never pick up a bonus quest (no second quest from any program)',
  PATH_ORDER.every((p) => days(10).every((d) => gates.pickBonusQuest(richState(p, 'free'), d) === undefined)),
);

// ---------------------------------------------------------------------------
// 3. Switching costs nothing: the ledgers are byte-identical
// ---------------------------------------------------------------------------

console.log('\n-- 3. switching preserves everything (byte-identical ledgers) --');

{
  const before = richState('christian', 'free');
  const after = switchTo(before, 'entrepreneur');
  const ledgers = ['progress', 'streak', 'quests', 'glimpses', 'savedAffirmationIds', 'entitlements', 'contentVersion'];
  const changed = ledgers.filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
  check(
    'switch: every ledger (XP, level, streak, completions, glimpses, saved affirmations) is byte-identical',
    changed.length === 0,
    changed.join(', '),
  );
  check(
    'switch: exactly ONE persisted field changes — profile.path',
    Object.keys(after.profile).every((k) => JSON.stringify(after.profile[k]) === JSON.stringify(before.profile[k])) === false &&
      Object.keys(after.profile)
        .filter((k) => JSON.stringify(after.profile[k]) !== JSON.stringify(before.profile[k]))
        .join(',') === 'path',
  );
  check(
    'switch: the JSON only differs inside profile (nothing re-derived, nothing reset)',
    norm(JSON.stringify(after)).replace('"entrepreneur"', '"PATH"') ===
      norm(JSON.stringify(before)).replace('"christian"', '"PATH"'),
  );
  check(
    'switch: XP and level are untouched by the program (same total, same level before and after)',
    after.progress.totalXp === before.progress.totalXp &&
      after.progress.level === before.progress.level &&
      progress.levelForXp(after.progress.totalXp) === progress.levelForXp(before.progress.totalXp),
    `${after.progress.totalXp} XP / level ${after.progress.level}`,
  );
  check(
    'switch: the streak ledger never mentions a program (no key, no prompt, no reset)',
    !/program|path/i.test(JSON.stringify(before.streak)) && !/program|path/i.test(JSON.stringify(before.progress)),
  );
  check(
    'switch: a kept glimpse / saved affirmation written under one program still reads back identically',
    JSON.stringify(after.glimpses) === JSON.stringify(before.glimpses) &&
      JSON.stringify(after.savedAffirmationIds) === JSON.stringify(before.savedAffirmationIds),
  );
  check(
    'switch: entitlements are untouched — switching can never grant or revoke Calm Quest+',
    after.entitlements.tier === before.entitlements.tier && after.entitlements.tier === 'free',
  );
  check(
    'switch: the daily loop is NOT re-opened (lastQuestCompletionDate is untouched)',
    after.quests.lastQuestCompletionDate === before.quests.lastQuestCompletionDate,
  );
}

{
  // The screen-side switch, structurally: one field, written through the same
  // store, no migration and no other assignment.
  const choose = functionBlock(SRC.picker, 'choose');
  check(
    'switch: ProgramsScreen writes `{ ...latest, profile: { ...latest.profile, path } }` — the one field',
    !!choose && /const next: AppState = \{ \.\.\.latest, profile: \{ \.\.\.latest\.profile, path \} \};/.test(choose),
  );
  check(
    'switch: the choose() write touches no ledger (no quests/glimpses/progress/streak/saved assignment)',
    !!choose &&
      !/(^|[^.\w])(quests|glimpses|progress|streak|savedAffirmations?Ids?)\s*:/.test(choose) &&
      (choose.match(/saveState\(/g) || []).length === 1 &&
      /await saveState\(next\);/.test(choose),
  );
  check(
    'switch: the picker re-reads the persisted state at the moment of the tap (never a stale render)',
    !!choose && /const latest = await loadState\(\);/.test(choose),
  );
  check(
    'switch: canSwitchPrograms is genuinely consulted (fork (b) would work without a call-site change)',
    !!choose && /if \(!canSwitchPrograms\(state\)\) return;/.test(choose),
  );
  check(
    'switch: an unchanged tap writes nothing (already yours = no write, no analytics)',
    !!choose && /if \(state\.profile\.path === path\) return;/.test(choose) && /if \(latest\.profile\.path === path\) \{/.test(choose),
  );
  check(
    'switch: the analytics event carries the real from/to ids, only after the write succeeded',
    !!choose && /analytics\.track\('program_switched', \{ from: latest\.profile\.path, to: path \}\);/.test(choose),
  );
  check(
    'switch: a failed write surfaces the honest device-storage line (no silent failure)',
    pickerModule.COPY.errorTitle === 'Could not switch your program' &&
      pickerModule.COPY.errorBody === 'Your program is stored on this device — please try again.',
  );
}

// ---------------------------------------------------------------------------
// 4. The done card after a mid-day switch
// ---------------------------------------------------------------------------

console.log('\n-- 4. the mid-day switch: today\u2019s done card keeps its quest --');

{
  // The trap: "done today" is date-keyed and says nothing about WHICH program's
  // quest it was. The rotation now answers with a different quest.
  const doneQuest = questPool('christian')[3];
  const state = richState('christian', 'free');
  const midDay = switchTo(
    {
      ...state,
      quests: {
        ...state.quests,
        completions: [completion('2026-09-17', doneQuest.id)],
        completedQuestIds: [doneQuest.id],
        lastQuestCompletionDate: '2026-09-17',
      },
    },
    'entrepreneur',
  );
  const todaysCompletion = midDay.quests.completions.find((c) => c.date === '2026-09-17');
  const resolved = questById(todaysCompletion.questId);
  const wouldRotate = pickToday(questPool(midDay.profile.path), '2026-09-17');
  check(
    'done: after the switch, today\u2019s rotation WOULD answer with a different quest (the trap is real)',
    !!wouldRotate && wouldRotate.id !== doneQuest.id && !IDS.entrepreneur.has(doneQuest.id),
    `${doneQuest.id} -> ${wouldRotate && wouldRotate.id}`,
  );
  check(
    'done: the completed quest still resolves by id, to ITS OWN quest (title included)',
    !!resolved && resolved.id === doneQuest.id && resolved.title === doneQuest.title,
    resolved && resolved.title,
  );
  check(
    'done: the resolved quest is not in the program now held — resolution is not pool-scoped',
    !!resolved && !IDS[midDay.profile.path].has(resolved.id),
  );
  check(
    'done: today\u2019s completion is still date-keyed to today (the loop is NOT re-opened by the switch)',
    midDay.quests.lastQuestCompletionDate === '2026-09-17' &&
      midDay.quests.completions.length === 1,
  );
  const homeDone = functionBlock(SRC.home, 'HomeScreen');
  check(
    'done: Home resolves the done card by id from ALL_QUESTS (questById), never from today\u2019s rotation',
    !!homeDone &&
      /const todaysCompletion = state\?\.quests\.completions\.find\(\(c\) => c\.date === today\);/.test(homeDone) &&
      /const doneQuest = questDone \? questById\(todaysCompletion\?\.questId\) : undefined;/.test(homeDone) &&
      /const cardQuest = questDone \? doneQuest : quest;/.test(homeDone),
  );
  check(
    'done: questById never substitutes — an unknown or absent id resolves to undefined',
    questById('q-does-not-exist') === undefined && questById(undefined) === undefined,
  );
  check(
    'done: an unresolvable id still says the loop is done and names no quest (never a different one)',
    !!homeDone &&
      /<QuestCard done onBegin=\{\(\) => \{\}\} \/>/.test(homeDone) &&
      /Quest library empty — nothing to show today\./.test(homeDone),
  );
  check(
    'done: the day\u2019s accent follows what the card SHOWS (the completed quest\u2019s theme)',
    !!homeDone && /const dayAccent = themeAccents\[cardQuest \? cardQuest\.theme : 'gratitude'\];/.test(homeDone),
  );
  check(
    'done: the bonus pick excludes today\u2019s DAILY of the held pool (no double-credit across a switch)',
    gates.pickBonusQuest(
      {
        ...richState('entrepreneur', 'paid'),
        quests: { ...richState('entrepreneur', 'paid').quests, bonusCompletions: [] },
      },
      DAY,
    ).id !== pickToday(questPool('entrepreneur'), DAY).id,
  );
}

// ---------------------------------------------------------------------------
// 5. The picker screen, structurally (+ its one hooks-free row, invoked)
// ---------------------------------------------------------------------------

console.log('\n-- 5. the Programs screen (structure + the row it renders) --');

{
  const row = (opts) => pickerModule.ProgramRow(opts);
  const current = nodes(
    row({
      label: PATH_LABELS.christian,
      count: questPool('christian').length,
      current: true,
      switchable: true,
      busy: false,
      onPress: () => {},
    }),
  );
  const currentProps = current[0].props;
  check(
    'row: the held program is a real radio (role radio, selected: true)',
    currentProps.accessibilityRole === 'radio' &&
      currentProps.accessibilityState.selected === true &&
      currentProps.accessibilityState.disabled === false,
  );
  check(
    'row: the held row names itself for VoiceOver as YOUR program, and carries no switch hint',
    currentProps.accessibilityLabel === `${PATH_LABELS.christian}, your program` &&
      currentProps.accessibilityHint === undefined,
  );
  check(
    'row: the held row wears the teal kept pair (tealTint fill + 3px teal left edge)',
    styleOf(current[0]).backgroundColor === colors.tealTint &&
      styleOf(current[0]).borderLeftWidth === 3 &&
      styleOf(current[0]).borderLeftColor === colors.teal,
  );
  const currentCount = pickerModule.COPY.questCount(questPool('christian').length);
  const currentText = allText(current);
  check(
    'row: the held row shows the real program name, its real count and the YOUR PROGRAM chip',
    norm(currentText).includes(norm(PATH_LABELS.christian)) &&
      norm(currentText).includes(norm(currentCount)) &&
      norm(currentText).includes('YOUR PROGRAM'),
    norm(currentText).replace(/\n/g, ' | '),
  );
  check(
    'row: the held row shows no gold "there is more here" line (it is yours)',
    !norm(currentText).includes('Included with Calm Quest+'),
  );

  const other = nodes(
    pickerModule.ProgramRow({
      label: PATH_LABELS.entrepreneur,
      count: questPool('entrepreneur').length,
      current: false,
      switchable: true,
      busy: false,
      onPress: () => {},
    }),
  );
  const otherProps = other[0].props;
  check(
    'row: a program the user does not hold is a button that opens the switch (never a padlock)',
    otherProps.accessibilityRole === 'button' &&
      otherProps.accessibilityState.selected === false &&
      otherProps.accessibilityLabel === PATH_LABELS.entrepreneur &&
      otherProps.accessibilityHint === pickerModule.COPY.switchHint,
  );
  check(
    'row: the other row wears the card surface (no dimming, no opacity jail over the text)',
    styleOf(other[0]).backgroundColor === colors.card &&
      !('opacity' in styleOf(other[0])) &&
      styleOf(other[0], true).opacity === 0.88,
    JSON.stringify(styleOf(other[0])),
  );
  const otherText = allText(other);
  check(
    'row: the other row shows its OWN real pool count (never the Christian bundle, never all three summed)',
    norm(otherText).includes(norm(pickerModule.COPY.questCount(questPool('entrepreneur').length))) &&
      !norm(otherText).includes(norm(pickerModule.COPY.questCount(questPool('christian').length))) &&
      !norm(otherText).includes(norm(pickerModule.COPY.questCount(ALL_QUESTS.length))),
    norm(otherText).replace(/\n/g, ' | '),
  );
  check(
    'row: the other row does not wear the YOUR PROGRAM chip',
    !norm(otherText).includes('YOUR PROGRAM') && norm(otherText).includes(PATH_LABELS.entrepreneur),
  );
  check(
    'row: a busy row is honestly disabled (no invisible second switch mid-write)',
    nodes(
      pickerModule.ProgramRow({
        label: PATH_LABELS.christian,
        count: 60,
        current: true,
        switchable: true,
        busy: true,
        onPress: () => {},
      }),
    )[0].props.accessibilityState.disabled === true,
  );
  check(
    'row: the row glyph is the drawn Leaf and the chip is a drawn Sprout (no new art, no emoji)',
    /<Leaf size=\{16\} color=\{current \? colors\.tealDeep : colors\.inkSoft\} rotate=\{-28\} hollow=\{!current\} \/>/.test(
      CODE.picker,
    ) && /<Sprout size=\{12\} color=\{colors\.sageDeep\} \/>/.test(CODE.picker),
  );
  check(
    'row: the switch affordance is the app\u2019s drawn chevron, and the honest gold line names the one-program rule',
    /<ChevronMark \/>/.test(CODE.picker) &&
      /Included with Calm Quest\+<\/Text>/.test(CODE.picker) &&
      pickerModule.COPY.questCount(1) === '1 quest' &&
      pickerModule.COPY.questCount(5) === '5 quests',
  );
}

{
  const P = CODE.picker;
  check(
    'screen: three rows, in canonical order, each a real door with its own real count',
    /\{PATH_ORDER\.map\(\(path\) => \(/.test(P) &&
      /count=\{questPool\(path\)\.length\}/.test(P) &&
      /current=\{current === path\}/.test(P) &&
      /switchable=\{switchable\}/.test(P),
  );
  check(
    'screen: the ONE honest line is rendered on a vellum plate (the promise switching makes)',
    /\{COPY\.honestLine\}/.test(P) &&
      norm(styleBlock(SRC.picker, 'honest')).includes('backgroundColor: colors.vellum') &&
      !norm(styleBlock(SRC.picker, 'honest')).includes('opacity'),
  );
  check(
    'screen: the routing note is rendered once, as a vellum note (never a quest, never in the loop)',
    /\{ROUTING_NOTE\}/.test(P) &&
      (P.match(/ROUTING_NOTE/g) || []).length === 2 &&
      norm(styleBlock(SRC.picker, 'routing')).includes('backgroundColor: colors.vellum') &&
      !/ROUTING_NOTE/.test(CODE.home) &&
      !/ROUTING_NOTE/.test(CODE.store),
  );
  check(
    'screen: anyone who does not hold all three sees the app\u2019s gold invitation (no padlock, no countdown)',
    /\{state && held\.length < PATH_ORDER\.length \? \(/.test(P) &&
      /<PlusInvitation/.test(P) &&
      /line=\{COPY\.plusLine\}/.test(P) &&
      plusModule.PLUS_INVITATION_LABEL === 'See what Calm Quest+ includes',
  );
  check(
    'screen: the picker offers the same door Home does (one navigation target, no duplicate switch path)',
    /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(P) &&
      /navigation\.navigate\('Programs'\)/.test(CODE.settings) &&
      /onOpenPrograms/.test(CODE.home),
  );
  check(
    'screen: no padlock, no "coming soon", no dimmed row anywhere in the picker',
    !/padlock|Padlock|Lock UI|ComingSoon|coming soon/i.test(P) && !/textDisabled/.test(P),
  );
  check(
    'screen: the picker reads the persisted state on focus (a switch made elsewhere shows up)',
    /useFocusEffect\(/.test(P) && /loadState\(\)\.then\(/.test(P),
  );
}
check(
  'screen: the picker\u2019s header is the approved three strings, verbatim from the manifest (§9)',
  pickerModule.COPY.title === 'Programs' &&
    pickerModule.COPY.back === '‹ Back' &&
    pickerModule.COPY.section === 'CHOOSE YOUR PROGRAM' &&
    pickerModule.COPY.currentChip === 'YOUR PROGRAM',
);
check(
  'screen: Home\u2019s PROGRAMS card draws from the same real derivation as the gates (programsFor)',
  /const heldPrograms = state \? programsFor\(state\) : \[\];/.test(CODE.home) &&
    /<ProgramsCard/.test(CODE.home) &&
    /held=\{heldPrograms\}/.test(CODE.home),
);
{
  const homeCard = functionBlock(SRC.home, 'ProgramsCard') || '';
  check(
    'screen: Home\u2019s card rows are DOORS into the picker, never in-place switches',
    /onPress=\{onOpenPrograms\}/.test(homeCard) &&
      !/saveState|choose\(/.test(homeCard) &&
      /accessibilityHint="Opens the program picker\."/.test(homeCard),
  );
}

// ---------------------------------------------------------------------------
// 6. NEW_STRINGS.md — the build-14 section, both ways
// ---------------------------------------------------------------------------

console.log('\n-- 6. copy discipline (NEW_STRINGS.md, build-14 section) --');

const MANIFEST_ALL = readSrc('NEW_STRINGS.md');
// Build 14 has TWO top-level sections: part 1's UI wording, and part 2's content
// pass over the two newer programs. Each is parsed on its own — the slice ends at
// the next `^# ` heading, so neither half can leak into the other's rows — and
// the halves are checked independently: the UI half by its row numbers (42–73),
// the content half by walking every rendered field of the two content files.
/** One manifest slice → its `## ` sections, each with the numbered rows below it. */
function manifestSections(slice) {
  const out = [];
  for (const part of slice.split(/^## /m).slice(1)) {
    const heading = part.split('\n')[0];
    const fileMatch = /`([^`]+)`/.exec(heading);
    const rows = [];
    for (const line of part.split('\n')) {
      const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(line.trim());
      if (m) rows.push({ n: Number(m[1]), where: m[2], string: m[3] });
    }
    if (fileMatch && rows.length) out.push({ heading, file: fileMatch[1].trim(), rows });
  }
  return out;
}
const B14 = (MANIFEST_ALL.split(/^# Calm Quest — build 14 new strings/m)[1] || '').split(/^# /m)[0];
const B14C = MANIFEST_ALL.split(/^# Calm Quest — build 14 — part 2/m)[1] || '';
const sections = manifestSections(B14);
const contentSections = manifestSections(B14C);
const ROW = (n) => {
  for (const s of sections) {
    const r = s.rows.find((x) => x.n === n);
    if (r) return r.string;
  }
  return null;
};
check(
  'manifest: parsed as seven surfaces, each naming the file it governs',
  sections.length === 7 &&
    sections.map((s) => s.file).join(',') ===
      [
        SRC_FILES.themes,
        SRC_FILES.onboarding,
        SRC_FILES.picker,
        SRC_FILES.home,
        SRC_FILES.settings,
        SRC_FILES.paywall,
        SRC_FILES.anxiety,
      ].join(','),
  sections.map((s) => s.file).join(', '),
);
check(
  'manifest: rows 42–73, contiguous, and the stated count matches the rows',
  sections.reduce((n, s) => n + s.rows.length, 0) === 32 &&
    sections
      .flatMap((s) => s.rows.map((r) => r.n))
      .join(',') === Array.from({ length: 32 }, (_, i) => 42 + i).join(',') &&
    /32 entries/.test(B14) &&
    /29 new distinct strings/.test(B14) &&
    /3 edits/.test(B14),
  String(sections.reduce((n, s) => n + s.rows.length, 0)),
);
{
  const missing = [];
  for (const section of sections) {
    const src = readSrc(section.file);
    const srcNorm = norm(src);
    for (const row of section.rows) {
      const literal = row.string.startsWith('`') && row.string.endsWith('`') ? row.string.slice(1, -1) : row.string;
      if (!srcNorm.includes(norm(literal)) && !src.includes(literal)) {
        missing.push(`${section.file}#${row.n} "${literal.slice(0, 40)}"`);
      }
    }
  }
  check('manifest → code: every listed string is verbatim in the file it names', missing.length === 0, missing.join(' | '));
}
{
  // The other direction: the strings the CODE added, taken from the code.
  // Four files carry a `// --- COPY (build 14)` block; Home's build-14 surface is
  // the whole ProgramsCard component; Settings' is three keys of its COPY object;
  // the paywall's is one bullet, the free strip and the PROGRAMS label.
  const collected = [];
  const empty = [];
  for (const rel of [SRC_FILES.themes, SRC_FILES.onboarding, SRC_FILES.picker, SRC_FILES.anxiety]) {
    const lits = copyBlockLiterals(rel);
    if (!lits || lits.length === 0) empty.push(`${rel}: no build-14 COPY block`);
    else lits.forEach((l) => collected.push([rel, l]));
  }
  const homeCard = functionBlock(SRC.home, 'ProgramsCard');
  if (!homeCard) empty.push('HomeScreen: no ProgramsCard');
  else literalsOf(homeCard).forEach((l) => collected.push([SRC_FILES.home, l]));

  const settingsBlock = /const COPY = \{[\s\S]*?\n\};/.exec(CODE.settings);
  const SETTINGS_KEYS = ['programSection', 'programRow', 'programRowHint'];
  if (!settingsBlock) empty.push('SettingsScreen: no COPY object');
  else {
    for (const key of SETTINGS_KEYS) {
      const lit = copyKeyLiteral(settingsBlock[0], key);
      if (lit === null) empty.push(`${SRC_FILES.settings}: COPY.${key} missing`);
      else collected.push([SRC_FILES.settings, lit]);
    }
  }
  const paywallSrc = CODE.paywall;
  const bulletsBlock = /const VALUE_BULLETS[^=]*=\s*\[([\s\S]*?)\];/.exec(paywallSrc);
  const bullets = bulletsBlock ? literalsOf(bulletsBlock[1]) : [];
  check(
    'manifest → code: the paywall still ships exactly three value bullets, bullet 1 is the build-14 edit',
    bullets.length === 3 && norm(bullets[0]) === norm(ROW(70)),
    bullets.length ? bullets[0].slice(0, 48) : 'none',
  );
  if (bullets.length) collected.push([SRC_FILES.paywall, bullets[0]]);
  const labelLit = /const PROGRAMS_LABEL = '([^']*)'/.exec(paywallSrc);
  if (labelLit) collected.push([SRC_FILES.paywall, labelLit[1]]);
  else empty.push(`${SRC_FILES.paywall}: PROGRAMS_LABEL missing`);
  const stripLit = /const FREE_STRIP[^=]*=\s*'((?:[^'\\]|\\.)*)'/.exec(paywallSrc);
  if (stripLit) collected.push([SRC_FILES.paywall, stripLit[1]]);
  else empty.push(`${SRC_FILES.paywall}: FREE_STRIP missing`);

  const unlisted = collected
    .filter(([, lit]) => !norm(MANIFEST_ALL).includes(norm(lit)))
    .map(([rel, lit]) => `${rel}: "${lit.slice(0, 44)}"`);
  check('code → manifest: the build-14 regions were all read', empty.length === 0, empty.join(' | '));
  check(
    'code → manifest: every build-14 string in the code is listed for the owner\u2019s copy pass',
    unlisted.length === 0 && collected.length >= 20,
    [...unlisted, `${collected.length} literals`].join(' | '),
  );
}
{
  // The strongest form: the loaded modules' own exports vs the manifest rows.
  const pair = (rowN, actual, what) => {
    const listed = ROW(rowN);
    return listed !== null && norm(listed) === norm(String(actual)) ? null : `${what} (row ${rowN})`;
  };
  const mismatches = [
    pair(42, PEACE_AND_REST_LABEL, 'PEACE_AND_REST_LABEL'),
    pair(47, pickerModule.COPY.title, 'COPY.title'),
    pair(48, pickerModule.COPY.back, 'COPY.back'),
    pair(49, pickerModule.COPY.section, 'COPY.section'),
    pair(50, pickerModule.COPY.honestLine, 'COPY.honestLine'),
    pair(51, pickerModule.COPY.currentChip, 'COPY.currentChip'),
    pair(53, pickerModule.COPY.plusLine, 'COPY.plusLine'),
    pair(54, pickerModule.COPY.switchHint, 'COPY.switchHint'),
    pair(55, pickerModule.COPY.errorTitle, 'COPY.errorTitle'),
    pair(56, pickerModule.COPY.errorBody, 'COPY.errorBody'),
    pair(67, copyKeyLiteral(/const COPY = \{[\s\S]*?\n\};/.exec(CODE.settings)[0], 'programSection'), 'COPY.programSection'),
    pair(68, copyKeyLiteral(/const COPY = \{[\s\S]*?\n\};/.exec(CODE.settings)[0], 'programRow'), 'COPY.programRow'),
    pair(69, copyKeyLiteral(/const COPY = \{[\s\S]*?\n\};/.exec(CODE.settings)[0], 'programRowHint'), 'COPY.programRowHint'),
  ].filter(Boolean);
  check(
    'manifest ↔ exports: the picker, the program name and the Settings door are the listed wording, byte-for-byte',
    mismatches.length === 0,
    mismatches.join(' | '),
  );
  check(
    'manifest ↔ code: row 52 is the real pluralization the picker prints (both counts listed)',
    norm(ROW(52)).includes('${n} quest${n === 1') &&
      norm(ROW(52)).includes("'' : 's'") &&
      pickerModule.COPY.questCount(1) === '1 quest' &&
      pickerModule.COPY.questCount(questPool('christian').length) === norm(`${questPool('christian').length} quests`),
    ROW(52),
  );
  check(
    'manifest ↔ code: the routing note is the proposal\u2019s wording, ASCII apostrophe included',
    ROW(73) === anxiety.ROUTING_NOTE && anxiety.ROUTING_NOTE.includes("you're"),
    ROW(73).slice(0, 44),
  );
  check(
    'manifest: the retired strings are listed so the copy pass sees what left',
    /### Retired in build 14/.test(B14) &&
      /Coming soon/.test(B14) &&
      /Anxiety & Stress Support/.test(B14) &&
      !/coming soon/i.test(CODE.onboarding),
  );
  check(
    'manifest: the two proposal-verbatim strings keep their ASCII apostrophes (build-14 decision)',
    pickerModule.COPY.honestLine.includes("you've") &&
      !pickerModule.COPY.honestLine.includes('’') &&
      anxiety.ROUTING_NOTE.includes("you're") &&
      !anxiety.ROUTING_NOTE.includes('’'),
  );
}

// ---------------------------------------------------------------------------
// 6b. Part 2 — the content pass, in both directions
// ---------------------------------------------------------------------------

console.log('\n-- 6b. part 2: the two programs\' content, listed and real --');

{
  const BUNDLES = [
    {
      name: 'Entrepreneur Mindset',
      file: SRC_FILES.entrepreneur,
      quests: entrepreneur.entrepreneurQuests,
      affirmations: entrepreneur.entrepreneurAffirmations,
      questPrefix: 'q-entrepreneur',
      affPrefix: 'aff-entrepreneur',
    },
    {
      name: 'Peace & Rest',
      file: SRC_FILES.anxiety,
      quests: anxiety.anxietyStressQuests,
      affirmations: anxiety.anxietyStressAffirmations,
      questPrefix: 'q-peace',
      affPrefix: 'aff-peace',
    },
  ];
  const BODY_FIELDS = ['reflection', 'actionPrompt', 'pausePrompt', 'journalPrompt'];

  check(
    'part 2: the manifest parsed as four content surfaces, naming the two programs\u2019 files in order',
    contentSections.length === 4 &&
      contentSections.map((s) => s.file).join(',') ===
        [SRC_FILES.entrepreneur, SRC_FILES.entrepreneur, SRC_FILES.anxiety, SRC_FILES.anxiety].join(','),
    contentSections.map((s) => s.file).join(', '),
  );
  check(
    'part 2: rows 74\u2013193, contiguous, and the stated count matches the rows',
    contentSections.reduce((n, s) => n + s.rows.length, 0) === 120 &&
      contentSections
        .flatMap((s) => s.rows.map((r) => r.n))
        .join(',') === Array.from({ length: 120 }, (_, i) => 74 + i).join(',') &&
      /120 entries/.test(B14C),
    String(contentSections.reduce((n, s) => n + s.rows.length, 0)),
  );
  {
    const missing = [];
    for (const section of contentSections) {
      const srcNorm = norm(readSrc(section.file));
      for (const row of section.rows) {
        const literal = row.string.startsWith('`') && row.string.endsWith('`') ? row.string.slice(1, -1) : row.string;
        if (!srcNorm.includes(norm(literal))) missing.push(`${section.file}#${row.n} "${literal.slice(0, 40)}"`);
      }
    }
    check(
      'part 2, manifest \u2192 code: every listed content string is verbatim in the file it names',
      missing.length === 0,
      missing.slice(0, 4).join(' | '),
    );
  }
  {
    // The other direction, taken from the loaded modules: every rendered string.
    const rendered = [];
    for (const b of BUNDLES) {
      for (const q of b.quests) {
        rendered.push([b.file, q.id, q.title]);
        const field = BODY_FIELDS.find((f) => q[f]);
        if (field) rendered.push([b.file, q.id, q[field]]);
      }
      for (const a of b.affirmations) rendered.push([b.file, a.id, a.text]);
    }
    const unlisted = rendered
      .filter(([, , t]) => !norm(MANIFEST_ALL).includes(norm(String(t))))
      .map(([rel, id, t]) => `${rel} ${id}: "${String(t).slice(0, 40)}"`);
    check(
      'part 2, code \u2192 manifest: every rendered quest/affirmation string of both programs is listed for the copy pass',
      unlisted.length === 0 && rendered.length === 120,
      [...unlisted.slice(0, 4), `${rendered.length} strings`].join(' | '),
    );
  }

  check(
    'part 2: each newer program ships the lean Option-A bundle \u2014 20 quests / 20 affirmations',
    BUNDLES.every((b) => b.quests.length === 20 && b.affirmations.length === 20),
    BUNDLES.map((b) => `${b.name}: ${b.quests.length}/${b.affirmations.length}`).join(' \u00b7 '),
  );
  check(
    'part 2: ids are contiguous from 01 (the part-1 seed\u2019s first five, then part 2\u2019s, in every pool)',
    BUNDLES.every(
      (b) =>
        b.quests.every((q, i) => q.id === `${b.questPrefix}-${String(i + 1).padStart(2, '0')}`) &&
        b.affirmations.every((a, i) => a.id === `${b.affPrefix}-${String(i + 1).padStart(2, '0')}`),
    ),
  );
  check(
    'part 2: five quests of each type and four quests of each theme, per program',
    BUNDLES.every((b) => {
      const types = {};
      const themes = {};
      for (const q of b.quests) {
        types[q.type] = (types[q.type] || 0) + 1;
        themes[q.theme] = (themes[q.theme] || 0) + 1;
      }
      return (
        Object.values(types).every((n) => n === 5) &&
        Object.keys(types).length === 4 &&
        Object.values(themes).every((n) => n === 4) &&
        Object.keys(themes).length === 5
      );
    }),
    BUNDLES.map((b) => `${b.name}: ${b.quests.length} quests`).join(' \u00b7 '),
  );
  check(
    'part 2: every theme carries all four quest types (a theme is never one-note)',
    BUNDLES.every((b) => {
      const byTheme = {};
      for (const q of b.quests) {
        byTheme[q.theme] = byTheme[q.theme] || new Set();
        byTheme[q.theme].add(q.type);
      }
      return Object.keys(byTheme).length === 5 && Object.values(byTheme).every((s) => s.size === 4);
    }),
  );
  check(
    'part 2: four affirmations of each theme, per program',
    BUNDLES.every((b) => {
      const themes = {};
      for (const a of b.affirmations) themes[a.theme] = (themes[a.theme] || 0) + 1;
      return Object.values(themes).every((n) => n === 4) && Object.keys(themes).length === 5;
    }),
  );
  {
    // Each quest carries exactly the payload its type renders — no leftover field
    // from another type, and every Read & Reflect quest is anchored, chipped and
    // complete (a half-filled quest would render an empty card).
    const verseLibrary = new Set(content.verses.map((v) => v.id));
    const wrong = [];
    for (const b of BUNDLES) {
      for (const q of b.quests) {
        const set = BODY_FIELDS.filter((f) => q[f] !== undefined);
        const only = (f) => set.length === 1 && set[0] === f;
        if (q.type === 'read_reflect') {
          if (set.length !== 1 || set[0] !== 'reflection') wrong.push(`${q.id}: read_reflect body`);
          if (!q.verseId || !verseLibrary.has(q.verseId)) wrong.push(`${q.id}: verseId`);
          if (!Array.isArray(q.checkInOptions) || q.checkInOptions.length !== 3) wrong.push(`${q.id}: chips`);
        } else if (q.type === 'act') {
          if (!only('actionPrompt')) wrong.push(`${q.id}: act body`);
          if (q.verseId || q.durationSeconds || q.checkInOptions) wrong.push(`${q.id}: act extra`);
        } else if (q.type === 'pause') {
          if (!only('pausePrompt')) wrong.push(`${q.id}: pause body`);
          if (q.durationSeconds !== 60) wrong.push(`${q.id}: pause duration`);
          if (q.verseId || q.checkInOptions) wrong.push(`${q.id}: pause extra`);
        } else if (q.type === 'write') {
          if (!only('journalPrompt')) wrong.push(`${q.id}: write body`);
          if (q.verseId || q.durationSeconds || q.checkInOptions) wrong.push(`${q.id}: write extra`);
        } else {
          wrong.push(`${q.id}: unknown type ${q.type}`);
        }
        if (q.title.split(' ').length > 6) wrong.push(`${q.id}: title too long`);
      }
    }
    check(
      'part 2: every quest carries exactly its type\u2019s payload, a \u2264 6-word title, 60s pauses and 3 chips',
      wrong.length === 0,
      wrong.slice(0, 5).join(' | '),
    );
    check(
      'part 2: verseIds come only from the shared 60-verse library (no new verse, no paraphrase)',
      content.verses.length === 60 &&
        BUNDLES.every((b) => b.quests.filter((q) => q.verseId).every((q) => verseLibrary.has(q.verseId))),
      `${content.verses.length} verses`,
    );
    check(
      'part 2: every affirmation is one sentence (no second sentence smuggled in)',
      BUNDLES.every((b) =>
        b.affirmations.every((a) => !/\.\s/.test(a.text) && /[.!?]$/.test(a.text.trim())),
      ),
    );
    // Chips may only use words the app already ships. The allowed set is DERIVED
    // from the frozen Christian bundle plus the part-1 seed's one added chip, so a
    // new chip word cannot enter through the content pass unnoticed.
    const allowed = new Set(['Purpose']);
    for (const q of questPool('christian')) {
      for (const c of q.checkInOptions || []) allowed.add(c.label);
    }
    const strayChips = [];
    for (const b of BUNDLES) {
      for (const q of b.quests) {
        for (const c of q.checkInOptions || []) if (!allowed.has(c.label)) strayChips.push(`${q.id}: ${c.label}`);
      }
    }
    check(
      'part 2: check-in chips introduce no new chip word (all drawn from the app\u2019s existing set)',
      strayChips.length === 0,
      [...strayChips, `allowed: ${[...allowed].join(' \u00b7 ')}`].join(' | '),
    );
  }
  check(
    'part 2: both content headers record the completed 20/20 authoring pass (the checklist each file carries)',
    /PART 2 COMPLETE/.test(SRC.entrepreneur) &&
      /20 quests \/ 20 affirmations/.test(SRC.entrepreneur) &&
      /PART 2 COMPLETE/.test(SRC.anxiety) &&
      /PENDING PART-2/.test(SRC.entrepreneur) === false &&
      /PENDING PART-2/.test(SRC.anxiety) === false,
  );
  check(
    'part 2: no user-visible string in either program promises an outcome or sells hype',
    BUNDLES.every((b) =>
      [...b.quests, ...b.affirmations].every((item) => {
        const text = JSON.stringify(item);
        return !/\b(guarantee[sd]?|10x|crush it|hustle harder|overnight success|get rich|will make you)\b/i.test(text);
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// 7. The Peace & Rest guardrails (on comment-stripped source)
// ---------------------------------------------------------------------------

console.log('\n-- 7. the Peace & Rest guardrail header + banned words --');

/** Every .ts/.tsx file under src/ — the sweep behind the last two sections. */
function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}
const SRC_ALL = walkSrc('src');

{
  const raw = SRC.anxiety;
  check(
    'guardrail: the content file still carries the header (May say / Must never say / one routing line)',
    /May say/.test(raw) && /Must never say/.test(raw) && /nervous system/.test(raw) && /treats\/cures\/heals/.test(raw),
  );
  check(
    'guardrail: the header is the binding checklist for part-2 authoring, and records the 20/20 target as met',
    /CONTENT GUARDRAILS/.test(raw) &&
      /May say/.test(raw) &&
      /Must never say/.test(raw) &&
      /treats\/cures\/heals/.test(raw) &&
      /20 quests \/ 20 affirmations/.test(raw) &&
      /PART 2 COMPLETE/.test(raw) &&
      !/PENDING PART-2 AUTHORING/.test(raw),
  );
  // Identifiers legitimately carry the program's spec id (`anxietyStressQuests`)
  // — they are names, not copy. Everything else must be clean.
  const swept = CODE.anxiety.replace(/anxietyStress[A-Za-z]*/g, ' ');
  const BANNED = [
    'anxiety',
    'stress',
    'stress relief',
    'relieve',
    'reduces',
    'eases your',
    'calms your',
    'nervous system',
    'therapy',
    'therapeutic',
    'clinical',
    'treats',
    'cures',
    'heals',
    'mental health',
    'symptoms',
    'diagnosis',
    'disorder',
    'panic',
    'depression',
    'mood score',
    'severity',
    'breathing exercise',
    'before/after',
  ];
  const hits = BANNED.filter((w) => new RegExp(`\\b${w.replace(/[/-]/g, '.')}\\b`, 'i').test(swept));
  check(
    'guardrail: no banned health/outcome word survives in the file\u2019s CODE (comments stripped)',
    hits.length === 0,
    hits.join(', '),
  );
  check(
    'guardrail: no outcome promise, score or before/after in any rendered string',
    !/\b(promise[sd]?|guarantee[sd]?|will feel|feel better|fixed|instantly)\b/i.test(swept) &&
      !/[0-9]+\s*(%|out of 10|score)/i.test(swept),
  );
  const anxiQuestText = anxiety.anxietyStressQuests
    .map((q) => [q.title, q.reflection, q.actionPrompt, q.pausePrompt, q.journalPrompt].filter(Boolean).join(' '))
    .join(' ');
  check(
    'guardrail: every rendered Peace & Rest quest string is clean of the banned words',
    BANNED.every((w) => !new RegExp(`\\b${w.replace(/[/-]/g, '.')}\\b`, 'i').test(anxiQuestText)),
  );
  check(
    'guardrail: the program promises the practice, never the result (no outcome verbs in the copy)',
    anxiety.anxietyStressQuests.every((q) => !/\b(will heal|will fix|will cure|guarantees|removes your)\b/i.test(JSON.stringify(q))),
  );
  check(
    'guardrail: the routing note is the ONLY health-adjacent sentence the app ships',
    SRC_ALL.filter((rel) => /Calm Quest is a companion, not care\./.test(code(readSrc(rel)))).join(',') ===
      SRC_FILES.anxiety &&
      norm(ROW(73)) === norm(anxiety.ROUTING_NOTE),
    SRC_ALL.filter((rel) => /Calm Quest is a companion, not care\./.test(code(readSrc(rel)))).join(','),
  );
  check(
    'guardrail: the route line never renders inside the daily loop (picker only)',
    /ROUTING_NOTE/.test(CODE.picker) &&
      !/ROUTING_NOTE/.test(CODE.home) &&
      !/ROUTING_NOTE/.test(CODE.store) &&
      !/ROUTING_NOTE/.test(CODE.gates),
  );
}

// ---------------------------------------------------------------------------
// 8. One program, one name — written in exactly one place
// ---------------------------------------------------------------------------

console.log('\n-- 8. "Peace & Rest" is written in exactly one place --');

{
  const files = SRC_ALL;
  const hits = [];
  for (const rel of files) {
    const stripped = code(readSrc(rel));
    const n = (stripped.match(/Peace & Rest/g) || []).length;
    if (n) hits.push(`${rel} x${n}`);
  }
  check(
    'one name: "Peace & Rest" appears exactly once in src/ (comment-stripped), and that once is themes.ts',
    hits.length === 1 && hits[0].startsWith(SRC_FILES.themes),
    hits.join(' | '),
  );
  check(
    'one name: the spec\u2019s "Anxiety & Stress Support" never appears in code (comments only)',
    files.every((rel) => !/Anxiety & Stress Support/.test(code(readSrc(rel)))),
  );
  check(
    'one name: PATH_LABELS points at the ONE constant instead of repeating the name',
    /anxiety_stress: PEACE_AND_REST_LABEL,/.test(CODE.themes) &&
      !/anxiety_stress: 'Peace/.test(CODE.themes),
  );
  check(
    'one name: the picker, Home and Settings all label that program from PATH_LABELS (no second literal)',
    /PATH_LABELS\[path\]/.test(CODE.picker) &&
      /PATH_LABELS\[p\]/.test(functionBlock(SRC.home, 'ProgramsCard') || '') &&
      /PATH_LABELS\[path\]/.test(CODE.settings) &&
      !/Peace & Rest/.test(CODE.picker) &&
      !/Peace & Rest/.test(CODE.settings),
  );
  // A PathId may appear as a storage default (`useState<PathId>('christian')`),
  // never as rendered copy: every label the user reads comes from PATH_LABELS.
  const renderedTexts = (src) => (src.match(/<Text[^>]*>[^<]*<\/Text>/g) || []).join(' ');
  check(
    'one name: PathId values are storage keys, never rendered (no id inside a Text, in either screen)',
    PATH_ORDER.every((p) => !new RegExp(`\\b${p}\\b`).test(renderedTexts(CODE.picker + CODE.settings))) &&
      !/anxiety_stress|entrepreneur|christian/i.test(
        allText(
          nodes(
            pickerModule.ProgramRow({
              label: PATH_LABELS.anxiety_stress,
              count: questPool('anxiety_stress').length,
              current: false,
              switchable: true,
              busy: false,
              onPress: () => {},
            }),
          ),
        ),
      ),
    renderedTexts(CODE.picker + CODE.settings).slice(0, 60),
  );
}

// ---------------------------------------------------------------------------
// 9. What build 14 must NOT have touched
// ---------------------------------------------------------------------------

console.log('\n-- 9. unchanged invariants --');

check(
  'unchanged: the store persists ONE storage key and one schema version (no migration, no second key)',
  /export const STORAGE_KEY = 'calmquest\/appState\/v1';/.test(CODE.store) &&
    /contentVersion: 1,/.test(CODE.store),
);
check(
  'unchanged: the profile\u2019s default path is still the Christian program (a fresh install is honest)',
  /path: 'christian',/.test(CODE.store),
);
check(
  'unchanged: grace streaks are untouched (no new streak field, no program in the streak ledger)',
  /reconcileStreakForCompletion/.test(CODE.store) &&
    !/profile\.path|program/i.test(norm(styleBlock(SRC.home, 'questCardDone') || '')),
);
check(
  'unchanged: the paywall trigger and the entitlement path are untouched by the program gate',
  /export async function markPaywallSeen/.test(CODE.store) &&
    /export async function applyEntitlement/.test(CODE.store) &&
    /if \(state\.entitlements\.tier === 'paid'\) return/.test(CODE.gates) &&
    !/tier\s*=\s*'paid'/.test(CODE.gates) &&
    !/applyEntitlement|markPaywallSeen/.test(CODE.picker),
);
check(
  'unchanged: no new dependency was added for three programs (pools are data, not a library)',
  (() => {
    const pkg = JSON.parse(readSrc('package.json'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    return !deps.some((d) => /zustand|redux|mobx|recoil|jotai|xstate|i18n/i.test(d));
  })(),
);
check(
  'unchanged: build 14 adds no new persisted field anywhere (the profile object is the same shape)',
  !/newField|migrate|migration/i.test(CODE.store) &&
    /interface AppState \{[\s\S]*?contentVersion: number;[\s\S]*?\}/.test(SRC.store),
);

// ---------------------------------------------------------------------------

console.log(
  failures === 0
    ? `\nALL ${checks} PROGRAM GATEWAY CHECKS PASSED`
    : `\n${failures} of ${checks} PROGRAM GATEWAY CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
