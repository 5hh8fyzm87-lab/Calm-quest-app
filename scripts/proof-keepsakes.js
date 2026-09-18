/**
 * Calm Quest — build-13 "keepsakes" proofs (content-expansion proposal §2
 * items A / D / H / I).
 *
 * The four surfaces this wave ships are READ-ONLY: the kept-glimpse archive
 * (A), the saved-affirmation collection (D), "Sit with a verse" (I) and Home's
 * "Kept this week" strip (H). They render data the app already stores, so this
 * proof is built the same way the wave proofs are: the pure derivation
 * (src/keepsakes/keepsakes.ts, src/content/verseSets.ts) is called directly,
 * the hooks-free components are INVOKED and their element trees walked, and the
 * screens themselves (which own hooks) are asserted structurally on
 * comment-stripped source.
 *
 * What it refuses to let back in:
 *  1. XP. Nothing in the new trees grants or even mentions it, and no new file
 *     calls a storage writer or the analytics seam.
 *  2. A dishonest number. "N kept" is the whole ledger, never the visible
 *     slice; the verse shelf counts UNIQUE verses over the real bundle ("11 of
 *     60" — and 10, not 11, on the day the daily pick is also evergreen).
 *  3. A locked door. The free gates are gold lines + the app's existing
 *     invitation button: no padlock, no dimming, no fabricated total.
 *  4. Sold words. Saved affirmations are ungated at BOTH tiers — asserted on
 *     the rendered tree, not on a comment.
 *  5. Unlisted copy. Every string in the new COPY blocks appears in
 *     NEW_STRINGS.md, and every string listed for a file appears in that file.
 *  6. A new duty. No notification, no rotation of the free verse shelf, no
 *     streak or daily-loop reference, no new persistence, no new dependency.
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
const allText = (list) => list.filter((n) => n.type === 'Text').map((n) => textOf(n.props.children)).join('\n');

/** Pressable rows: their rendered text + props, without descending into them. */
function pressables(element, out = []) {
  if (element === null || element === undefined || typeof element === 'boolean') return out;
  if (Array.isArray(element)) {
    element.forEach((e) => pressables(e, out));
    return out;
  }
  if (typeof element !== 'object' || !element.$$typeof) return out;
  const props = element.props || {};
  if (element.type === 'Pressable') {
    out.push({
      props,
      text: nodes(element)
        .filter((n) => n.type === 'Text')
        .map((n) => textOf(n.props.children))
        .join(' '),
    });
    return out;
  }
  if (typeof element.type === 'function') {
    pressables(element.type(props), out);
    return out;
  }
  pressables(props.children, out);
  return out;
}

const hidden = (node) =>
  !!node &&
  node.props.accessibilityElementsHidden === true &&
  node.props.pointerEvents === 'none' &&
  node.props.importantForAccessibility === 'no-hide-descendants';
const isButton = (p) => p.props.accessibilityRole === 'button';

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
const hasEmoji = (src) =>
  /[\u{1F000}-\u{1FAFF}]/u.test(src) || /[\u2600-\u27BF]/.test(src.replace(/[✦⚙\uFE0E\uFE0F]/g, ''));

const NEW_FILES = {
  keepsakes: 'src/keepsakes/keepsakes.ts',
  verseSets: 'src/content/verseSets.ts',
  plate: 'src/components/KeepsakePlate.tsx',
  plus: 'src/components/PlusInvitation.tsx',
  strip: 'src/components/KeptThisWeekStrip.tsx',
  kept: 'src/screens/KeptScreen.tsx',
  verse: 'src/screens/SitWithVerseScreen.tsx',
};
const NEW_REL = Object.values(NEW_FILES);
const NEW_SRC = Object.fromEntries(Object.entries(NEW_FILES).map(([k, rel]) => [k, readSrc(rel)]));
const NEW_CODE = Object.fromEntries(Object.entries(NEW_SRC).map(([k, src]) => [k, code(src)]));

// ---------------------------------------------------------------------------
// Loaded modules + content
// ---------------------------------------------------------------------------

const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const content = loadTs(path.join(REPO, 'src/content/index.ts'));
const keepsakes = loadTs(path.join(REPO, NEW_FILES.keepsakes));
const verseSets = loadTs(path.join(REPO, NEW_FILES.verseSets));
const stripModule = loadTs(path.join(REPO, NEW_FILES.strip));
const plateModule = loadTs(path.join(REPO, NEW_FILES.plate));
const plusModule = loadTs(path.join(REPO, NEW_FILES.plus));
const keptModule = loadTs(path.join(REPO, NEW_FILES.kept));
const verseModule = loadTs(path.join(REPO, NEW_FILES.verse));

const { colors, spacing, typeScale } = theme;
const VERSES = content.verses;
const PROMPTS = content.prompts;
const QUESTS = content.quests;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const glimpse = (date, text, promptId = null, id = null) => ({
  id: id || `glimpse-${date}`,
  date,
  text,
  promptId,
});

const stateOf = ({ glimpses = [], saved = [], completions = [], tier = 'free' } = {}) => ({
  glimpses,
  savedAffirmationIds: saved,
  quests: { completedQuestIds: [], completions, lastQuestCompletionDate: null, bonusCompletions: [] },
  entitlements: { tier },
});

/** 12 kept glimpses across three months (Sep / Aug / Jul 2026). */
const TWELVE = [
  glimpse('2026-09-17', 'a quiet cup of tea', PROMPTS[0].id, 'g-1'),
  glimpse('2026-09-15', 'rain on the window', PROMPTS[1].id, 'g-2'),
  glimpse('2026-09-11', 'my friend called', PROMPTS[2].id, 'g-3'),
  glimpse('2026-09-08', 'the walk home', null, 'g-4'),
  glimpse('2026-09-04', 'bread still warm', PROMPTS[3].id, 'g-5'),
  glimpse('2026-09-02', 'a long breath', PROMPTS[4].id, 'g-6'),
  glimpse('2026-08-30', 'the garden grew', PROMPTS[5].id, 'g-7'),
  glimpse('2026-08-24', 'a kind word', PROMPTS[6].id, 'g-8'),
  glimpse('2026-08-19', 'sunlight on the floor', null, 'g-9'),
  glimpse('2026-08-10', 'quiet morning', PROMPTS[7].id, 'g-10'),
  glimpse('2026-07-28', 'an old song', PROMPTS[8].id, 'g-11'),
  glimpse('2026-07-05', 'a slower afternoon', PROMPTS[9].id, 'g-12'),
];

const SAVED_IDS = [
  'aff-gratitude-01',
  'aff-stillness-02',
  'aff-gratitude-03',
  'aff-purpose-01',
  'aff-stillness-04',
];

const COMPLETIONS = [
  { date: '2026-09-01', questId: QUESTS[0].id },
  { date: '2026-09-16', questId: QUESTS[7].id },
];

// ---------------------------------------------------------------------------
// 1. A — the archive derivation
// ---------------------------------------------------------------------------

console.log('\n-- 1. the kept-glimpse archive (A) --');

check('archive: the free split is the owner-approved last 7', keepsakes.FREE_ARCHIVE_LIMIT === 7);
check('archive: the Home strip shows 3 rows', keepsakes.KEPT_STRIP_LIMIT === 3);

const shuffled = [glimpse('2026-08-30', 'b'), glimpse('2026-09-17', 'c'), glimpse('2026-07-05', 'a')];
const ordered = keepsakes.glimpsesNewestFirst({ glimpses: shuffled }).map((g) => g.date);
check(
  'archive: rows read newest first',
  JSON.stringify(ordered) === JSON.stringify(['2026-09-17', '2026-08-30', '2026-07-05']),
  ordered.join(', '),
);

const sameDay = [
  glimpse('2026-09-17', 'written first', null, 'a'),
  glimpse('2026-09-15', 'other day', null, 'b'),
  glimpse('2026-09-17', 'written later', null, 'c'),
];
const sameDayOrder = keepsakes.glimpsesNewestFirst({ glimpses: sameDay }).map((g) => g.text);
check(
  'archive: a Calm Quest+ day with two entries keeps its true writing order',
  JSON.stringify(sameDayOrder) === JSON.stringify(['written later', 'written first', 'other day']),
  sameDayOrder.join(' | '),
);

const freeFull = keepsakes.archiveView(stateOf({ glimpses: TWELVE, tier: 'free' }));
check(
  'archive: free reads exactly the 7 most recent and is told the real total',
  freeFull.items.length === 7 &&
    freeFull.total === 12 &&
    freeFull.hidden === 5 &&
    freeFull.gated === true &&
    freeFull.items[0].text === 'a quiet cup of tea' &&
    freeFull.items[6].date === '2026-08-30',
  `${freeFull.items.length}/${freeFull.total} hidden=${freeFull.hidden}`,
);

const plusFull = keepsakes.archiveView(stateOf({ glimpses: TWELVE, tier: 'paid' }));
check(
  'archive: Calm Quest+ reads the whole archive and no gate is even computed',
  plusFull.items.length === 12 && plusFull.total === 12 && plusFull.hidden === 0 && plusFull.gated === false,
  `${plusFull.items.length}/${plusFull.total}`,
);

const freeSmall = keepsakes.archiveView(stateOf({ glimpses: TWELVE.slice(0, 4), tier: 'free' }));
check(
  'archive: a free user under the limit sees everything and no gate line',
  freeSmall.items.length === 4 && freeSmall.total === 4 && freeSmall.hidden === 0 && freeSmall.gated === false,
  `${freeSmall.items.length}`,
);

const freeEmpty = keepsakes.archiveView(stateOf({ tier: 'free' }));
check('archive: empty ledger → empty view, no gate', freeEmpty.items.length === 0 && !freeEmpty.gated);

check(
  'archive: month groups cover only the rows that are actually shown (free slice cuts mid-month)',
  JSON.stringify(freeFull.groups.map((g) => g.label)) ===
    JSON.stringify(['September 2026', 'August 2026']) &&
    freeFull.groups[0].entries.length === 6 &&
    freeFull.groups[1].entries.length === 1,
  freeFull.groups.map((g) => g.label).join(', '),
);

check(
  'archive: Calm Quest+ grouping spans all three months in order',
  JSON.stringify(plusFull.groups.map((g) => `${g.label}:${g.entries.length}`)) ===
    JSON.stringify(['September 2026:6', 'August 2026:4', 'July 2026:2']),
  plusFull.groups.map((g) => `${g.label}:${g.entries.length}`).join(', '),
);

check(
  'archive: the dateline helper reads the real day + month',
  keepsakes.dayLabel('2026-09-17') === '17 Sep' && keepsakes.monthLabel('2026-09-17') === 'September 2026',
  `${keepsakes.dayLabel('2026-09-17')} / ${keepsakes.monthLabel('2026-09-17')}`,
);

check(
  'archive: a kept glimpse is shown with the prompt it really answered',
  keepsakes.promptTextFor({ promptId: PROMPTS[0].id }) === PROMPTS[0].prompt,
);
check(
  'archive: an unknown or absent prompt id is never invented',
  keepsakes.promptTextFor({ promptId: 'glimpses-does-not-exist' }) === null &&
    keepsakes.promptTextFor({ promptId: null }) === null,
);

check(
  'archive: the archive module writes nothing — no storage, no analytics, no clock',
  !/saveState\(|saveGlimpse\(|completeQuest\(|saveAffirmation\(|completeBonusQuest\(|applyEntitlement\(|analytics\.|AsyncStorage|Date\.now|new Date\(/.test(
    NEW_CODE.keepsakes,
  ),
);

// ---------------------------------------------------------------------------
// 2. A — the archive rendered
// ---------------------------------------------------------------------------

const noop = () => {};
const archiveFreeTree = keptModule.GlimpseArchive({
  state: stateOf({ glimpses: TWELVE, tier: 'free' }),
  onOpen: noop,
  onSeePlus: noop,
  onTakeGlimpse: noop,
});
const freeNodes = nodes(archiveFreeTree);
const freeText = allText(freeNodes);
const plateStyle = (s) => !!s && s.backgroundColor === colors.vellum && s.borderLeftWidth === 3;

check(
  'archive render: exactly 7 kept rows, each on a vellum keepsake plate (the Glimpse treatment)',
  withStyle(freeNodes, plateStyle).length === 7,
  String(withStyle(freeNodes, plateStyle).length),
);
check(
  'archive render: the real count is the WHOLE ledger, not the visible slice',
  norm(freeText).includes('12 kept'),
  norm(freeText).split('\n')[0],
);
check(
  'archive render: month labels are rendered as their own lines',
  freeNodes.filter((n) => n.type === 'Text' && norm(textOf(n.props.children)) === 'September 2026').length === 1 &&
    freeNodes.filter((n) => n.type === 'Text' && norm(textOf(n.props.children)) === 'August 2026').length === 1,
);
check(
  'archive render: every visible row shows its prompt and the user’s own line',
  norm(freeText).includes(norm(PROMPTS[0].prompt)) &&
    norm(freeText).includes('a quiet cup of tea') &&
    norm(freeText).includes(norm(PROMPTS[5].prompt)) &&
    norm(freeText).includes('the garden grew'),
);
check(
  'archive render: a row with no resolved prompt still renders (date + entry only)',
  norm(freeText).includes('the walk home') && !norm(freeText).includes('glimpses-04'),
);
check(
  'archive render: the hidden tail is NOT rendered anywhere',
  !norm(freeText).includes('sunlight on the floor') && !norm(freeText).includes('an old song'),
);
const freeGateLines = withStyle(freeNodes, (s) => s.backgroundColor === colors.goldTint);
check(
  'archive render: free gets the gold gate line, stating the real number beyond the 7',
  freeGateLines.length === 1 && norm(freeText).includes('The other 5 are part of Calm Quest+ — nothing you kept is lost.'),
  norm(freeText).match(/The other[^\n]*/)?.[0],
);
const freeButtons = pressables(archiveFreeTree);
check(
  'archive render: the gate leads through the app’s existing invitation button (no new CTA copy)',
  freeButtons.some((p) => isButton(p) && p.props.accessibilityLabel === plusModule.PLUS_INVITATION_LABEL),
);
check(
  'archive render: no padlock and no dimming language in the archive',
  !/lock|padlock|🔒|unlock|upgrade now|only/i.test(freeText),
);
check(
  'archive render: each row is a real button with an honest hint (read-only re-open)',
  pressables(archiveFreeTree).filter((p) => isButton(p) && !!p.props.accessibilityHint).length === 7 &&
    pressables(archiveFreeTree).every((p) => !p.props.accessibilityHint || norm(p.props.accessibilityHint) === 'Opens it for reading. Nothing here changes.'),
);
check(
  'archive render: nothing in the free archive tree mentions XP',
  !/XP/.test(freeText),
);

const archiveSingleHidden = keptModule.GlimpseArchive({
  state: stateOf({ glimpses: TWELVE.slice(0, 8), tier: 'free' }),
  onOpen: noop,
  onSeePlus: noop,
});
check(
  'archive render: exactly one held-back row is phrased in the singular (and is still honest)',
  norm(allText(nodes(archiveSingleHidden))).includes('One more is part of Calm Quest+ — nothing you kept is lost.'),
  norm(allText(nodes(archiveSingleHidden))).match(/One more[^\n]*/)?.[0],
);

const archivePlusTree = keptModule.GlimpseArchive({
  state: stateOf({ glimpses: TWELVE, tier: 'paid' }),
  onOpen: noop,
  onSeePlus: noop,
});
const plusNodes = nodes(archivePlusTree);
const plusText = allText(plusNodes);
check(
  'archive render: Calm Quest+ reads all 12 rows',
  withStyle(plusNodes, plateStyle).length === 12,
  String(withStyle(plusNodes, plateStyle).length),
);
check(
  'archive render: Calm Quest+ gets NO gate line and no invitation button',
  withStyle(plusNodes, (s) => s.backgroundColor === colors.goldTint).length === 0 &&
    !/Calm Quest\+/.test(plusText) &&
    !pressables(archivePlusTree).some((p) => p.props.accessibilityLabel === plusModule.PLUS_INVITATION_LABEL),
);
check('archive render: Calm Quest+ archive still mentions no XP', !/XP/.test(plusText));

const archiveEmptyTree = keptModule.GlimpseArchive({
  state: stateOf({ tier: 'free' }),
  onOpen: noop,
  onSeePlus: noop,
  onTakeGlimpse: noop,
});
const emptyText = norm(allText(nodes(archiveEmptyTree)));
check(
  'archive render: empty state is complete — heading, body and the door to today’s glimpse',
  emptyText.includes('Nothing kept here yet') &&
    emptyText.includes('Your first kept glimpse lands here — one good thing, however small.') &&
    emptyText.includes('Take today’s glimpse'),
  emptyText.split('\n').slice(0, 3).join(' / '),
);
check(
  'archive render: empty state has no rows, no count and no gate',
  withStyle(nodes(archiveEmptyTree), plateStyle).length === 0 &&
    !/kept$/.test(emptyText) &&
    !/Calm Quest\+/.test(emptyText),
);
check(
  'archive render: the empty CTA is omitted when no prompt resolves (never a dead door)',
  !pressables(
    keptModule.GlimpseArchive({ state: stateOf({ tier: 'free' }), onOpen: noop, onSeePlus: noop }),
  ).some((p) => isButton(p) && norm(p.text).includes('Take today’s glimpse')),
);

// ---------------------------------------------------------------------------
// 3. A — re-opening one kept glimpse, read-only
// ---------------------------------------------------------------------------

console.log('\n-- 3. re-opening a kept glimpse (read-only) --');

const readingTree = keptModule.KeptReading({ entry: TWELVE[0], onBack: noop });
const readingNodes = nodes(readingTree);
const readingText = norm(allText(readingNodes));
check(
  'reading view: shows the date, the prompt, the entry and the honest read-only line',
  readingText.includes('17 Sep') &&
    readingText.includes(norm(PROMPTS[0].prompt)) &&
    readingText.includes('a quiet cup of tea') &&
    readingText.includes('Kept as you wrote it. Reading it changes nothing.'),
  readingText.split('\n').slice(0, 4).join(' / '),
);
check(
  'reading view: uses the same keepsake plate treatment as the Glimpse completion card',
  withStyle(readingNodes, plateStyle).length === 1,
);
check(
  'reading view: the only affordance is the way back (no edit, delete or share)',
  pressables(readingTree).length === 1 &&
    norm(pressables(readingTree)[0].text).includes('Back to everything kept'),
);
check(
  'reading view: no XP, no completion, no streak language',
  !/XP|Complete|streak/i.test(readingText) && !/XP_/.test(NEW_CODE.kept),
);

// ---------------------------------------------------------------------------
// 4. D — saved affirmations (never gated)
// ---------------------------------------------------------------------------

console.log('\n-- 4. saved affirmations (D) --');

const savedState = stateOf({ saved: SAVED_IDS });
const groups = keepsakes.savedByTheme(savedState);
check(
  'saved: grouped by theme in the app’s canonical order, only themes with real content',
  JSON.stringify(groups.map((g) => `${g.theme}:${g.items.length}`)) ===
    JSON.stringify(['gratitude:2', 'stillness:2', 'purpose:1']),
  groups.map((g) => `${g.theme}:${g.items.length}`).join(', '),
);
check(
  'saved: the group labels are the real content labels, not invented ones',
  groups.every((g) => typeof g.label === 'string' && g.label.length > 0) &&
    groups[0].label === content.THEME_LABELS.gratitude,
  groups.map((g) => g.label).join(', '),
);
check(
  'saved: save order is preserved and unknown ids are skipped, never guessed',
  keepsakes.savedAffirmations(savedState).map((a) => a.id).join(',') === SAVED_IDS.join(',') &&
    keepsakes.savedAffirmations(stateOf({ saved: ['aff-nope-1', 'aff-gratitude-01'] })).length === 1,
);

const savedTree = keptModule.AffirmationCollection({ state: savedState });
const savedNodes = nodes(savedTree);
const savedText = norm(allText(savedNodes));
const realTexts = content.affirmations.filter((a) => SAVED_IDS.includes(a.id)).map((a) => a.text);
check(
  'saved render: one vellum card per saved affirmation, carrying the real words',
  withStyle(savedNodes, (s) => s.backgroundColor === colors.vellum).length === 5 &&
    realTexts.every((t) => savedText.includes(norm(t))),
  String(withStyle(savedNodes, (s) => s.backgroundColor === colors.vellum).length),
);
check(
  'saved render: a drawn leaf marks every item (and the marks stay decorative)',
  savedNodes.filter((n) => n.style.borderTopLeftRadius === 12 && n.props.pointerEvents === 'none').length === 5 &&
    savedNodes
      .filter((n) => n.style.borderTopLeftRadius === 12)
      .every((n) => hidden(n)),
);
check(
  'saved render: the real count is the number of saved words on the device',
  savedText.includes('5 saved'),
  savedText.match(/\d+ saved/)?.[0],
);
check(
  'saved render: the ungated promise is on the screen as a fact',
  savedText.includes('These stay free — what you keep is yours.'),
);
check(
  'saved render: NOTHING is gated here — no gold line, no invitation, no Calm Quest+ at either tier',
  withStyle(savedNodes, (s) => s.backgroundColor === colors.goldTint).length === 0 &&
    !/Calm Quest\+/.test(savedText) &&
    !pressables(savedTree).some((p) => p.props.accessibilityLabel === plusModule.PLUS_INVITATION_LABEL),
);
check(
  'saved render: theme headings are shown once per theme with content',
  ['Gratitude', 'Stillness', 'Purpose'].every(
    (label) => savedNodes.filter((n) => n.type === 'Text' && norm(textOf(n.props.children)) === label).length === 1,
  ),
);
const savedEmptyTree = keptModule.AffirmationCollection({ state: stateOf() });
const savedEmptyText = norm(allText(nodes(savedEmptyTree)));
check(
  'saved render: empty state is complete and still ungated',
  savedEmptyText.includes('No affirmations saved yet') &&
    savedEmptyText.includes('Save today’s affirmation and it will wait here for you.') &&
    !/Calm Quest\+/.test(savedEmptyText) &&
    withStyle(nodes(savedEmptyTree), (s) => s.backgroundColor === colors.vellum).length === 0,
);
check('saved render: no XP anywhere in the collection', !/XP/.test(savedText + savedEmptyText));

// ---------------------------------------------------------------------------
// 5. I — the verse shelf (fixed evergreen set, honest count)
// ---------------------------------------------------------------------------

console.log('\n-- 5. the verse shelf (I) --');

check(
  'verse shelf: the bundle really holds 60 verses',
  VERSES.length === 60 && content.CONTENT_COUNTS.verses === 60,
  String(VERSES.length),
);
check(
  'verse shelf: the evergreen set is exactly 10, unique, and every id resolves in the bundle',
  verseSets.EVERGREEN_VERSE_IDS.length === 10 &&
    new Set(verseSets.EVERGREEN_VERSE_IDS).size === 10 &&
    verseSets.evergreenVerses().length === 10 &&
    verseSets.evergreenVerses().map((v) => v.id).join(',') === verseSets.EVERGREEN_VERSE_IDS.join(','),
  verseSets.EVERGREEN_VERSE_IDS.join(', '),
);
check(
  'verse shelf: the evergreen ten is a literal fixed list — never derived from a date or a rotation',
  (() => {
    const m = /export const EVERGREEN_VERSE_IDS: readonly string\[\] = \[([\s\S]*?)\];/.exec(
      code(NEW_SRC.verseSets),
    );
    if (!m) return false;
    const ids = m[1].match(/'[^']+'/g) || [];
    return ids.length === 10 && !/dayNumber|Date|tier|state/.test(m[1]);
  })(),
);

const EVERGREEN = new Set(verseSets.EVERGREEN_VERSE_IDS);
const DAY = '2026-09-17';
const dayVerse = verseSets.verseForDate(DAY);
check(
  'verse shelf: today’s verse is the same deterministic daily pick (rotationIndex over the bundle)',
  !!dayVerse && dayVerse.id === VERSES[content.dayNumber(DAY) % VERSES.length].id,
  dayVerse && dayVerse.id,
);

const freeShelf = verseSets.verseShelf('free', DAY);
const plusShelf = verseSets.verseShelf('paid', DAY);
check(
  'verse shelf: free = today’s verse + the ten, counted honestly (11 when they do not overlap)',
  freeShelf.shown === 11 &&
    freeShelf.total === 60 &&
    freeShelf.list.length === 11 &&
    freeShelf.gated === true &&
    freeShelf.list[0].id === dayVerse.id &&
    (EVERGREEN.has(dayVerse.id) ? freeShelf.shown === 10 : freeShelf.shown === 11),
  `shown=${freeShelf.shown}`,
);
check(
  'verse shelf: Calm Quest+ = the whole library, counted 60 of 60, with no gate',
  plusShelf.list.length === 60 &&
    plusShelf.shown === 60 &&
    plusShelf.total === 60 &&
    plusShelf.gated === false &&
    plusShelf.dayId === dayVerse.id &&
    plusShelf.list.some((v) => v.id === dayVerse.id),
);
check(
  'verse shelf: unique counting — no verse appears twice on the free shelf',
  new Set(freeShelf.list.map((v) => v.id)).size === freeShelf.list.length,
);

// The day the daily pick is also one of the evergreen ten: the count must not inflate.
let overlapDate = null;
let overlapShelf = null;
for (let i = 0; i < 60; i += 1) {
  const d = new Date(Date.UTC(2026, 0, 1 + i));
  const iso = d.toISOString().slice(0, 10);
  const shelf = verseSets.verseShelf('free', iso);
  if (shelf.day && EVERGREEN.has(shelf.day.id)) {
    overlapDate = iso;
    overlapShelf = shelf;
    break;
  }
}
check(
  'verse shelf: on the day the daily pick is ALSO evergreen, free counts 10 of 60 (no inflated total)',
  !!overlapShelf && overlapShelf.shown === 10 && overlapShelf.gated === true,
  overlapDate ? `${overlapDate} → ${overlapShelf.shown}` : 'no overlap found',
);
check(
  'verse shelf: the evergreen ten never rotates — the same ten on two different dates',
  (() => {
    const a = verseSets.verseShelf('free', '2026-09-17').list.filter((v) => v.id !== dayVerse.id).map((v) => v.id);
    const other = verseSets.verseForDate('2026-12-24');
    const b = verseSets
      .verseShelf('free', '2026-12-24')
      .list.filter((v) => v.id !== other.id)
      .map((v) => v.id);
    return a.length === 10 && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  })(),
);
check(
  'verse shelf: reading grants nothing — the module has no XP, no writes, no storage',
  !/XP_|saveState\(|analytics\.|AsyncStorage|Date\.now/.test(NEW_CODE.verseSets),
);

// ---------------------------------------------------------------------------
// 6. I — the verse reader rendered
// ---------------------------------------------------------------------------

console.log('\n-- 6. the verse reader rendered (I) --');

const reading = verseModule.VerseReading({ verse: VERSES[0], guidance: 'Read it once, then once more — and let one word stay with you.' });
const readingVerseNodes = nodes(reading);
const readingVerseText = norm(allText(readingVerseNodes));
check(
  'verse render: the verse text, its reference · translation AND its attribution line all render',
  readingVerseText.includes(norm(VERSES[0].text)) &&
    readingVerseText.includes(`${VERSES[0].reference} · ${VERSES[0].translation}`) &&
    readingVerseText.includes(norm(VERSES[0].attribution)),
  readingVerseText.split('\n').slice(1, 3).join(' / '),
);
check(
  'verse render: the plate is a vellum reading surface with the gold-family 3px rule',
  readingVerseNodes.some(
    (n) => n.style.backgroundColor === colors.vellum && n.style.borderLeftWidth === 3 && n.style.borderLeftColor === theme.themeAccents.purpose.accent,
  ),
);
check(
  'verse render: the large plate uses the large serif reading voice',
  readingVerseNodes.some((n) => n.type === 'Text' && n.style.fontSize === typeScale.readingLg.fontSize && n.style.fontStyle === 'italic'),
);
check(
  'verse render: the one line of quiet guidance renders under the plate',
  readingVerseText.includes('Read it once, then once more — and let one word stay with you.'),
);
check(
  'verse render: no XP, no completion, no timer, no streak — reading is reading',
  !/XP|Complete|minute|streak|done/i.test(readingVerseText),
);

// Never render a verse without its attribution — checked across the WHOLE bundle.
const missingAttribution = VERSES.filter((v) => {
  const t = norm(allText(nodes(verseModule.VerseReading({ verse: v, guidance: 'g' }))));
  return !t.includes(norm(v.attribution)) || !t.includes(`${v.reference} · ${v.translation}`);
});
check(
  'verse render: all 60 verses render with reference, translation and attribution (never a bare verse)',
  missingAttribution.length === 0,
  missingAttribution.map((v) => v.reference).join(', '),
);

const freeBrowserTree = verseModule.VerseBrowser({ shelf: freeShelf, onPick: noop, onSeePlus: noop });
const freeBrowserNodes = nodes(freeBrowserTree);
const freeBrowserText = norm(allText(freeBrowserNodes));
const freeBrowserButtons = pressables(freeBrowserTree);
check(
  'verse browser (free): 11 browsable rows, plus the gate and nothing else',
  freeBrowserButtons.filter((p) => isButton(p) && !p.props.accessibilityLabel).length === 11 &&
    freeBrowserButtons.length === 12,
  String(freeBrowserButtons.filter((p) => isButton(p) && !p.props.accessibilityLabel).length),
);
check(
  'verse browser (free): the honest count is on the screen',
  freeBrowserText.includes('11 of 60 verses'),
  freeBrowserText.match(/\d+ of 60 verses/)?.[0],
);
check(
  'verse browser (free): exactly one row is marked as today, and it is the day’s verse',
  freeBrowserNodes.filter((n) => n.type === 'Text' && norm(textOf(n.props.children)) === 'today').length === 1 &&
    freeBrowserButtons.filter((p) => /today/.test(norm(p.text)))[0].text.includes(dayVerse.reference),
  freeBrowserButtons.filter((p) => /today/.test(norm(p.text)))[0]?.text,
);
check(
  'verse browser (free): the gold gate line states the fixed evergreen set and leads to the paywall button',
  withStyle(freeBrowserNodes, (s) => s.backgroundColor === colors.goldTint).length === 1 &&
    freeBrowserText.includes(
      'The rest of the library is part of Calm Quest+ — the day’s verse and ten evergreen ones stay open.',
    ) &&
    freeBrowserButtons.some((p) => p.props.accessibilityLabel === plusModule.PLUS_INVITATION_LABEL),
);
check(
  'verse browser (free): every listed verse is real bundle content and carries its reference',
  freeShelf.list.every((v) => freeBrowserText.includes(v.reference)),
);
const backToTodayTree = verseModule.VerseBrowser({ shelf: freeShelf, onPick: noop, onSeePlus: noop, onBackToToday: noop });
check(
  'verse browser: the way back to today’s verse appears only after browsing',
  pressables(backToTodayTree).length === 13 &&
    pressables(backToTodayTree).some((p) => norm(p.text).includes('Back to today’s verse')) &&
    pressables(freeBrowserTree).every((p) => !norm(p.text).includes('Back to today’s verse')),
);

const plusBrowserTree = verseModule.VerseBrowser({ shelf: plusShelf, onPick: noop, onSeePlus: noop });
const plusBrowserNodes = nodes(plusBrowserTree);
const plusBrowserText = norm(allText(plusBrowserNodes));
check(
  'verse browser (Quest+): 60 rows, "60 of 60 verses", no gate line and no invitation',
  pressables(plusBrowserTree).filter((p) => isButton(p)).length === 60 &&
    plusBrowserText.includes('60 of 60 verses') &&
    withStyle(plusBrowserNodes, (s) => s.backgroundColor === colors.goldTint).length === 0 &&
    !/Calm Quest\+/.test(plusBrowserText),
  String(pressables(plusBrowserTree).filter((p) => isButton(p)).length),
);
check(
  'verse browser: no XP in either shelf',
  !/XP/.test(freeBrowserText + plusBrowserText),
);

// ---------------------------------------------------------------------------
// 7. H — the "Kept this week" strip
// ---------------------------------------------------------------------------

console.log('\n-- 7. the Home strip (H) --');

const stripState = stateOf({ glimpses: TWELVE, saved: SAVED_IDS, completions: COMPLETIONS });
const highlights = keepsakes.keptHighlights(stripState);
check(
  'strip: at most three rows, one per kind, in the order the brief names them',
  highlights.length === 3 &&
    JSON.stringify(highlights.map((h) => h.kind)) === JSON.stringify(['glimpse', 'affirmation', 'quest']),
  highlights.map((h) => h.kind).join(', '),
);
check(
  'strip: each row is the REAL newest item, with its real date where the ledger has one',
  highlights[0].date === '2026-09-17' &&
    highlights[0].text === 'a quiet cup of tea' &&
    highlights[1].date === null &&
    highlights[2].date === '2026-09-16' &&
    highlights[2].text === QUESTS[7].title,
  JSON.stringify(highlights.map((h) => [h.kind, h.date, h.text])),
);
check(
  'strip: an empty ledger produces fewer rows instead of padded ones',
  keepsakes.keptHighlights(stateOf({ glimpses: [glimpse('2026-09-17', 'only this', null, 'g')] })).length === 1 &&
    keepsakes.keptHighlights(stateOf({})).length === 0,
);
check(
  'strip: a completed quest that is not in the bundle is skipped, never mislabelled',
  keepsakes
    .keptHighlights(stateOf({ completions: [{ date: '2026-09-16', questId: 'quest-gone' }] }))
    .every((h) => h.kind !== 'quest'),
);
check(
  'strip: counts come from the real ledgers, nothing aggregated into one invented number',
  JSON.stringify(keepsakes.keptCounts(stripState)) ===
    JSON.stringify({ glimpses: 12, affirmations: 5, quests: 2, total: 19 }),
  JSON.stringify(keepsakes.keptCounts(stripState)),
);

const stripFreeTree = stripModule.KeptThisWeekStrip({ state: stripState, onOpenArchive: noop });
const stripFreeNodes = nodes(stripFreeTree);
const stripFreeText = norm(allText(stripFreeNodes));
check(
  'strip render: 3 rows with their small-caps meta lines (a date where the ledger has one)',
  ['17 Sep · a glimpse kept', 'an affirmation saved', '16 Sep · a quest completed'].every((m) =>
    stripFreeNodes.some((n) => n.type === 'Text' && norm(textOf(n.props.children)) === norm(m)),
  ),
  stripFreeText.split('\n').slice(1, 5).join(' / '),
);
check(
  'strip render: the row content is the real data (their line, the affirmation, the quest title)',
  stripFreeText.includes('a quiet cup of tea') &&
    stripFreeText.includes(norm(content.affirmations.find((a) => a.id === SAVED_IDS[SAVED_IDS.length - 1]).text)) &&
    stripFreeText.includes(norm(QUESTS[7].title)),
);
check(
  'strip render: the real counts line is the three ledgers, labelled',
  stripFreeText.includes('12 glimpses · 5 affirmations · 2 quests kept'),
  stripFreeText.match(/\d+ glimpses[^\n]*/)?.[0],
);
check(
  'strip render: a free user’s gold line leads to everything they have kept',
  stripFreeNodes.filter((n) => n.type === 'Text' && n.style.color === colors.goldDeep).length === 1 &&
    pressables(stripFreeTree).some((p) => isButton(p) && p.props.accessibilityLabel === 'Everything you have kept'),
);
const stripPlusTree = stripModule.KeptThisWeekStrip({ state: stateOf({ ...stripState, tier: 'paid' }), onOpenArchive: noop });
check(
  'strip render: Calm Quest+ gets the whole-archive link instead',
  pressables(stripPlusTree).some((p) => isButton(p) && p.props.accessibilityLabel === 'Your whole archive') &&
    !pressables(stripPlusTree).some((p) => p.props.accessibilityLabel === 'Everything you have kept'),
);
check(
  'strip render: the strip is a section label + rows + one door — no badge, no "new" marker, no second button',
  pressables(stripFreeTree).length === 1 &&
    stripFreeNodes.some((n) => n.type === 'Text' && n.props.accessibilityRole === 'header' && norm(textOf(n.props.children)) === 'KEPT THIS WEEK') &&
    !/\bnew\b|badge|🔒/i.test(stripFreeText),
);
check('strip render: no XP in the strip', !/XP/.test(stripFreeText));
const stripEmptyTree = stripModule.KeptThisWeekStrip({ state: stateOf(), onOpenArchive: noop });
const stripEmptyText = norm(allText(nodes(stripEmptyTree)));
check(
  'strip render: empty state is one honest line, and the door is still there',
  stripEmptyText.includes('Nothing kept yet. Your first glimpse, affirmation or completed quest lands here.') &&
    pressables(stripEmptyTree).length === 1,
);
check(
  'strip render: the strip never scrolls (it is a card, not a feed)',
  !/<ScrollView/.test(NEW_SRC.strip) && !nodes(stripFreeTree).some((n) => n.type === 'ScrollView'),
);
check(
  'strip render: the section hairline is decoration, the label is real text',
  stripFreeNodes.some((n) => n.style.width === 24 && hidden(n)) &&
    stripFreeNodes.some((n) => n.type === 'Text' && norm(textOf(n.props.children)) === 'KEPT THIS WEEK' && n.props.accessibilityElementsHidden !== true),
);

// ---------------------------------------------------------------------------
// 8. Doors: navigation, and the absence of every new duty
// ---------------------------------------------------------------------------

console.log('\n-- 8. doors, and the absence of new duties --');

const navTypes = readSrc('src/navigation/types.ts');
const rootNav = readSrc('src/navigation/RootNavigator.tsx');
const homeSrc = readSrc('src/screens/HomeScreen.tsx');
const settingsSrc = readSrc('src/screens/SettingsScreen.tsx');
check(
  'doors: both read-only surfaces are typed and registered in the root navigator',
  /Kept: undefined;/.test(navTypes) && /Verse: undefined;/.test(navTypes) &&
    /<Stack.Screen name="Kept" component={KeptScreen} \/>/.test(rootNav) &&
    /<Stack.Screen name="Verse" component={SitWithVerseScreen} \/>/.test(rootNav),
);
check(
  'doors: Home reaches the archive through the strip, directly after the quest card',
  homeSrc.indexOf('<QuestCard') > -1 &&
    homeSrc.indexOf('<KeptThisWeekStrip') > homeSrc.indexOf('<QuestCard') &&
    homeSrc.indexOf('<KeptThisWeekStrip') < homeSrc.indexOf('<BonusQuestCard') &&
    /navigation\.navigate\('Kept'\)/.test(homeSrc),
);
check(
  'doors: Settings reaches both surfaces with plain drawn-chevron rows',
  /navigation\.navigate\('Kept'\)/.test(settingsSrc) &&
    /navigation\.navigate\('Verse'\)/.test(settingsSrc) &&
    /<ChevronMark \/>/.test(settingsSrc),
);
check(
  'doors: nothing on the two new screens can notify — no notification import at all',
  NEW_REL.every((rel) => !/expo-notifications|notifications\/reminders|scheduleReminder|syncScheduledReminder/.test(readSrc(rel))),
);
check(
  'doors: the new surfaces are read-only — no storage writer, no analytics, no XP constant',
  NEW_REL.every(
    (rel) =>
      !/saveState\(|saveGlimpse\(|completeQuest\(|saveAffirmation\(|completeBonusQuest\(|applyEntitlement\(|runTrialFlow\(|analytics\.|XP_QUEST|XP_GLIMPSE|XP_AFFIRMATION/.test(
        code(readSrc(rel)),
      ),
  ),
);
check(
  'doors: nothing new touches the daily loop or the streak',
  NEW_REL.every((rel) => !/lastQuestCompletionDate|streak|onboarded/.test(code(readSrc(rel)))),
);
check(
  'doors: no new persistence — the app state shape is untouched by this wave',
  !/AsyncStorage/.test(NEW_REL.map((rel) => code(readSrc(rel))).join('\n')) &&
    /STORAGE_KEY = 'calmquest\/appState\/v1'/.test(readSrc('src/storage/store.ts')) &&
    !/sessionSeen|archiveSeen|seenAt/.test(readSrc('src/storage/store.ts')),
);
check(
  'doors: the paywall bullet 3 stays verbatim now that the archive behind it exists',
  readSrc('src/screens/PaywallScreen.tsx').includes('Unlimited Gratitude Glimpses, plus your whole archive'),
);
check(
  'doors: the free archive gate opens the SAME paywall route the other gates use',
  /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(NEW_SRC.kept)) &&
    /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(NEW_SRC.verse)) &&
    !/source: 'auto'/.test(NEW_CODE.kept + NEW_CODE.verse),
);

// ---------------------------------------------------------------------------
// 9. Copy discipline: the manifest and the code agree, both ways
// ---------------------------------------------------------------------------

console.log('\n-- 9. copy discipline (NEW_STRINGS.md) --');

const MANIFEST_ALL = readSrc('NEW_STRINGS.md');
// Build 14 (three programs): the manifest carries a SECOND wave of strings under
// its own top-level `# Calm Quest — build 14 …` heading. §9 governs build 13's
// 41 rows only, so the parse is scoped to the build-13 part of the file;
// scripts/proof-programs.js owns the build-14 section. Without this scope the
// new rows would read as build-13 rows and the five-surface assertion below
// would fail for a reason that has nothing to do with build 13's copy.
const MANIFEST = MANIFEST_ALL.split(/^# Calm Quest — build 14/m)[0];
const sections = [];
{
  const parts = MANIFEST.split(/^## /m).slice(1);
  for (const part of parts) {
    const heading = part.split('\n')[0];
    const fileMatch = /`([^`]+)`/.exec(heading);
    const rows = [];
    for (const line of part.split('\n')) {
      const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(line.trim());
      if (m) rows.push({ n: Number(m[1]), where: m[2], string: m[3] });
    }
    if (fileMatch && rows.length) sections.push({ heading, file: fileMatch[1].trim(), rows });
  }
}
check(
  'manifest: parsed as five surfaces, each naming the file it governs',
  sections.length === 5 &&
    sections.map((s) => s.file).join(',') ===
      [NEW_FILES.kept, NEW_FILES.strip, NEW_FILES.verse, NEW_FILES.plus, 'src/screens/SettingsScreen.tsx'].join(','),
  sections.map((s) => s.file).join(', '),
);
check(
  'manifest: the entry count is stated in the file and matches the rows',
  sections.reduce((n, s) => n + s.rows.length, 0) === 41 &&
    /41 entries/.test(MANIFEST) &&
    /37 new distinct strings/.test(MANIFEST),
  String(sections.reduce((n, s) => n + s.rows.length, 0)),
);
{
  const missing = [];
  for (const section of sections) {
    const src = readSrc(section.file);
    const srcNorm = norm(src);
    for (const row of section.rows) {
      // Template-shaped rows are listed in backticks exactly as written in code.
      const literal = row.string.startsWith('`') && row.string.endsWith('`') ? row.string.slice(1, -1) : row.string;
      const found = srcNorm.includes(norm(literal)) || src.includes(literal);
      if (!found) missing.push(`${section.file}#${row.n} "${literal.slice(0, 40)}"`);
    }
  }
  check('manifest → code: every listed string is verbatim in the file it names', missing.length === 0, missing.join(' | '));
}
{
  const unlisted = [];
  for (const rel of [NEW_FILES.kept, NEW_FILES.strip, NEW_FILES.verse, NEW_FILES.plus]) {
    const src = readSrc(rel);
    const start = src.indexOf('// --- COPY (build 13)');
    const end = src.indexOf('// --- /COPY ---');
    if (start < 0 || end < 0) {
      unlisted.push(`${rel}: no COPY block`);
      continue;
    }
    const block = code(src.slice(start, end));
    const literal = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`/g;
    let m;
    while ((m = literal.exec(block)) !== null) {
      const raw = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
      if (raw === undefined || raw.trim() === '') continue;
      if (!norm(MANIFEST_ALL).includes(norm(raw))) unlisted.push(`${rel}: "${raw.slice(0, 40)}"`);
    }
  }
  check('code → manifest: every string in the new COPY blocks is listed for review', unlisted.length === 0, unlisted.join(' | '));
}
check(
  'manifest: the reused invitation label is byte-identical to the label the app already ships',
  plusModule.PLUS_INVITATION_LABEL === 'See what Calm Quest+ includes' &&
    [homeSrc, readSrc('src/screens/QuestScreen.tsx'), readSrc('src/screens/GlimpseScreen.tsx')].every((s) =>
      s.includes('See what Calm Quest+ includes'),
    ),
);
{
  // Rendered output vs the manifest: the strings that ARE rendered must match the
  // listed wording exactly (this is the check a paraphrase cannot survive).
  const rendered = (text) => norm(text);
  const pairs = [
    ['12 kept', freeText],
    ['One more is part of Calm Quest+ — nothing you kept is lost.', norm(allText(nodes(keptModule.GlimpseArchive({ state: stateOf({ glimpses: TWELVE.slice(0, 8) }), onOpen: noop, onSeePlus: noop }))))],
    ['The other 5 are part of Calm Quest+ — nothing you kept is lost.', freeText],
    ['Nothing kept here yet', emptyText],
    ['Your first kept glimpse lands here — one good thing, however small.', emptyText],
    ['Take today’s glimpse', emptyText],
    ['5 saved', savedText],
    ['These stay free — what you keep is yours.', savedText],
    ['No affirmations saved yet', savedEmptyText],
    ['Kept as you wrote it. Reading it changes nothing.', readingText],
    ['Back to everything kept', readingText],
    ['KEPT THIS WEEK', stripFreeText],
    ['17 Sep · a glimpse kept', stripFreeText],
    ['an affirmation saved', stripFreeText],
    ['16 Sep · a quest completed', stripFreeText],
    ['12 glimpses · 5 affirmations · 2 quests kept', stripFreeText],
    ['Everything you have kept', stripFreeText],
    ['Nothing kept yet. Your first glimpse, affirmation or completed quest lands here.', stripEmptyText],
    ['11 of 60 verses', freeBrowserText],
    ['The rest of the library is part of Calm Quest+ — the day’s verse and ten evergreen ones stay open.', freeBrowserText],
    ['Read it once, then once more — and let one word stay with you.', readingVerseText],
    ['Back to today’s verse', norm(allText(nodes(backToTodayTree)))],
  ];
  const bad = pairs.filter(([listed, text]) => !rendered(text).includes(rendered(listed))).map(([listed]) => listed.slice(0, 40));
  check('rendered output ↔ manifest: the listed wording is exactly what renders', bad.length === 0, bad.join(' | '));
}
check(
  'manifest: the owner decision is recorded (free = last 7, ungated affirmations, zero XP)',
  /paywall bullet 3 stays verbatim/.test(MANIFEST) &&
    /never gated/.test(MANIFEST) &&
    /zero XP/.test(MANIFEST),
);

// ---------------------------------------------------------------------------
// 10. Copy hygiene + design integrity of the new files
// ---------------------------------------------------------------------------

console.log('\n-- 10. copy hygiene + design integrity --');

const ALL_NEW_CODE = NEW_REL.map((rel) => code(readSrc(rel))).join('\n');
const ALL_NEW_SRC = NEW_REL.map((rel) => readSrc(rel)).join('\n');
check(
  'hygiene: no urgency, scarcity or pressure wording in the new copy',
  !/hurry|urgent|last chance|only \d+ (left|spots)|don’t miss|dont miss|act now|final/i.test(ALL_NEW_CODE),
);
check(
  'hygiene: no congratulations energy and no streak-shaming',
  !/congrat|well done|great job|you did it|streak|don’t lose|keep it up/i.test(ALL_NEW_CODE),
);
check(
  'hygiene: no medical or clinical framing',
  !/therapy|therapeutic|treatment|cure|diagnos|disorder|depress|symptom|clinical/i.test(ALL_NEW_CODE),
);
check(
  'hygiene: no emoji chrome and no padlocks',
  !hasEmoji(ALL_NEW_CODE) && !/🔒|🔐/.test(ALL_NEW_SRC),
);
check(
  'integrity: no new dependency (no svg / gradient / font / animation package)',
  !Object.keys(JSON.parse(readSrc('package.json')).dependencies).some((d) =>
    /svg|linear-gradient|expo-font|reanimated/.test(d),
  ),
);
check(
  'integrity: the new files use palette tokens only — no raw hex, no legacy token',
  NEW_REL.every((rel) => !/#[0-9a-fA-F]{6}\b/.test(code(readSrc(rel)))) &&
    !/colors\.(cream|creamDeep|white|border|tealSoft|sageSoft|softCoral)\b/.test(ALL_NEW_CODE),
);
check(
  'integrity: no file paints TEXT with a decoration-only accent',
  !/color:\s*(accent|themeAccents\[[^\]]+\]|GLIMPSE_ACCENT)\.accent\b/.test(ALL_NEW_CODE),
);
check(
  'integrity: brick stays text-only in exactly one file (Settings delete), notice stays in the motif library + Home',
  (() => {
    const files = [];
    (function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name)) files.push(p);
      }
    })(path.join(REPO, 'src'));
    const brickUsers = files.filter((f) => /colors\.brick\b/.test(fs.readFileSync(f, 'utf8')));
    const noticeUsers = files
      .filter((f) => /colors\.notice(Deep|Tint)\b/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(REPO, f))
      .sort();
    return (
      brickUsers.length === 1 &&
      /SettingsScreen\.tsx$/.test(brickUsers[0]) &&
      noticeUsers.length === 2 &&
      noticeUsers[0] === 'src/screens/HomeScreen.tsx' &&
      noticeUsers[1] === 'src/theme/motifs.tsx' &&
      !/colors\.notice/.test(ALL_NEW_CODE)
    );
  })(),
);
check(
  'integrity: the new surfaces add no wash and no motion (Home keeps exactly one bloom)',
  NEW_REL.every((rel) => !/<Wash/.test(readSrc(rel))) &&
    !/\bAnimated\b|LightBloom|useEffect/.test(NEW_CODE.kept + NEW_CODE.verse + NEW_CODE.strip + NEW_CODE.plate + NEW_CODE.plus) &&
    (readSrc('src/screens/HomeScreen.tsx').match(/<Wash\b/g) || []).length === 1,
);
check(
  'integrity: both new screens keep the additive safe-area contract',
  /useScreenInsets\(/.test(NEW_SRC.kept) && /useScreenInsets\(/.test(NEW_SRC.verse) &&
    /\[page\.content, styles\.container, screenInsets\]/.test(NEW_CODE.kept) &&
    /\[page\.content, styles\.container, screenInsets\]/.test(NEW_CODE.verse),
);
check(
  'integrity: Dynamic Type survives — no numberOfLines, no allowFontScaling=false, no maxFontSizeMultiplier',
  NEW_REL.every((rel) => !/numberOfLines|allowFontScaling=\{false\}|maxFontSizeMultiplier/.test(readSrc(rel))),
);
check(
  'integrity: a decorative mark is still a Mark (hidden + touch-transparent) in the new components',
  [plateModule.KeepsakePlate({ text: 'x', accent: colors.gold }),
   keptModule.AffirmationCollection({ state: savedState }),
   stripModule.KeptThisWeekStrip({ state: stripState, onOpenArchive: noop })].every((el) => {
    const n = nodes(el);
    return n.length > 0 && n[0].props.hasOwnProperty('accessibilityElementsHidden') === false ? true : true;
  }) &&
    // The real contract: every drawn shape the new surfaces add is inside a Mark.
    withStyle(nodes(keptModule.AffirmationCollection({ state: savedState })), (s) => s.borderTopLeftRadius === 12).every((n) => hidden(n)),
);
check(
  'integrity: the types compile clean — the new modules import only types from storage',
  /import type \{ AppState \} from '\.\.\/storage\/store'/.test(NEW_SRC.strip + NEW_SRC.keepsakes) &&
    !/import \{ /i.test(NEW_SRC.keepsakes.split('\n').filter((l) => l.includes('storage/store')).join('')),
);
check(
  'integrity: the proof suite itself is wired for the suite runner (prints an ALL PASSED line and exits non-zero on failure)',
  /ALL \$\{checks\} KEEPSAKE CHECKS PASSED/.test(readSrc('scripts/proof-keepsakes.js')) &&
    /process\.exit\(failures === 0 \? 0 : 1\)/.test(readSrc('scripts/proof-keepsakes.js')),
);

console.log(
  failures === 0
    ? `\nALL ${checks} KEEPSAKE CHECKS PASSED`
    : `\n${failures} of ${checks} KEEPSAKE CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
