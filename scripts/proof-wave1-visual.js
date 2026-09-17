#!/usr/bin/env node
/**
 * Wave 1 (Visual-Richness) proof — tokens + drawn motifs.
 *
 * Three layers, all read-only (no behaviour is exercised or changed here):
 *  1. TOKENS: the exact retuned palette, the three shadow weights, the serif
 *     type scale, WCAG contrast (every `deep` ≥ 4.5:1 on its own `tint`;
 *     every `accent` < 4.5:1 — decoration only), and that no pure white/black
 *     and no `softCoral` survive anywhere in `src/`.
 *  2. MOTIFS (render level): the components in `src/theme/motifs.tsx` are
 *     actually invoked and their element trees traversed, so the assertions
 *     are about what the components really draw — streak buckets, grace water
 *     drops, the 15 gold gate marks, the ghosted next stage, and the
 *     accessibility hints on decorative marks.
 *  3. HOME SOURCE: §3.2's structure is present (one wash, hero card, vellum
 *     verse plate, sage done state, growth strip, de-jailed themes) and the
 *     frozen copy is byte-identical to the spec's verbatim lines.
 *
 * Same harness style as the other proofs: a tiny react-native shim + a
 * TypeScript transpile loader (jsx: ReactJSX, so `react/jsx-runtime` resolves
 * from node_modules).
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
const FLAKE = {
  'react-native': {
    StyleSheet: { create: (o) => o, hairlineWidth: 1 },
    Platform: { OS: 'ios', select: (spec) => (spec.ios !== undefined ? spec.ios : spec.default) },
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Alert: { alert: () => {} },
  },
  // `src/theme/index.ts` also re-exports the safe-area hook; the shim keeps the
  // real native module out of this read-only proof.
  'react-native-safe-area-context': {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : ''));
  if (!ok) failures += 1;
}

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------
function rgb(hex) {
  const m = /^#([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function lum(hex) {
  const c = rgb(hex);
  if (!c) return null;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Element-tree traversal (render level)
// ---------------------------------------------------------------------------
/** Flatten a react-native style (object | array | falsy) into one object. */
function flat(style) {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => Object.assign(acc, flat(s)), {});
  if (typeof style === 'object') return style;
  return {};
}

/** Invoke every function component in the tree and collect the host nodes. */
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
  const style = flat(element.props && element.props.style);
  out.push({ type: element.type, props: element.props || {}, style });
  nodes(element.props && element.props.children, out);
  return out;
}
const withStyle = (list, predicate) => list.filter((n) => predicate(n.style, n.props));

// ---------------------------------------------------------------------------
// 1. Tokens
// ---------------------------------------------------------------------------
const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const { colors, themeAccents, withAlpha, GATED_TINT_ALPHA, radii, shadows, typeScale, serifFamily, badges } = theme;

const EXPECTED = {
  paper: '#FCF9F4',
  paperDeep: '#F4EEE3',
  vellum: '#FBF7EE',
  card: '#FFFDFA',
  paperEdge: '#EAE2D3',
  rule: '#E3DAC7',
  sand: '#EDE5D6',
  ink: '#26312C',
  inkSoft: '#55615A',
  inkFaint: '#7C877F',
  teal: '#0E7A72',
  tealDeep: '#0A5F59',
  tealTint: '#DCEBE6',
  sageTint: '#E9F0E2',
  sageMark: '#7D8F6E',
  sageDeep: '#4F6B45',
  goldTint: '#FAF1D9',
  gold: '#B98A2F',
  goldDeep: '#7A5B1F',
  goldBright: '#C9A227',
  noticeTint: '#EEEAF4',
  noticeDeep: '#4C4269',
  brick: '#9E4B3F',
};
for (const [token, value] of Object.entries(EXPECTED)) {
  check(`palette ${token} = ${value}`, colors[token] === value, String(colors[token]));
}
check('no pure white anywhere in the palette', !Object.values(colors).some((v) => /^#fff{3,6}$/i.test(String(v))));
check('no pure black anywhere in the palette', !Object.values(colors).some((v) => /^#0{3,6}$/i.test(String(v))));
check('legacy softCoral is gone from the palette', !('softCoral' in colors));
check('legacy cream/white/border names are gone', !['cream', 'creamDeep', 'white', 'border', 'tealSoft', 'sageSoft', 'sage'].some((k) => k in colors));

// Theme accents (5 brands, one hue each) + the exact wash alphas.
const EXPECTED_THEMES = {
  gratitude: { tint: '#F9EDDD', accent: '#C08339', deep: '#8A5620', wash: 'rgba(192,131,57,0.14)' },
  stillness: { tint: '#E6EEF3', accent: '#4A7A99', deep: '#2B5570', wash: 'rgba(74,122,153,0.13)' },
  purpose: { tint: '#FAF1D9', accent: '#C9A227', deep: '#7A5B1F', wash: 'rgba(201,162,39,0.14)' },
  forgiveness: { tint: '#F8EBE9', accent: '#BA8288', deep: '#7E4A55', wash: 'rgba(186,130,136,0.13)' },
  patience: { tint: '#EEEAF4', accent: '#7A6B9C', deep: '#4C4269', wash: 'rgba(122,107,156,0.12)' },
};
for (const [name, expected] of Object.entries(EXPECTED_THEMES)) {
  const got = themeAccents[name];
  check(
    `theme ${name} tint/accent/deep/wash`,
    got &&
      got.tint === expected.tint &&
      got.accent === expected.accent &&
      got.deep === expected.deep &&
      got.wash === expected.wash,
    JSON.stringify(got),
  );
}

// Contrast: state uses `deep`; accents are decoration only (§1b/§1c note).
for (const [name, t] of Object.entries(EXPECTED_THEMES)) {
  const deepOnTint = ratio(t.deep, t.tint);
  check(
    `theme ${name}: deep ≥ 4.5:1 on its tint`,
    deepOnTint >= 4.5,
    `${r2(deepOnTint)}:1`,
  );
  // Informational: the accents sit near/under the text threshold, which is why
  // they are paint only. The hard rule is enforced below (and in the source).
  console.log(`NOTE theme ${name}: accent on paper = ${r2(ratio(t.accent, colors.paper))}:1 (paint, never text)`);
}
const SEMANTIC = [
  ['sageDeep on sageTint', colors.sageDeep, colors.sageTint],
  ['goldDeep on goldTint', colors.goldDeep, colors.goldTint],
  ['goldDeep on sand', colors.goldDeep, colors.sand],
  ['noticeDeep on noticeTint', colors.noticeDeep, colors.noticeTint],
  ['ink on paper', colors.ink, colors.paper],
  ['inkSoft on paper', colors.inkSoft, colors.paper],
  ['inkSoft on sand', colors.inkSoft, colors.sand],
  ['brick on paper', colors.brick, colors.paper],
];
for (const [label, fg, bg] of SEMANTIC) {
  const r = ratio(fg, bg);
  check(`${label} ≥ 4.5:1`, r >= 4.5, `${r2(r)}:1`);
}
const faint = ratio(colors.inkFaint, colors.paper);
check('inkFaint is a large-text/decoration ink (3:1 ≤ r < 4.5:1)', faint >= 3 && faint < 4.5, `${r2(faint)}:1`);

check(
  'withAlpha() builds rgba from a hex tint (gated rows use a real tint, not opacity)',
  withAlpha('#F9EDDD', GATED_TINT_ALPHA) === 'rgba(249,237,221,0.55)',
  withAlpha('#F9EDDD', GATED_TINT_ALPHA),
);

// Three shadow weights (§2.2) — elevation is information.
check(
  'shadow `flat` = y2/r8 @4%',
  shadows.flat.shadowOffset.height === 2 && shadows.flat.shadowRadius === 8 && shadows.flat.shadowOpacity === 0.04,
);
check(
  'shadow `card` = y6/r16 @7%',
  shadows.card.shadowOffset.height === 6 && shadows.card.shadowRadius === 16 && shadows.card.shadowOpacity === 0.07,
);
check(
  'shadow `raised` = y12/r28 @10%',
  shadows.raised.shadowOffset.height === 12 &&
    shadows.raised.shadowRadius === 28 &&
    shadows.raised.shadowOpacity === 0.1,
);
check(
  'elevation is monotone flat < card < raised',
  shadows.flat.elevation < shadows.card.elevation && shadows.card.elevation < shadows.raised.elevation,
);

// Editorial type (§2.4) — serif display + serif italic reading voice.
check('serif family resolves to Georgia (Platform.select, iOS)', serifFamily === 'Georgia', serifFamily);
check('type scale: display serif 26px ink', typeScale.display.fontSize === 26 && typeScale.display.fontFamily === serifFamily);
check(
  'type scale: reading = serif italic 17px (line-height 1.45-ish)',
  typeScale.reading.fontFamily === serifFamily &&
    typeScale.reading.fontStyle === 'italic' &&
    typeScale.reading.fontSize === 17 &&
    typeScale.reading.lineHeight >= 24,
);
check('type scale: small caps labels', typeScale.smallCaps.textTransform === 'uppercase' && typeScale.smallCaps.letterSpacing >= 1);
check('hero radius 20px exists (§3.2.2)', radii.hero === 20);
check('badges.gold uses the goldTint token (no stray hex)', badges.gold.backgroundColor === colors.goldTint);

// No legacy colour references left anywhere in src/.
const srcFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) srcFiles.push(p);
  }
})(path.join(REPO, 'src'));
const legacyRefs = srcFiles.filter((f) =>
  /colors\.(cream|creamDeep|white|border|tealSoft|sageSoft|softCoral)\b/.test(fs.readFileSync(f, 'utf8')),
);
check('no screen references a legacy colour token', legacyRefs.length === 0, legacyRefs.join(', '));
const coralRefs = srcFiles.filter((f) => /#d98a7a/i.test(fs.readFileSync(f, 'utf8')));
check('the softCoral hex (#d98a7a) is gone from every file in src/', coralRefs.length === 0, coralRefs.join(', '));
// State never wears a pale accent (§1b note): text and state marks use `deep`.
const accentAsText = srcFiles.filter((f) =>
  /color:\s*(accent|themeAccents\[[^\]]+\])\.accent\b/.test(fs.readFileSync(f, 'utf8')),
);
check('no file paints TEXT with a decoration-only accent', accentAsText.length === 0, accentAsText.join(', '));
const pureRefs = srcFiles.filter((f) => /#(ffffff|000000)\b/i.test(fs.readFileSync(f, 'utf8')));
check('no pure white/black literal in src/', pureRefs.length === 0, pureRefs.join(', '));

// One hue, one job (§5 rule 1): notice = grace only; brick = the delete row only.
const brickUsers = srcFiles.filter((f) => /colors\.brick\b/.test(fs.readFileSync(f, 'utf8')));
check(
  'brick (destructive) appears in exactly one file — the Settings delete row',
  brickUsers.length === 1 && /SettingsScreen\.tsx$/.test(brickUsers[0]),
  brickUsers.join(', '),
);
const brickAsFill = srcFiles.filter((f) => /(backgroundColor|borderColor):\s*colors\.brick\b/.test(fs.readFileSync(f, 'utf8')));
check('brick is text only — never a fill or a border', brickAsFill.length === 0, brickAsFill.join(', '));
const noticeUsers = srcFiles
  .filter((f) => /colors\.notice(Deep|Tint)\b/.test(fs.readFileSync(f, 'utf8')))
  .map((f) => path.relative(REPO, f))
  .sort();
check(
  'the notice (grace) family lives only in the motif library + Home',
  noticeUsers.length === 2 &&
    noticeUsers[0] === 'src/screens/HomeScreen.tsx' &&
    noticeUsers[1] === 'src/theme/motifs.tsx',
  noticeUsers.join(', '),
);
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
check(
  'no new dependencies (no svg / gradient / font packages)',
  !Object.keys(pkg.dependencies).some((d) => /svg|linear-gradient|expo-font/.test(d)),
  Object.keys(pkg.dependencies).join(','),
);

// ---------------------------------------------------------------------------
// 2. Motifs (render level)
// ---------------------------------------------------------------------------
const motifs = loadTs(path.join(REPO, 'src/theme/motifs.tsx'));

// Streak buckets (§4.2) — honest, monotone, never shrinking.
const BUCKETS = [
  [0, 'seed'],
  [1, 'seedling'],
  [2, 'seedling'],
  [3, 'twoLeaves'],
  [6, 'twoLeaves'],
  [7, 'stemBud'],
  [29, 'stemBud'],
  [30, 'firstBranch'],
  [99, 'firstBranch'],
  [100, 'threeLeaves'],
  [365, 'threeLeaves'],
];
for (const [days, stage] of BUCKETS) {
  check(`streakStage(${days}) = ${stage}`, motifs.streakStage(days) === stage, motifs.streakStage(days));
}
// Growth stages (§4.1) — the stage boundary IS the free/paid line.
for (const [level, stage] of [
  [1, 'seed'],
  [5, 'seed'],
  [6, 'sprout'],
  [10, 'sprout'],
  [11, 'rooted'],
  [15, 'rooted'],
  [16, 'shelter'],
  [20, 'shelter'],
]) {
  check(`stageForLevel(${level}) = ${stage}`, motifs.stageForLevel(level) === stage, motifs.stageForLevel(level));
}
check('nextStageForLevel(5) = sprout (the free-tier boundary ghosts the next stage)', motifs.nextStageForLevel(5) === 'sprout');
check('nextStageForLevel(20) = null (nothing above the top)', motifs.nextStageForLevel(20) === null);
check('15 gated level marks (L6–20)', motifs.GATED_LEVEL_MARKS === 15);
check('vine leaf marks at 25/50/75%', JSON.stringify(motifs.LEAF_MARKS) === JSON.stringify([25, 50, 75]));

// Decorative marks are hidden from assistive tech + never swallow touches.
const roots = [
  ['Wash', motifs.Wash({ color: colors.rule })],
  ['Ornament', motifs.Ornament({})],
  ['Leaf', motifs.Leaf({})],
  ['CheckMark', motifs.CheckMark({})],
  ['Sprout', motifs.Sprout({})],
  ['StageGlyph', motifs.StageGlyph({ stage: 'shelter' })],
  ['LevelSeal', motifs.LevelSeal({ level: 7 })],
  ['VineMeter', motifs.VineMeter({ pct: 40 })],
  ['StreakSprig', motifs.StreakSprig({ days: 12 })],
];
for (const [name, el] of roots) {
  const list = nodes(el);
  check(
    `${name}: decorative root is accessibility-hidden + pointerEvents none`,
    list.length > 0 &&
      list[0].props.accessibilityElementsHidden === true &&
      list[0].props.pointerEvents === 'none',
    JSON.stringify({ hidden: list[0] && list[0].props.accessibilityElementsHidden, pe: list[0] && list[0].props.pointerEvents }),
  );
  check(`${name}: draws at least one host View`, list.length > 0, String(list.length));
  check(`${name}: no mark re-enables accessibility`, !list.some((n) => n.props.accessibilityElementsHidden === false));
}

// Reset day: a seed in soil with a dusk-violet halo — no red, no withered art.
const resetTree = nodes(motifs.StreakSprig({ days: 0, resetDay: true, size: 44 }));
check(
  'reset day: dusk-violet halo (noticeTint bloom + noticeDeep ring)',
  withStyle(resetTree, (s) => s.backgroundColor === colors.noticeTint).length === 1 &&
    withStyle(resetTree, (s) => String(s.borderColor).startsWith('rgba(76,66,105')).length === 1,
);
check(
  'reset day: a seed sits AT the soil line (not under it)',
  withStyle(resetTree, (s) => s.backgroundColor === colors.sageDeep && s.borderRadius >= 44).length === 1,
);
check(
  'reset day: no water drops drawn',
  withStyle(resetTree, (s) => s.backgroundColor === colors.noticeDeep).length === 0,
);

// Grace: 3 water drops, filled from the real graceRemaining — never a countdown.
for (const remaining of [3, 2, 1, 0]) {
  const tree = nodes(motifs.StreakSprig({ days: 12, inGrace: true, graceRemaining: remaining, size: 44 }));
  const filledDrops = withStyle(tree, (s) => s.backgroundColor === colors.noticeDeep).length;
  const hollowDrops = withStyle(
    tree,
    (s) => s.backgroundColor === 'transparent' && String(s.borderColor).startsWith('rgba(76,66,105'),
  ).length;
  check(
    `grace: ${remaining} filled / ${3 - remaining} hollow water drops at the base`,
    filledDrops === remaining && hollowDrops === 3 - remaining,
    `filled=${filledDrops} hollow=${hollowDrops}`,
  );
  check(
    'grace: the stem is drawn hollow in the notice hue (no red, no flame)',
    withStyle(
      tree,
      (s) =>
        s.backgroundColor === 'transparent' &&
        s.borderColor === colors.noticeDeep &&
        (s.height || 0) > (s.width || 0),
    ).length === 1,
  );
}

// Secured streak: sage plant, no notice-violet anywhere.
const secured = nodes(motifs.StreakSprig({ days: 40, size: 44 }));
check(
  'secured streak: sage plant with no notice-grace colour present',
  withStyle(secured, (s) => s.backgroundColor === colors.sageDeep).length > 0 &&
    !withStyle(secured, (s) => s.backgroundColor === colors.noticeDeep || s.backgroundColor === colors.noticeTint).length,
);

// Level seal: the held stage + the next stage ghosted at 25% behind it.
const seal7 = nodes(motifs.LevelSeal({ level: 7 }));
check('level seal: ring is a 1.5px `rule` circle', withStyle(seal7, (s) => s.borderWidth === 1.5 && s.borderColor === colors.rule).length === 1);
check('level seal L7: next stage ghosted at 25%', withStyle(seal7, (s) => s.opacity === 0.25).length === 1);
const seal20 = nodes(motifs.LevelSeal({ level: 20 }));
check('level seal L20: no ghost (nothing above the top)', withStyle(seal20, (s) => s.opacity === 0.25).length === 0);
check('level seal L20: draws the shelter canopy', withStyle(seal20, (s) => s.borderTopLeftRadius !== undefined && s.borderTopRightRadius !== undefined).length > 0);

// Vine meter: leaf marks at 25/50/75, gold-filled bud, 15 gold gate marks.
const vineFree = nodes(motifs.VineMeter({ pct: 50, showGate: true }));
check('vine: 3 leaf marks on the stem', withStyle(vineFree, (s) => s.width === 12 && s.borderTopLeftRadius === 12).length === 3);
check(
  'vine: reached marks are filled sage, unreached stay hollow',
  withStyle(vineFree, (s) => s.backgroundColor === colors.sageMark && s.width === 12).length === 2 &&
    withStyle(vineFree, (s) => s.backgroundColor === 'transparent' && s.width === 12).length === 1,
);
check('vine: the bud fills gold as XP accrues', withStyle(vineFree, (s) => s.backgroundColor === colors.goldBright).length === 1);
check(
  'vine: free tier sees exactly 15 gold-outlined hollow marks (L6–20)',
  withStyle(vineFree, (s) => s.borderColor === colors.gold).length === 15,
  String(withStyle(vineFree, (s) => s.borderColor === colors.gold).length),
);
const vinePaid = nodes(motifs.VineMeter({ pct: 50, showGate: false }));
check('vine: paid tier has no gate region', withStyle(vinePaid, (s) => s.borderColor === colors.gold).length === 0);
const vineBounds = nodes(motifs.VineMeter({ pct: 250 }));
check('vine: pct is clamped to 0–100', withStyle(vineBounds, (s) => s.width === '100%').length === 1);

// The kept check is drawn, not a glyph.
const checkTree = nodes(motifs.CheckMark({}));
check(
  'kept seal check is drawn from View borders (rotated -45°), never a ✓ glyph',
  withStyle(checkTree, (s) => s.borderLeftWidth === 2 && s.borderBottomWidth === 2).length === 1 &&
    JSON.stringify(checkTree[0].style.transform) === JSON.stringify([{ rotate: '-45deg' }]),
);

// ---------------------------------------------------------------------------
// 3. Home screen structure + frozen copy (§3.2, §4)
// ---------------------------------------------------------------------------
const homeSrc = fs.readFileSync(path.join(REPO, 'src/screens/HomeScreen.tsx'), 'utf8');
const has = (needle, label, src = homeSrc) => check(label, src.includes(needle), needle.slice(0, 46));

check('home: exactly one wash per screen (§5 rule 2)', (homeSrc.match(/<Wash\b/g) || []).length === 1);
has('opacity={0.3}', 'home: the single wash blooms at 30%');
has('style={styles.headerWash}', 'home: the wash is anchored + clipped to the top band');
has('overflow: \'hidden\'', 'home: the top band clips its wash');
has('dayAccent.wash', 'home: the wash is the day\'s theme');
has('typeScale.smallCaps', 'home: dateline in small-caps inkFaint');
has('typeScale.display', 'home: "Today\'s quest" in serif 26px');
has('radii.hero', 'home: hero card takes the 20px radius');
has('shadows.raised', 'home: hero card takes the raised elevation');
has('borderTopWidth: 3', 'home: 3px theme-accent top edge');
has('ThemeDisc theme={quest.theme}', 'home: 40px theme-tint glyph disc');
has('backgroundColor: accent.tint', 'home: theme chip filled with its own tint');
has('color: accent.deep', 'home: theme chip text in the theme `deep` (state ink)');
has('backgroundColor: colors.vellum', 'home: verse plate on vellum');
has('borderLeftWidth: 3', 'home: verse plate 3px theme left rule');
has('typeScale.reading', 'home: verse in the serif italic reading voice');
has('borderLeftColor: accent.accent', 'home: verse rule is the theme accent (paint)');
has('<Ornament', 'home: goldBright ✦ ornament above the plate');
has('borderTopColor: done ? colors.sageMark : accent.accent', 'home: sage edge replaces the theme edge when done');
has('backgroundColor: colors.sageTint', 'home: completed card flips to sageTint');
has('<CheckMark', 'home: kept seal check is drawn');
has('Done today', 'home: "Done today" copy kept verbatim');
has('color: colors.sageDeep', 'home: "Done today" reads in sageDeep');
has('<VineMeter', 'home: the flat progress bar is replaced by the vine meter');
has('showGate={tier === \'free\'}', 'home: free users see the vine continue past the gate');
has('<LevelSeal level={level} size={48}', 'home: growth strip leads with the level seal');
has('accessibilityRole="progressbar"', 'home: the meter keeps its progressbar a11y contract');
has('Included with Calm Quest+', 'home: gated themes carry the gold invitation label');
has('withAlpha(accent.tint, GATED_TINT_ALPHA)', 'home: gated rows wear their tint at ~55% (no opacity jail)');
check('home: no padlock / lock icon on gated rows', !/🔒|🔐|LockIcon/.test(homeSrc));
check('home: no italic gated label', !/themePlus[\s\S]{0,120}fontStyle: 'italic'/.test(homeSrc));
check('home: the 48%-max-width truncating streak pill is gone', !homeSrc.includes("maxWidth: '48%'"));
has('<StreakSprig', 'home: the header sprig is drawn');
has('resetDay={resetDay}', 'home: reset day is drawn as a seed, not a broken streak');
has('graceRemaining={ui.graceRemaining}', 'home: grace drops come from the real graceRemaining');
has('colors.noticeTint', 'home: the grace/reset chip uses the notice family (softCoral removed)');
has('borderColor: colors.noticeDeep', 'home: the reset chip border is dusk violet, never red');
check('home: no red-ish colour anywhere', !/#(d98a7a|e|ff0000)/i.test(homeSrc) && !/coral/i.test(homeSrc));
check('home: no "Coming soon" chip added (that is wave 3 / onboarding)', !homeSrc.includes('Coming soon'));

// Frozen copy, byte-identical (§5 rule 10 — this wave changes zero copy).
const streaks = loadTs(path.join(REPO, 'src/streaks/streak.ts'));
check(
  'STREAK_MESSAGES.secured verbatim',
  streaks.STREAK_MESSAGES.secured(12) === "Day 12 secured — whenever you're ready",
  streaks.STREAK_MESSAGES.secured(12),
);
check(
  'STREAK_MESSAGES.grace verbatim',
  streaks.STREAK_MESSAGES.grace(12, 2) ===
    'Day 12 secured. No pressure — pick up right where you left off (grace remaining: 2)',
  streaks.STREAK_MESSAGES.grace(12, 2),
);
check(
  'STREAK_MESSAGES.freshStart verbatim',
  streaks.STREAK_MESSAGES.freshStart() ===
    'Every beginning is a fresh start. Day 1 starts when you say today.',
);
check(
  'home: the message is rendered from STREAK_MESSAGES (ui.message), not re-worded',
  homeSrc.includes('{ui.message}'),
);
for (const frozen of [
  "Today's quest",
  "Begin today's quest",
  'See you tomorrow — wherever you are, the loop waits right here.',
  'Five themes, one at a time',
  'Each day brings one theme. Calm Quest+ opens all five, any day.',
  'Your library, by theme — each one holds its own quests.',
  'See what Calm Quest+ includes',
  'Grace is holding your streak — take your time, no pressure.',
  "Today still counts — a quiet minute whenever you're ready. And if you",
  'Take a Gratitude Glimpse',
]) {
  has(frozen, `home: frozen copy intact — "${frozen.slice(0, 40)}"`);
}
// The gate hint keeps its exact honest wording (XP really does keep accruing).
check(
  'home: the free-gate hint is verbatim (no reworded promise)',
  homeSrc.includes('${totalXp} XP and growing — levels 6–20 are part of Calm Quest+, your XP is safe.'),
);
// Theme one-liners were NOT approved — the card must not invent them.
check(
  'home: no theme one-liner descriptions added (unapproved copy)',
  !/themeAccents\[t\]\.(description|blurb|copy)/.test(homeSrc),
);

console.log('');
if (failures > 0) {
  console.log(`WAVE 1 VISUAL PROOFS FAILED (${failures})`);
  process.exit(1);
}
console.log('ALL WAVE 1 VISUAL PROOFS PASSED');
