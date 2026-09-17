#!/usr/bin/env node
/**
 * The Settings upgrade entry point — proof (owner request, Sep 2026, after the
 * build-11 device review).
 *
 * What this exists to keep true:
 *  - A FREE user's Calm Quest+ card offers exactly ONE upgrade affordance, and
 *    its tappable row really renders as an accessible button named with the
 *    approved string ("Upgrade to Calm Quest+") — asserted by INVOKING the
 *    component and walking its element tree, not by grepping for the words.
 *  - The tap opens the EXISTING paywall screen by the same route + source the
 *    gated content uses, and adds no purchase logic of its own.
 *  - A PLUS user's card renders no upgrade affordance at all (the render site is
 *    guarded on the persisted tier), and Manage + Restore stay exactly as they
 *    were.
 *  - The card's tier is re-read from persisted state on every focus, so coming
 *    back from a verified purchase re-renders as PLUS with no restart — and the
 *    purchase still lands through the one honest writer (applyEntitlement →
 *    saveState), untouched by this change.
 *  - Presentation rules from docs/VISUAL.md: gold is the invitation family, the
 *    row keeps secondary-CTA size/weight/height parity with the ghost rows,
 *    every colour is a palette token, the drawn chevron is a hidden mark, and
 *    there is no urgency, no scarcity and no padlock anywhere in it.
 */

'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Harness — same shape as the wave-1/2/3 proofs: transpile the real sources and
// hand-write the react-native shim they touch.
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

/** Flatten a style (object | array | `({pressed}) => …` | falsy) into one object. */
function flat(style) {
  if (!style) return {};
  if (typeof style === 'function') return flat(style({ pressed: false }));
  if (Array.isArray(style)) return style.reduce((acc, s) => Object.assign(acc, flat(s)), {});
  if (typeof style === 'object') return style;
  return {};
}
/** The raw style array an element was given (function styles are called). */
function styleArray(style) {
  if (typeof style === 'function') return styleArray(style({ pressed: false }));
  if (Array.isArray(style)) return style;
  return [style];
}
/** Components that own hooks are recorded as leaves rather than invoked. */
const SKIP_INVOKE = new Set(['LightBloom', 'AnimatedView']);
function nodes(element, out = []) {
  if (element === null || element === undefined || typeof element === 'boolean') return out;
  if (Array.isArray(element)) {
    element.forEach((e) => nodes(e, out));
    return out;
  }
  if (typeof element !== 'object' || !element.$$typeof) return out;
  if (typeof element.type === 'function') {
    if (SKIP_INVOKE.has(element.type.name)) {
      out.push({ type: element.type.name, props: element.props || {}, style: {}, skipped: true });
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
const withProps = (list, predicate) => list.filter((n) => predicate(n.props, n.style));
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
const norm = (s) =>
  String(s)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\{'(\\n|\\t| |\\u00a0)'\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** Source with comments removed — negative checks must read CODE, not comments. */
const code = (s) =>
  String(s)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const hasEmoji = (src) =>
  /[\u{1F000}-\u{1FAFF}]/u.test(src) ||
  /[\u2600-\u27BF]/.test(src.replace(/[✦⚙\uFE0E\uFE0F]/g, ''));
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

const SET_REL = 'src/screens/SettingsScreen.tsx';
const COMP_REL = 'src/components/UpgradeInvitation.tsx';
const SET = readSrc(SET_REL);
const COMP = readSrc(COMP_REL);
const PAY = readSrc('src/screens/PaywallScreen.tsx');
const HOME = readSrc('src/screens/HomeScreen.tsx');
const QUEST = readSrc('src/screens/QuestScreen.tsx');
const GLIMPSE = readSrc('src/screens/GlimpseScreen.tsx');
const STORE = readSrc('src/storage/store.ts');
const TRIAL = readSrc('src/subscription/trial.ts');
const SET_CODE = norm(code(SET));

/** The one approved copy addition, hardcoded: a copy edit fails this proof. */
const APPROVED = 'Upgrade to Calm Quest+';
/** The label as the SCREEN actually passes it (extracted from its COPY map). */
const copyMatch = /upgrade: '([^']*)'/.exec(SET);
const labelFromSource = copyMatch ? copyMatch[1] : null;

// ---------------------------------------------------------------------------
// Palette + contrast
// ---------------------------------------------------------------------------
const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const colorTokens = loadTs(path.join(REPO, 'src/theme/colors.ts'));
const { colors, buttons, spacing } = theme;
const PALETTE = new Set([
  ...Object.values(colors).filter((v) => /^#/.test(v)),
  ...Object.values(colorTokens.themeAccents ?? {}).flatMap((t) => [t.tint, t.accent, t.deep]),
]);
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
function paletteColour(value) {
  const v = String(value);
  if (v === 'transparent' || v === 'none') return true;
  if (/^#/.test(v)) return PALETTE.has(v.toUpperCase()) || PALETTE.has(v);
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (!m) return false;
  const hex = `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return [...PALETTE].some((p) => String(p).toLowerCase() === hex);
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
/** WCAG floors, the wave-1/2/3 convention: text 4.5, meaningful graphic 3.0. */
const TEXT_FLOOR = 4.5;
const GRAPHIC_FLOOR = 3;
const redFlag = (style) => {
  for (const k of colourKeys) {
    const v = style[k];
    if (v === undefined) continue;
    if (String(v) === colors.brick) return `${k}:brick`;
    if (paletteColour(v)) continue;
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(v));
    if (!m) continue;
    const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
    if (r > 120 && r > g * 1.6 && r > b * 1.6) return `${k}:${v}`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// 1. The affordance itself — invoked, and its element tree walked
// ---------------------------------------------------------------------------
console.log('\n-- the affordance (render level) --');

check(
  'the approved label is the ONE new string, and it lives once in the Settings COPY map',
  labelFromSource === APPROVED &&
    (code(SET).match(/Upgrade to Calm Quest\+/g) || []).length === 1 &&
    /upgrade: 'Upgrade to Calm Quest\+',/.test(norm(code(SET))),
  `source label = ${JSON.stringify(labelFromSource)}`,
);
{
  // The string must not be duplicated anywhere else in src/ (one approved
  // addition, one home for it).
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  })(path.join(REPO, 'src'));
  const carriers = files
    .filter((f) => code(fs.readFileSync(f, 'utf8')).includes(APPROVED))
    .map((f) => path.relative(REPO, f));
  check(
    'the approved label exists in exactly one file in src/ (the screen that shows it)',
    carriers.length === 1 && carriers[0] === SET_REL,
    carriers.join(', '),
  );
}
check(
  'the affordance file invents no product copy — its label arrives as a prop',
  !code(COMP).includes(APPROVED) && /label: string/.test(COMP) && !/COPY/.test(code(COMP)),
);

const comps = loadTs(path.join(REPO, COMP_REL));
let taps = 0;
const tree = nodes(comps.UpgradeInvitation({ label: labelFromSource, onPress: () => (taps += 1) }));
const pressRuns = withProps(tree, (p) => p.accessibilityRole === 'button' && !!p.onPress);

check(
  'render: exactly one accessible button, named with the exact approved string',
  pressRuns.length === 1 && pressRuns[0].props.accessibilityLabel === APPROVED,
  pressRuns.map((n) => String(n.props.accessibilityLabel)).join(' | '),
);
check(
  'render: the label text drawn is the same exact string, and it is the only text',
  texts(tree).length === 1 && texts(tree)[0] === APPROVED,
  JSON.stringify(texts(tree)),
);
check(
  'render: the tap is forwarded once and nothing else happens (no purchase logic here)',
  (() => {
    pressRuns[0].props.onPress();
    return taps === 1;
  })(),
  `taps=${taps}`,
);
const marks = tree.filter((n) => hidden(n));
check(
  'render: a chevron is drawn, and it is a decorative mark (hidden + touch-transparent)',
  marks.length === 1 &&
    marks[0].style.borderColor === colors.goldDeep &&
    marks[0].style.borderTopWidth === 2 &&
    marks[0].style.borderRightWidth === 2,
  `hidden marks=${marks.length}`,
);
check(
  'render: the button and its label stay announced — only the drawn chevron is hidden',
  withProps(tree, (p) => p.accessibilityRole === 'button').every((n) => !hidden(n)) &&
    tree.filter((n) => n.type === 'Text').every((n) => !hidden(n)) &&
    marks.length === 1,
);

const btn = pressRuns[0];
const label = tree.find((n) => n.type === 'Text');
check(
  'render: gold family — goldTint paint under a gold hairline, label in goldDeep',
  btn.style.backgroundColor === colors.goldTint &&
    btn.style.borderColor === colors.gold &&
    label.style.color === colors.goldDeep,
  JSON.stringify({ bg: btn.style.backgroundColor, border: btn.style.borderColor, fg: label.style.color }),
);
check(
  'render: secondary-CTA parity — same ghost base, same text size/weight, same row height',
  styleArray(btn.props.style).includes(buttons.ghost) &&
    styleArray(label.props.style).includes(buttons.ghostText) &&
    label.style.fontSize === buttons.ghostText.fontSize &&
    label.style.fontWeight === buttons.ghostText.fontWeight &&
    btn.style.paddingHorizontal === buttons.ghost.paddingHorizontal &&
    btn.style.paddingVertical + btn.style.borderWidth === buttons.ghost.paddingVertical,
  `pad ${btn.style.paddingVertical}+${btn.style.borderWidth} vs ghost ${buttons.ghost.paddingVertical}`,
);
check(
  'render: contrast floors computed, not assumed — label ≥ 4.5:1, gold hairline ≥ 3:1',
  ratio(colors.goldDeep, colors.goldTint) >= TEXT_FLOOR &&
    ratio(colors.goldDeep, colors.card) >= TEXT_FLOOR &&
    ratio(colors.gold, colors.card) >= GRAPHIC_FLOOR,
  `${r2(ratio(colors.goldDeep, colors.goldTint))}:1 on goldTint, ` +
    `${r2(ratio(colors.goldDeep, colors.card))}:1 on card, ` +
    `${r2(ratio(colors.gold, colors.card))}:1 hairline`,
);
check(
  'render: the row is at least a 44pt touch target (padding + hairline + label line)',
  (() => {
    // RN's default line height for a 15px label is ~18pt (1.2em); the ghost row
    // it matches measures the same way.
    const line = Math.round(buttons.ghostText.fontSize * 1.2);
    const height = btn.style.paddingVertical * 2 + btn.style.borderWidth * 2 + line;
    return height >= 44;
  })(),
);
check(
  'render: every colour comes from the palette, and nothing is red or brick',
  tree.every((n) => colourKeys.every((k) => n.style[k] === undefined || paletteColour(n.style[k]))) &&
    tree.every((n) => redFlag(n.style) === null),
);
check(
  'render: no padlock, no urgency, no scarcity in anything the row says or draws',
  (() => {
    const spoken = texts(tree).join(' ');
    const banned =
      /lock|padlock|unlock|hurry|limited|last chance|only \d+ (spots|left)|act now|don'?t miss|expires|countdown|today only/i;
    return !banned.test(spoken) && !banned.test(code(COMP));
  })(),
);
check(
  'render: the affordance is hooks-free and static (invocable by this proof, no motion of its own)',
  !/\buse[A-Z]\w*\(/.test(COMP) && !/Animated/.test(code(COMP)),
);

// ---------------------------------------------------------------------------
// 2. Where the screen puts it — FREE only, same door as the gated content
// ---------------------------------------------------------------------------
console.log('\n-- the Settings card (screen level) --');

check(
  'settings: the Calm Quest+ card renders exactly one upgrade affordance',
  (SET_CODE.match(/<UpgradeInvitation/g) || []).length === 1,
  String((SET_CODE.match(/<UpgradeInvitation/g) || []).length),
);
check(
  'settings: FREE shows it — the render site is guarded on the persisted tier state',
  /\{loaded && tier === 'free' \? \( <UpgradeInvitation label=\{COPY\.upgrade\} onPress=\{onUpgrade\} \/> \) : null\}/.test(
    SET_CODE,
  ) && /const \[tier, setTier\] = useState<'free' \| 'paid'>\('free'\)/.test(SET_CODE),
);
{
  // The single render site, with the guard that gates it: a PLUS user's card
  // has no upgrade row at all, because this is the only place one can appear.
  const sites = SET_CODE.match(/.{0,70}<UpgradeInvitation/g) || [];
  check(
    'settings: PLUS renders no upgrade affordance at all (its only render site is the FREE branch)',
    sites.length === 1 && /tier === 'free' \? \( <UpgradeInvitation$/.test(sites[0]) && !/paid/.test(sites[0]),
    sites.join(' | '),
  );
}
check(
  'settings: the door sits inside the card, between the swatch strip and the housekeeping rows',
  (() => {
    const strip = SET_CODE.indexOf('<ThemeSwatchStrip items={swatchItems}');
    const door = SET_CODE.indexOf('<UpgradeInvitation');
    const actions = SET_CODE.indexOf('<View style={styles.plusActions}>');
    return strip > -1 && door > strip && actions > door;
  })(),
);
check(
  'settings: the PLUS card is untouched — Restore + Manage keep their exact rows and styles',
  /accessibilityState=\{\{ disabled: restoring \}\}/.test(SET_CODE) &&
    /restoring \? COPY\.restoring : COPY\.restore/.test(SET_CODE) &&
    /<Text style=\{buttons\.ghostText\}>\{COPY\.manage\}<\/Text>/.test(SET_CODE) &&
    (norm(styleBlock(SET, 'plusActions')) || '').includes('marginTop: spacing.md') &&
    (norm(styleBlock(SET, 'plusBtn')) || '').includes("alignSelf: 'stretch'"),
  norm(styleBlock(SET, 'plusActions')),
);
check(
  'settings: the tap opens the paywall by the same route + source the gated content uses',
  /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(SET)) &&
    /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(HOME)) &&
    /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(QUEST)) &&
    /navigation\.navigate\('Paywall', \{ source: 'growth' \}\)/.test(code(GLIMPSE)),
);
check(
  'settings: the post-loop \u2018auto\u2019 surface is never used from Settings (that one is the modal)',
  !/source: 'auto'/.test(code(SET)) && /source: 'auto'/.test(code(QUEST)) && /source: 'auto'/.test(code(GLIMPSE)),
);
check(
  'settings: the handler adds no purchase logic — one navigate call, nothing else',
  (() => {
    const m = /function onUpgrade\(\) \{([\s\S]*?)\n  \}/.exec(code(SET));
    if (!m) return false;
    const body = norm(m[1]);
    return (
      body === "navigation.navigate('Paywall', { source: 'growth' });" &&
      !/subscriptionService|runTrialFlow|applyEntitlement|react-native-iap/.test(body)
    );
  })(),
);
check(
  'settings: a verified purchase still lands through the one honest writer (restart not needed)',
  /export async function applyEntitlement\(/.test(STORE) &&
    /applyEntitlement\(base, result\.value\)/.test(TRIAL) &&
    /await saveState\(next\)/.test(STORE) &&
    /runTrialFlow\(/.test(PAY),
);
check(
  'settings: the card re-reads the persisted tier on every focus (so a purchase re-renders as PLUS)',
  /useFocusEffect\(/.test(code(SET)) &&
    /setTier\(s\.entitlements\.tier\)/.test(code(SET)) &&
    SET_CODE.indexOf('useFocusEffect(') < SET_CODE.indexOf('setTier(s.entitlements.tier)') &&
    /tier === 'free' \? \( <UpgradeInvitation/.test(SET_CODE),
);
check(
  'settings: no second paywall surface or gating change — the gates and the paywall file are untouched by this',
  !/paywallSurface|PAYWALL_TRIGGER_LOOPS/.test(code(SET)) &&
    /export default function PaywallScreen/.test(PAY),
);

// ---------------------------------------------------------------------------
// 3. Integrity of the new file
// ---------------------------------------------------------------------------
console.log('\n-- integrity --');
check(
  'integrity: the new file uses palette tokens only (no raw hex, no legacy token)',
  !/#[0-9a-fA-F]{6}\b/.test(code(COMP)) &&
    !/colors\.(cream|creamDeep|white|border|tealSoft|sageSoft|softCoral)\b/.test(COMP),
);
check(
  'integrity: no new dependency and no drawing library in the new file',
  !/react-native-svg|linear-gradient|reanimated|expo-font/.test(COMP) &&
    !Object.keys(JSON.parse(readSrc('package.json')).dependencies).some((d) =>
      /svg|linear-gradient|expo-font|reanimated/.test(d),
    ),
);
check(
  'integrity: no emoji chrome, and the only hue family it adds is gold',
  !hasEmoji(code(COMP)) &&
    /colors\.gold(Deep|Tint)?\b/.test(COMP) &&
    !/colors\.teal|colors\.sage|colors\.brick|colors\.notice/.test(COMP),
);
check(
  'integrity: brick (destructive) still appears in exactly one file — the Settings delete row',
  (() => {
    const files = [];
    (function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name)) files.push(p);
      }
    })(path.join(REPO, 'src'));
    const users = files.filter((f) => /colors\.brick\b/.test(fs.readFileSync(f, 'utf8')));
    return users.length === 1 && /SettingsScreen\.tsx$/.test(users[0]);
  })(),
);

console.log(
  failures === 0
    ? `\nALL ${checks} SETTINGS-UPGRADE CHECKS PASSED`
    : `\n${failures} of ${checks} SETTINGS-UPGRADE CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
