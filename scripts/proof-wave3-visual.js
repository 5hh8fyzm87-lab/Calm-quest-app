#!/usr/bin/env node
/**
 * Wave 3 (Visual-Richness) proof — Onboarding (§3.1), Paywall (§3.5),
 * Settings (§3.6) and the accessibility sweep.
 *
 * Three layers, all read-only (no behaviour is exercised or changed here):
 *  1. MOTIFS (render level): the Wave-3 additions in `src/theme/motifs.tsx` are
 *     really invoked and their element trees traversed — the five-theme swatch
 *     row (real names, real tints, filled for held themes, tint-at-55% + gold
 *     hairline for the rest), the miniature swatch strip, the "Coming soon"
 *     chip (full-opacity ink, never an opacity jail), the section head with its
 *     24px gold hairline, the drawn bell / note / chevron glyphs and the
 *     hollow sprout. Every decorative root must stay invisible to assistive
 *     tech and transparent to touches; every real string must stay visible.
 *  2. SCREENS (source + StyleSheet structure): every Wave-3 treatment is present
 *     where it belongs and the approved copy is byte-identical (typographic
 *     escapes decoded). Screens own hooks, so they are asserted structurally —
 *     the same convention as the Wave-1/Wave-2 proofs.
 *  3. INTEGRITY: no new dependency, no stray hex, no red, one wash per screen,
 *     the safe-area contract, the Reduce-Motion contract (Wave 3 adds no
 *     motion at all) and Dynamic-Type-XXXL survival (no clamped text, no fixed
 *     heights on the containers Wave 3 introduced).
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
    TextInput: 'TextInput',
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

/** Components that own hooks are recorded as leaves rather than invoked. */
const SKIP_INVOKE = new Set(['LightBloom']);

function nodes(element, out = []) {
  if (element === null || element === undefined || typeof element === 'boolean') return out;
  if (Array.isArray(element)) {
    element.forEach((e) => nodes(e, out));
    return out;
  }
  if (typeof element !== 'object' || !element.$$typeof) return out;
  if (typeof element.type === 'function') {
    if (SKIP_INVOKE.has(element.type.name)) {
      out.push({
        type: element.type.name,
        props: element.props || {},
        style: flat(element.props && element.props.style),
        skipped: true,
      });
      return out;
    }
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
const texts = (list) => list.filter((n) => n.type === 'Text').map((n) => n.props.children);
const hidden = (node) =>
  !!node &&
  node.props.accessibilityElementsHidden === true &&
  node.props.pointerEvents === 'none' &&
  node.props.importantForAccessibility === 'no-hide-descendants';

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------
const readSrc = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
/**
 * Source text → comparable copy: decode the `\uXXXX` escapes the app's sources
 * use, drop JSX `{'\n'}` text separators, then collapse all whitespace. So a
 * string split across JSX lines compares byte-for-byte with the approved copy.
 */
const norm = (s) =>
  String(s)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\{'(\\n|\\t| |\\u00a0)'\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/**
 * Source with comments removed. Negative checks ("no opacity jail", "no fixed
 * height", "no Animated") must look at CODE — the wave-3 comments deliberately
 * name the thing that was removed.
 */
const code = (s) =>
  String(s)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
/** Emoji-in-chrome check: the two typographic marks (✦ and ⚙) are allowed. */
const hasEmoji = (src) =>
  /[\u{1F000}-\u{1FAFF}]/u.test(src) ||
  /[\u2600-\u27BF]/.test(src.replace(/[✦⚙\uFE0E\uFE0F]/g, ''));
/** Extract one `name: { ... }` block from a StyleSheet.create source. */
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
/** One exported motif function body (comment-stripped). */
const motifBody = (name) => {
  // `\n}\n` (a closing brace on its own line) ends the function — `\n}) {` is
  // the props type annotation, not the body.
  const m = new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}\\n`).exec(MOTIF_SRC);
  return m ? code(m[0]) : null;
};

const ONB = readSrc('src/screens/OnboardingScreen.tsx');
const PAY = readSrc('src/screens/PaywallScreen.tsx');
const SET = readSrc('src/screens/SettingsScreen.tsx');
const MOTIF_SRC = readSrc('src/theme/motifs.tsx');

// ---------------------------------------------------------------------------
// Palette + contrast
// ---------------------------------------------------------------------------
const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const colorTokens = loadTs(path.join(REPO, 'src/theme/colors.ts'));
const motifs = loadTs(path.join(REPO, 'src/theme/motifs.tsx'));
const gates = loadTs(path.join(REPO, 'src/subscription/gates.ts'));
const contentThemes = loadTs(path.join(REPO, 'src/content/themes.ts'));
const { colors, themeAccents, withAlpha, typeScale, badges, shadows } = theme;
const { GATED_TINT_ALPHA } = colorTokens;
const { THEME_LABELS } = contentThemes;

const PALETTE = new Set([
  ...Object.values(colors).filter((v) => /^#/.test(v)),
  ...Object.values(themeAccents).flatMap((t) => [t.tint, t.accent, t.deep]),
]);
function paletteColour(value) {
  const v = String(value);
  if (v === 'transparent' || v === 'none') return true;
  if (/^#/.test(v)) return PALETTE.has(v.toUpperCase()) || PALETTE.has(v);
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (!m) return false;
  const hex = `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return [...PALETTE].some((p) => String(p).toLowerCase() === hex);
}
const colourKeys = [
  'backgroundColor',
  'borderColor',
  'borderLeftColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'color',
  'shadowColor',
];
function assertPaletteOnly(label, tree) {
  const bad = [];
  for (const n of tree) {
    for (const k of colourKeys) {
      if (n.style[k] !== undefined && !paletteColour(n.style[k])) bad.push(`${k}:${n.style[k]}`);
    }
  }
  check(`${label}: every colour comes from the palette (no stray hex)`, bad.length === 0, bad.join(', '));
}
function assertNoRed(label, tree) {
  const reds = [];
  for (const n of tree) {
    for (const k of colourKeys) {
      const v = n.style[k];
      if (v === undefined) continue;
      if (String(v) === colors.brick) reds.push(`${k}:brick`);
      // Only a colour OUTSIDE the owner-approved palette can be a stray red:
      // warm browns like goldDeep are tokens, not warnings.
      if (paletteColour(v)) continue;
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(v));
      if (m) {
        const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
        if (r > 120 && r > g * 1.6 && r > b * 1.6) reds.push(`${k}:${v}`);
      }
    }
  }
  check(`${label}: no red / no brick anywhere`, reds.length === 0, reds.join(', '));
}
function luminance(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const r2 = (n) => Math.round(n * 100) / 100;

/** The screen-side derivation the paywall and Settings both use. */
const swatchItemsFor = (tier, day) =>
  gates.THEME_ORDER.map((t) => ({
    theme: t,
    name: THEME_LABELS[t],
    available: gates.visibleThemes({ entitlements: { tier } }, day).includes(t),
  }));

console.log('--- §3.1 · §3.5 · §3.6  Wave 3 visual richness ---');

// ---------------------------------------------------------------------------
// 1. Motifs, rendered
// ---------------------------------------------------------------------------
const DAY = '2026-09-17';

// --- ThemeSwatchRow (§3.5.1 — the paywall hero) ----------------------------
const freeItems = swatchItemsFor('free', DAY);
const paidItems = swatchItemsFor('paid', DAY);
check(
  'paywall hero: exactly one theme is held on the free tier (real gate derivation)',
  freeItems.filter((i) => i.available).length === 1,
  freeItems.filter((i) => i.available).map((i) => i.name).join(','),
);
check(
  'paywall hero: the paid tier holds all five themes',
  paidItems.filter((i) => i.available).length === 5,
);

const freeRow = nodes(motifs.ThemeSwatchRow({ items: freeItems }));
const paidRow = nodes(motifs.ThemeSwatchRow({ items: paidItems }));
const discOf = (tree, tint) => withStyle(tree, (s) => s.width === 34 && s.height === 34 && s.backgroundColor === tint);
check(
  'swatch row: one 34px disc per theme, in canonical THEME_ORDER',
  withStyle(freeRow, (s) => s.width === 34 && s.height === 34).length === 5,
  String(withStyle(freeRow, (s) => s.width === 34 && s.height === 34).length),
);
check(
  'swatch row: the held theme\u2019s disc is filled with its OWN real tint (no guess)',
  freeRow.filter((n) =>
    freeItems.some((i) => i.available && n.style.backgroundColor === themeAccents[i.theme].tint),
  ).length === 1,
);
check(
  'swatch row: the four unheld discs wear their own tint at GATED_TINT_ALPHA + a goldBright hairline',
  freeItems.filter((i) => !i.available).every(
    (i) =>
      discOf(freeRow, withAlpha(themeAccents[i.theme].tint, GATED_TINT_ALPHA)).length === 1 &&
      withStyle(
        freeRow,
        (s) => s.backgroundColor === withAlpha(themeAccents[i.theme].tint, GATED_TINT_ALPHA) && s.borderColor === colors.goldBright && s.borderWidth === 1,
      ).length === 1,
  ),
  String(withStyle(freeRow, (s) => s.borderColor === colors.goldBright && s.borderWidth === 1).length),
);
check(
  'swatch row: no gold hairline once every theme is held (paid)',
  withStyle(paidRow, (s) => s.borderColor === colors.goldBright && s.borderWidth === 1).length === 0,
);
check(
  'swatch row: held themes draw a FILLED leaf in their theme `deep`; unheld draw the outline-only leaf',
  freeItems.filter((i) => i.available).every(
      (i) => withStyle(freeRow, (s) => s.backgroundColor === themeAccents[i.theme].deep && s.borderWidth === 0).length >= 1,
    ) &&
    freeItems.filter((i) => !i.available).every(
      (i) => withStyle(freeRow, (s) => s.backgroundColor === 'transparent' && s.borderWidth === 1 && s.borderColor === themeAccents[i.theme].deep).length >= 1,
    ),
);
check(
  'swatch row: theme names are the REAL names from content (all five, verbatim)',
  texts(freeRow).join('|') === gates.THEME_ORDER.map((t) => THEME_LABELS[t]).join('|'),
  texts(freeRow).join('|'),
);
check(
  'swatch row: held names wear the theme `deep`; unheld names wear full-opacity inkSoft',
  freeItems.filter((i) => i.available).every(
    (i) => withStyle(freeRow, (s) => s.color === themeAccents[i.theme].deep).length === 1,
  ) &&
    withStyle(freeRow, (s) => s.color === colors.inkSoft).length === 4,
);
check(
  'swatch row: NO opacity jail anywhere in the row (names are ink, unheld state is fill + hairline)',
  freeRow.every((n) => n.style.opacity === undefined),
);
check(
  'swatch row: every held/unheld name tells VoiceOver what it is (available / included with Calm Quest+)',
  withStyle(freeRow, (s, p) => String(p.accessibilityLabel).endsWith(', available')).length === 1 &&
    withStyle(freeRow, (s, p) => String(p.accessibilityLabel).endsWith(', included with Calm Quest+')).length === 4,
);
check(
  'swatch row: the drawn disc is accessibility-hidden + touch-transparent',
  hidden(withStyle(freeRow, (s) => s.width === 34 && s.height === 34)[0]),
  `${withStyle(freeRow, (s) => s.width === 34)[0].props.accessibilityElementsHidden}/${withStyle(freeRow, (s) => s.width === 34)[0].props.pointerEvents}`,
);
assertPaletteOnly('swatch row', freeRow);
assertNoRed('swatch row', freeRow);

// --- ThemeSwatchStrip (§3.6.3 — the Settings echo) -------------------------
const strip = nodes(motifs.ThemeSwatchStrip({ items: freeItems }));
check(
  'settings strip: five miniature marks, in the same canonical order',
  withStyle(strip, (s) => s.width === 12).length === 5,
  String(withStyle(strip, (s) => s.width === 12).length),
);
check(
  'settings strip: same honest grammar as the hero (real tint / gated tint + gold hairline)',
  strip.filter((n) =>
    freeItems.some((i) => i.available && n.style.backgroundColor === themeAccents[i.theme].tint),
  ).length === 1 &&
    withStyle(strip, (s) => s.borderColor === colors.goldBright && s.borderWidth === 1).length === 4,
);
check('settings strip: purely decorative (a11y-hidden + touch-transparent)', hidden(strip[0]));
assertPaletteOnly('settings strip', strip);
assertNoRed('settings strip', strip);

// --- ComingSoonChip (§3.1.2 — the one approved copy addition) --------------
const chipTree = nodes(motifs.ComingSoonChip({ label: 'Coming soon' }));
check(
  'coming-soon chip: renders a real "Coming soon" string',
  texts(chipTree).includes('Coming soon'),
  JSON.stringify(texts(chipTree)),
);
check(
  'coming-soon chip: FULL-opacity text (no opacity key on the Text or the chip)',
  chipTree.every((n) => n.style.opacity === undefined),
);
const chipText = withStyle(chipTree, (s) => s.fontWeight !== undefined)[0];
const chipBg = chipTree[0].style.backgroundColor;
check(
  'coming-soon chip: the label keeps \u22654.5:1 on the chip surface',
  ratio(chipText.style.color, chipBg) >= 4.5,
  `${r2(ratio(chipText.style.color, chipBg))}:1 ${chipText.style.color} on ${chipBg}`,
);
check(
  'coming-soon chip: the chip sits on `card` with a hairline, so it stays readable on a sand row',
  chipBg === colors.card && chipTree[0].style.borderWidth === 1 && chipTree[0].style.borderColor === colors.paperEdge,
);
check(
  'coming-soon chip: the string stays VISIBLE to VoiceOver (real text, not a hidden mark)',
  chipTree[0].props.accessibilityElementsHidden !== true,
);
const disabledLabelOnSand = ratio(colors.inkSoft, colors.sand);
check(
  'onboarding disabled row: full-ink label clears 4.5:1 on the sand fill (the old 0.62 jail did not)',
  disabledLabelOnSand >= 4.5,
  `${r2(disabledLabelOnSand)}:1`,
);
check(
  'onboarding disabled row: the sand fill + full inkSoft is the whole treatment (no opacity multiplier)',
  norm(styleBlock(ONB, 'pathRowSoon')).includes('backgroundColor: colors.sand') &&
    !/opacity:/.test(norm(styleBlock(ONB, 'pathRowSoon'))),
  norm(styleBlock(ONB, 'pathRowSoon')),
);
check(
  'onboarding disabled row: textDisabled is plain inkSoft with no opacity key',
  norm(styleBlock(ONB, 'textDisabled')).includes('color: colors.inkSoft') &&
    !/opacity:/.test(norm(styleBlock(ONB, 'textDisabled'))),
  norm(styleBlock(ONB, 'textDisabled')),
);
assertPaletteOnly('coming-soon chip', chipTree);
assertNoRed('coming-soon chip', chipTree);

// --- SectionHead + GoldRule (§3.6.1) ---------------------------------------
const head = nodes(motifs.SectionHead({ label: 'CALM QUEST+' }));
check(
  'section head: the label renders verbatim as a heading (VoiceOver rotor can jump sections)',
  texts(head).includes('CALM QUEST+') &&
    withStyle(head, (s, p) => p.accessibilityRole === 'header').length === 1,
);
check(
  'section head: SmallCaps type token + a 24px goldBright hairline under it',
  withStyle(head, (s) => s.textTransform === 'uppercase').length === 1 &&
    motifs.GOLD_RULE_WIDTH === 24 &&
    withStyle(head, (s) => s.width === 24 && s.height === 2 && s.backgroundColor === colors.goldBright).length === 1,
);
check('section head: the gold hairline is a hidden mark (the label carries the meaning)', hidden(withStyle(head, (s) => s.width === 24)[0]));
check('section head itself is NOT hidden from assistive tech', head[0].props.accessibilityElementsHidden !== true);
check(
  'GoldRule honours a custom width but defaults to the 24px rule',
  nodes(motifs.GoldRule({ width: 40 }))[0].style.width === 40 &&
    nodes(motifs.GoldRule({}))[0].style.width === 24,
);
assertPaletteOnly('section head', head);
assertNoRed('section head', head);

// --- BellMark / NoteMark / ChevronMark (§3.6.2, §3.6.4) --------------------
const bell = nodes(motifs.BellMark({}));
const note = nodes(motifs.NoteMark({}));
const chevron = nodes(motifs.ChevronMark({}));
check(
  'reminder glyph: a tealTint disc holding a drawn bell in tealDeep (4 drawn parts, no glyph, no emoji)',
  bell[0].style.backgroundColor === colors.tealTint &&
    bell[0].style.borderRadius === 14 &&
    withStyle(bell, (s) => s.backgroundColor === colors.tealDeep).length === 4 &&
    bell.every((n) => n.type !== 'Text'),
  String(withStyle(bell, (s) => s.backgroundColor === colors.tealDeep).length),
);
check(
  'sound glyph: the same disc treatment, drawn from Views only (no emoji anywhere)',
  note[0].style.backgroundColor === colors.tealTint &&
    withStyle(note, (s) => s.backgroundColor === colors.tealDeep).length === 4 &&
    note.every((n) => n.type !== 'Text'),
  String(withStyle(note, (s) => s.backgroundColor === colors.tealDeep).length),
);
check('bell + note: decorative roots are a11y-hidden + touch-transparent', hidden(bell[0]) && hidden(note[0]));
check(
  'legal chevron: a drawn 45\u00b0 corner in neutral inkFaint (no colour, no \u203a glyph)',
  chevron.length === 1 &&
    chevron[0].style.borderColor === colors.inkFaint &&
    chevron[0].style.borderTopWidth === 2 &&
    JSON.stringify(chevron[0].style.transform).includes('45deg'),
  JSON.stringify(chevron[0].style.transform),
);
check('legal chevron: decorative root is a11y-hidden + touch-transparent', hidden(chevron[0]));
assertPaletteOnly('bell glyph', bell);
assertPaletteOnly('note glyph', note);
assertPaletteOnly('chevron', chevron);
assertNoRed('bell glyph', bell);
assertNoRed('note glyph', note);
assertNoRed('chevron', chevron);

// --- Sprout, hollow (§3.1.2 — the coming-soon path glyph) ------------------
const filledSprout = nodes(motifs.Sprout({ size: 18, color: colors.tealDeep }));
const hollowSprout = nodes(motifs.Sprout({ size: 18, color: colors.inkSoft, hollow: true }));
check(
  'sprout: the live path draws a solid stem + two solid leaves',
  withStyle(filledSprout, (s) => s.backgroundColor === colors.tealDeep).length === 3,
  String(withStyle(filledSprout, (s) => s.backgroundColor === colors.tealDeep).length),
);
check(
  'sprout: `hollow` draws outline-only art (same two leaves, transparent fills)',
  withStyle(hollowSprout, (s) => s.backgroundColor === 'transparent' && s.borderWidth === 1).length === 3 &&
    withStyle(hollowSprout, (s) => s.backgroundColor === colors.inkSoft).length === 0,
  String(withStyle(hollowSprout, (s) => s.backgroundColor === 'transparent').length),
);
check('sprout: both variants stay decorative (a11y-hidden + touch-transparent)', hidden(filledSprout[0]) && hidden(hollowSprout[0]));
assertPaletteOnly('hollow sprout', hollowSprout);
assertNoRed('hollow sprout', hollowSprout);

// ---------------------------------------------------------------------------
// 2. §3.1 Onboarding
// ---------------------------------------------------------------------------
check(
  '§3.1 onboarding: the approved chip label is exactly "Coming soon"',
  /const COMING_SOON_LABEL = 'Coming soon';/.test(ONB),
);
check(
  '§3.1 onboarding: the chip is rendered on every disabled path row, and only there',
  /disabled \? <ComingSoonChip label=\{COMING_SOON_LABEL\} \/> : null/.test(ONB) &&
    (ONB.match(/ComingSoonChip/g) || []).length === 2 &&
    (ONB.match(/\n        disabled\n/g) || []).length === 2,
  `chip uses: ${(ONB.match(/ComingSoonChip/g) || []).length}`,
);
check(
  '§3.1 onboarding: exactly one live row (with the gold chip) and two coming-soon rows',
  (ONB.match(/^\s+live$/gm) || []).length === 1 &&
    ONB.includes("badge=\"You're in the right place\"") &&
    (ONB.match(/\n        disabled\n/g) || []).length === 2,
);
check(
  '§3.1 onboarding: the old opacity jail is gone (no pathRowDisabled, no 0.62 opacity in code)',
  !/pathRowDisabled/.test(code(ONB)) && !/opacity:\s*0\.6/.test(code(ONB)),
);
check(
  '§3.1 onboarding: live row = card surface + 3px teal left edge; coming-soon = sand',
  norm(styleBlock(ONB, 'pathRowLive')).includes('backgroundColor: colors.card') &&
    norm(styleBlock(ONB, 'pathRowLive')).includes('borderLeftWidth: 3') &&
    norm(styleBlock(ONB, 'pathRowLive')).includes('borderLeftColor: colors.teal') &&
    norm(styleBlock(ONB, 'pathRowSoon')).includes('backgroundColor: colors.sand'),
  norm(styleBlock(ONB, 'pathRowLive')),
);
check(
  '§3.1 onboarding: the glyph disc is tealTint (live) / card with the hollow sprout (coming soon)',
  norm(styleBlock(ONB, 'pathGlyphLive')).includes('backgroundColor: colors.tealTint') &&
    norm(styleBlock(ONB, 'pathGlyphSoon')).includes('backgroundColor: colors.card') &&
    /<Sprout size=\{18\} color=\{live \? colors\.tealDeep : colors\.inkSoft\} hollow=\{!live\} \/>/.test(ONB),
);
check(
  '§3.1 onboarding: dawn hero = one purpose wash + horizon hairline + a gold sprout above the serif headline',
  /<Wash color=\{themeAccents\.purpose\.wash\}/.test(ONB) &&
    (ONB.match(/<Wash/g) || []).length === 1 &&
    norm(styleBlock(ONB, 'heroHorizon')).includes('backgroundColor: colors.rule') &&
    /<Sprout size=\{26\} color=\{colors\.goldDeep\}/.test(ONB) &&
    /typeScale\.displayLg, styles\.heroTitle/.test(ONB) &&
    norm(styleBlock(ONB, 'heroTitle')).includes('marginTop'),
  `washes: ${(ONB.match(/<Wash/g) || []).length}`,
);
check(
  '§3.1 onboarding: the hero band has NO fixed height (it grows with Dynamic Type)',
  !/(^|[\s,])height:/.test(norm(styleBlock(ONB, 'heroBand'))),
  norm(styleBlock(ONB, 'heroBand')),
);
check(
  '§3.1 onboarding: fine print is a vellum note with a hairline `rule` left edge',
  norm(styleBlock(ONB, 'finePrint')).includes('backgroundColor: colors.vellum') &&
    norm(styleBlock(ONB, 'finePrint')).includes('borderLeftColor: colors.rule'),
);
check(
  '§3.1 onboarding: copy frozen — hero, headline, fine print, CTA and hint verbatim',
  norm(ONB).includes(
    norm(
      "'Faith-first mindset training, made playful. One gentle quest a day \u2014 miss a day and you pick up right where you left off.'",
    ),
  ) &&
    norm(ONB).includes('A calmer day, one small quest at a time.') &&
    norm(ONB).includes('No account needed. Everything is saved on your device until you choose') &&
    norm(ONB).includes("'Getting ready\u2026' : 'Begin'") &&
    norm(ONB).includes('About a minute \u2014 no signup, no rush.'),
);
check(
  '§3.1 onboarding: a11y — every path row is a radio with selected/disabled state; the CTA is a button',
  /accessibilityRole="radio"/.test(ONB) &&
    /accessibilityState=\{\{ selected: !!selected, disabled: !!disabled \}\}/.test(ONB) &&
    /accessibilityRole="button"/.test(ONB) &&
    /accessibilityState=\{\{ disabled: busy \}\}/.test(ONB),
);

// ---------------------------------------------------------------------------
// 3. §3.5 Paywall
// ---------------------------------------------------------------------------
check(
  '§3.5 paywall: the swatch hero derives availability from the real gate + real names (no invented data)',
  /visibleThemes\(state \?\? \{ entitlements: \{ tier: 'free' \} \}, day\)/.test(PAY) &&
    /THEME_ORDER\.map\(\(t\) => \(\{/.test(PAY) &&
    /name: THEME_LABELS\[t\]/.test(PAY) &&
    /<ThemeSwatchRow items=\{swatchItems\} \/>/.test(PAY),
);
check(
  '§3.5 paywall: the swatch card is the hero — `raised` elevation, above the value card',
  norm(styleBlock(PAY, 'swatchCard')).includes('...shadows.raised'),
  norm(styleBlock(PAY, 'swatchCard')),
);
check(
  '§3.5 paywall: value card = goldBright ✦ marks + exactly two hairline dividers between three bullets',
  norm(styleBlock(PAY, 'bulletDot')).includes('color: colors.goldBright') &&
    norm(styleBlock(PAY, 'bulletRule')).includes('backgroundColor: colors.rule') &&
    /VALUE_BULLETS\.map\(\(b, i\) =>/.test(PAY) &&
    /\{i > 0 \? <View style=\{styles\.bulletRule\} \/> : null\}/.test(PAY),
);
check(
  '§3.5 paywall: the three value bullets are byte-identical to the approved copy',
  norm(PAY).includes(
    norm(
      "'All five themes, on demand \u2014 not just today\u2019s quest', 'The full quest library, with repeats when a theme helps twice', 'Unlimited Gratitude Glimpses, plus your whole archive'",
    ),
  ),
);
check(
  '§3.5 paywall: the free-forever note is an "already yours" sand strip, copy verbatim',
  norm(styleBlock(PAY, 'freeStrip')).includes('backgroundColor: colors.sand') &&
    norm(PAY).includes(
      norm(
        'Free, and staying free: the daily quest, Affirmation of the Day, one Glimpse a day, grace streaks, and levels 1\u20135.',
      ),
    ) &&
    /styles\.freeStripText/.test(PAY) &&
    !/freeNote/.test(PAY),
);
check(
  '§3.5 paywall: selected plan = card surface + 2px teal border + flat elevation',
  norm(styleBlock(PAY, 'planCardSelected')).includes('borderColor: colors.teal') &&
    norm(styleBlock(PAY, 'planCardSelected')).includes('backgroundColor: colors.card') &&
    norm(styleBlock(PAY, 'planCardSelected')).includes('...shadows.flat'),
  norm(styleBlock(PAY, 'planCardSelected')),
);
check(
  '§3.5 paywall: unselected plan = paper surface + 2px sand border',
  norm(styleBlock(PAY, 'planCard')).includes('borderWidth: 2') &&
    norm(styleBlock(PAY, 'planCard')).includes('borderColor: colors.sand') &&
    norm(styleBlock(PAY, 'planCard')).includes('backgroundColor: colors.paper'),
  norm(styleBlock(PAY, 'planCard')),
);
check(
  '§3.5 paywall: both plan states keep the same 2px border (selecting never shifts layout)',
  !/borderWidth/.test(norm(styleBlock(PAY, 'planCardSelected'))),
);
check(
  '§3.5 paywall: the plan badge moved to gold (descriptive, never urgency)',
  /\[badges\.chip, badges\.gold, styles\.planBadge\]/.test(PAY) &&
    /\[badges\.chipText, badges\.goldText\]/.test(PAY),
);
check(
  '§3.5 paywall: honest-state boxes keep paperDeep + a neutral inkFaint dot (never red, nothing was charged)',
  norm(styleBlock(PAY, 'honestBox')).includes('backgroundColor: colors.paperDeep') &&
    norm(styleBlock(PAY, 'honestDot')).includes('backgroundColor: colors.inkFaint') &&
    !/colors\.brick/.test(PAY),
  norm(styleBlock(PAY, 'honestDot')),
);
check(
  '§3.5 paywall: title uses the serif display token (no ad-hoc 800-weight size)',
  /typeScale\.display, styles\.title/.test(PAY) &&
    !/fontSize|fontWeight|color/.test(norm(styleBlock(PAY, 'title'))),
  norm(styleBlock(PAY, 'title')),
);
check(
  '§3.5 paywall: copy frozen — title, subtitle, plan labels and CTA verbatim',
  norm(PAY).includes('More ways to grow, whenever you want them') &&
    norm(PAY).includes(
      "The daily loop you're using stays free, forever. Calm Quest+ adds more of it, on your schedule.",
    ) &&
    norm(PAY).includes("'Monthly' : 'Yearly'"),
);
check(
  '§3.5 paywall: a11y — plan cards are radios with selected state; both CTAs are buttons, the trial CTA reports its state',
  /accessibilityRole="radio"/.test(PAY) &&
    /accessibilityState=\{\{ selected: isSelected \}\}/.test(PAY) &&
    (PAY.match(/accessibilityRole="button"/g) || []).length === 2 &&
    /accessibilityState=\{\{ disabled: asking \|\| granted \}\}/.test(PAY),
  String((PAY.match(/accessibilityRole="button"/g) || []).length),
);
check(
  '§3.5 paywall: no urgency or scarcity language anywhere on the money screen',
  !/hurry|limited time|last chance|expires|only \d+ (spots|left)|act now|don't miss/i.test(PAY),
);

// ---------------------------------------------------------------------------
// 4. §3.6 Settings
// ---------------------------------------------------------------------------
check(
  '§3.6 settings: section labels are SectionHeads (small-caps over a gold hairline), not plain card labels',
  (SET.match(/<SectionHead label=\{COPY\./g) || []).length === 5 && !/cards\.label/.test(SET),
  String((SET.match(/<SectionHead label=\{COPY\./g) || []).length),
);
check(
  '§3.6 settings: all five section heads carry the shared spacing style',
  (SET.match(/<SectionHead label=\{COPY\.\w+\} style=\{styles\.sectionHead\} \/>/g) || []).length === 5,
);
check(
  '§3.6 settings: cards take the `flat` shadow (elevation is information, not decoration)',
  (SET.match(/\.\.\.shadows\.flat/g) || []).length >= 3 &&
    !/shadows\.(raised|card)/.test(SET) &&
    ['reminderCard', 'pickerCard', 'plusCard'].every((n) => {
      const b = styleBlock(SET, n);
      return b === null || b.includes('...shadows.flat');
    }),
  String((SET.match(/\.\.\.shadows\.flat/g) || []).length),
);
check(
  '§3.6 settings: a drawn bell on the reminder card and a drawn note on the sound card',
  /<BellMark size=\{28\} \/>/.test(SET) && /<NoteMark size=\{28\} \/>/.test(SET),
);
check(
  '§3.6 settings: the Calm Quest+ card carries a 3px goldBright top edge',
  norm(styleBlock(SET, 'plusCard')).includes('borderTopWidth: 3') &&
    norm(styleBlock(SET, 'plusCard')).includes('borderTopColor: colors.goldBright'),
  norm(styleBlock(SET, 'plusCard')),
);
check(
  '§3.6 settings: the tier chip is filled — PLUS in the gold family, FREE on sand',
  /\[badges\.chip, tier === 'paid' \? badges\.gold : badges\.sand\]/.test(SET) &&
    /tier === 'paid' \? badges\.goldText : badges\.sandText/.test(SET) &&
    /tier === 'paid' \? 'PLUS' : 'FREE'/.test(SET),
);
check(
  '§3.6 settings: the mini swatch strip echoes the paywall from the same real derivation',
  /<ThemeSwatchStrip items=\{swatchItems\} style=\{styles\.plusSwatches\} \/>/.test(SET) &&
    /visibleThemes\(\{ entitlements: \{ tier \} \}, localDateString\(\)\)/.test(SET) &&
    /name: THEME_LABELS\[theme\]/.test(SET),
);
check(
  '§3.6 settings: the delete row stays the ONLY place brick appears, as text only',
  /colors\.brick/.test(SET) &&
    !/(backgroundColor|borderColor): colors\.brick/.test(SET) &&
    norm(styleBlock(SET, 'deleteBtnText')).includes('color: colors.brick'),
  norm(styleBlock(SET, 'deleteBtnText')),
);
check(
  '§3.6 settings: legal rows use the drawn chevron and the old \u203a text style is gone',
  (SET.match(/<ChevronMark \/>/g) || []).length === 2 && !/legalChevron/.test(SET),
);
check(
  '§3.6 settings: the title uses the serif display token and wraps at XXXL instead of overflowing',
  /typeScale\.display, styles\.title/.test(SET) &&
    norm(styleBlock(SET, 'title')).includes('flex: 1') &&
    norm(styleBlock(SET, 'title')).includes("textAlign: 'center'"),
  norm(styleBlock(SET, 'title')),
);
check(
  '§3.6 settings: copy frozen — title, section labels, tier labels and delete strings verbatim',
  norm(SET).includes("title: 'Settings'") &&
    norm(SET).includes("section: 'DAILY GENTLE REMINDER'") &&
    norm(SET).includes("soundSection: 'SOUND'") &&
    norm(SET).includes("plusSection: 'CALM QUEST+'") &&
    norm(SET).includes("accountSection: 'ACCOUNT & DATA'") &&
    norm(SET).includes("legalSection: 'LEGAL'") &&
    norm(SET).includes('tierFree: ') &&
    norm(SET).includes("deleteDataRow: 'Delete my data'") &&
    norm(SET).includes("privacyRow: 'Privacy'") &&
    norm(SET).includes("termsRow: 'Terms of Use'"),
);
check(
  '§3.6 settings: a11y — toggles are switches with labels/hints, rows are buttons, delete reports its state',
  (SET.match(/accessibilityRole="switch"/g) || []).length === 2 &&
    /accessibilityLabel="Daily gentle reminder"/.test(SET) &&
    /accessibilityHint="One nudge a day at your chosen time/.test(SET) &&
    /accessibilityLabel="Sound on or off"/.test(SET) &&
    /accessibilityState=\{\{ disabled: deleting \}\}/.test(SET),
);

// ---------------------------------------------------------------------------
// 5. Accessibility + Dynamic Type + Reduce Motion sweep (all three screens)
// ---------------------------------------------------------------------------
const SCREENS = [
  ['Onboarding', ONB],
  ['Paywall', PAY],
  ['Settings', SET],
];
for (const [label, src] of SCREENS) {
  check(
    `${label}: text is never font-clamped at XXXL (no numberOfLines / allowFontScaling=false)`,
    !/numberOfLines|allowFontScaling=\{false\}|maxFontSizeMultiplier/.test(src),
  );
  check(
    `${label}: the safe-area contract holds — screenInsets still on the scroll container`,
    src.includes('screenInsets'),
  );
  check(
    `${label}: no motion added by Wave 3 (no Animated, no accessibilityLiveRegion loops)`,
    !/Animated/.test(code(src)),
  );
  check(
    `${label}: no raw hex outside the palette (every colour is a token)`,
    !/#[0-9a-fA-F]{6}\b/.test(code(src)),
  );
  check(
    `${label}: brick appears only where it belongs (the Settings delete row)`,
    label === 'Settings' ? /colors\.brick/.test(src) : !/colors\.brick/.test(src),
  );
  check(
    `${label}: no emoji as UI chrome (only the two approved typographic marks survive)`,
    !hasEmoji(code(src)),
  );
}
check(
  'reduce motion: the app\u2019s ONE motion device still consults isReduceMotionEnabled',
  /isReduceMotionEnabled/.test(MOTIF_SRC) &&
    /AccessibilityInfo\.isReduceMotionEnabled\(\)/.test(MOTIF_SRC),
);
check(
  'reduce motion: Wave-3 art is static \u2014 the wave-3 block of motifs.tsx uses no Animated',
  !/Animated/.test(MOTIF_SRC.slice(MOTIF_SRC.indexOf('Wave 3 \u2014 Onboarding'))),
);
// Draw 5 of the accessibility sweep: the art added by Wave 3 must be built on
// `Mark` (a11y-hidden + touch-transparent) and must never render text itself.
for (const name of ['BellMark', 'NoteMark', 'ChevronMark', 'ThemeSwatchRow', 'ThemeSwatchStrip']) {
  const body = motifBody(name);
  check(
    `decorative sweep: ${name} is built from Mark (a11y-hidden + touch-transparent)`,
    !!body && /<Mark/.test(body),
  );
}
for (const name of ['BellMark', 'NoteMark', 'ChevronMark', 'ThemeSwatchStrip']) {
  const body = motifBody(name);
  check(
    `decorative sweep: ${name} draws no text of its own (real strings come from props)`,
    !!body && !/<Text/.test(body),
  );
}
check(
  'decorative sweep: SectionHead is real text over a hidden rule (label from a prop, never invented)',
  /export function SectionHead\(\{ label, style \}/.test(MOTIF_SRC) &&
    /<View style=\{\[styles\.sectionHead/.test(MOTIF_SRC) &&
    /<GoldRule style=\{styles\.sectionHeadRule\} \/>/.test(MOTIF_SRC),
);
check(
  'decorative sweep: the two swatch components take their items as props (they never guess what a user holds)',
  /items: readonly ThemeSwatchItem\[\]/.test(MOTIF_SRC) &&
    /export interface ThemeSwatchItem/.test(MOTIF_SRC) &&
    !/visibleThemes/.test(MOTIF_SRC),
);
check(
  'paywall + settings share the swatch grammar: one row, one strip, same real data source',
  (PAY.match(/ThemeSwatchRow/g) || []).length === 2 && (SET.match(/ThemeSwatchStrip/g) || []).length === 2,
);
// The inline decoration Wave 3 added keeps the same contract as the drawn marks:
// invisible to VoiceOver, transparent to touches.
const hiddenInline = (src, styleRef) =>
  new RegExp(
    'accessibilityElementsHidden[\\s\\S]{0,200}pointerEvents="none"[\\s\\S]{0,140}style=\\{' +
      styleRef +
      '\\}',
  ).test(src);
check(
  'a11y sweep: onboarding inline decoration (hero horizon, CTA rule) is hidden + touch-transparent',
  hiddenInline(ONB, 'styles.heroHorizon') && hiddenInline(ONB, 'styles.ctaRule'),
);
check(
  'a11y sweep: the paywall status dot is hidden (the title + copy beside it carry the meaning)',
  hiddenInline(PAY, 'styles.honestDot'),
);
check(
  'a11y sweep: the coming-soon chip stays announced (its own text, no accessibilityElementsHidden)',
  /<ComingSoonChip label=\{COMING_SOON_LABEL\} \/>/.test(ONB) &&
    !/accessibilityElementsHidden[\s\S]{0,120}ComingSoonChip/.test(ONB),
);
const pkg = JSON.parse(readSrc('package.json'));
check(
  'no new dependencies (still no svg / gradient / font package)',
  !Object.keys(pkg.dependencies).some((d) => /svg|linear-gradient|expo-font/.test(d)),
  Object.keys(pkg.dependencies).join(','),
);
check(
  'GATED_TINT_ALPHA is a real alpha on a real tint (no opacity hack, no dimmed copy)',
  GATED_TINT_ALPHA === 0.55 &&
    withAlpha(themeAccents.gratitude.tint, GATED_TINT_ALPHA) === 'rgba(249,237,221,0.55)',
  withAlpha(themeAccents.gratitude.tint, GATED_TINT_ALPHA),
);
check(
  'type tokens: the three screens\u2019 new headings use the shared serif scale',
  !!typeScale.displayLg && !!typeScale.display && typeScale.smallCaps.textTransform === 'uppercase',
);

console.log(
  failures === 0
    ? `ALL ${checks} WAVE 3 VISUAL CHECKS PASSED`
    : `${failures} of ${checks} WAVE 3 VISUAL CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
