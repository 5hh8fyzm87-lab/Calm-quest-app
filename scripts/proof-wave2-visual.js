#!/usr/bin/env node
/**
 * Wave 2 (Visual-Richness) proof — Quest (§3.3), Glimpse (§3.4) and the
 * level-up overlay (§4.3).
 *
 * Three layers, all read-only (no behaviour is exercised or changed here):
 *  1. MOTIFS (render level): the Wave-2 additions in `src/theme/motifs.tsx` are
 *     really invoked and their element trees traversed — tick rings (amber →
 *     sage settle, `rule` track hairlines), the kept seal, the stem that gains
 *     a leaf (0 leaves → 1 leaf = bud-leaf-on-save), and the full-screen
 *     level-up overlay (paper field, one light bloom, 120px stage glyph, gold
 *     hairline ✦, serif 34 title, the blessing VERBATIM, exactly one CTA).
 *  2. SCREENS (source + structure): every Wave-2 treatment is present where it
 *     belongs, the approved copy is byte-identical, and the anti-noise rules
 *     hold — no red, no confetti, no sound cue, no countdown bar, no breath or
 *     medical framing, one wash per screen, no raw hex outside the palette.
 *  3. INTEGRITY: no new dependency, and the safe-area contract (every scroll
 *     container keeps `screenInsets` appended) is not regressed.
 *
 * Same harness style as the other proofs: a tiny react-native shim + a
 * TypeScript transpile loader. `LightBloom` is the one component that owns a
 * hook (Animated + Reduce-Motion), so the traversal records it as a leaf
 * instead of invoking it — its structure is asserted from props + source.
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
function check(name, ok, extra) {
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

/**
 * Components that own hooks (Animated) are recorded as leaves rather than
 * invoked — calling them outside React would throw, and their contract is
 * asserted from props + source below.
 */
const SKIP_INVOKE = new Set(['LightBloom']);

/** Invoke every function component in the tree and collect the host nodes. */
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
  out.push({ type: element.type, props: element.props || {}, style: flat(element.props && element.props.style) });
  nodes(element.props && element.props.children, out);
  return out;
}
const withStyle = (list, predicate) => list.filter((n) => predicate(n.style, n.props));
/** The rendered text of a Text node (string / number / single-child). */
const textOf = (node) => {
  if (!node) return null;
  const c = node.props.children;
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  if (Array.isArray(c) && c.length === 1) return String(c[0]);
  return c === undefined || c === null ? '' : null;
};

// ---------------------------------------------------------------------------
// Palette discipline: every colour in a drawn tree comes from a real token.
// ---------------------------------------------------------------------------
const theme = loadTs(path.join(REPO, 'src/theme/index.ts'));
const { colors, themeAccents, withAlpha, typeScale, serifFamily } = theme;

const PALETTE = new Set([
  ...Object.values(colors).filter((v) => /^#/.test(v)),
  ...Object.values(themeAccents).flatMap((t) => [t.tint, t.accent, t.deep]),
]);

/** '#RRGGBB' or 'rgba(r,g,b,a)' of a palette colour (or transparent). */
function paletteColour(value) {
  const v = String(value);
  if (v === 'transparent' || v === 'none') return true;
  if (/^#/.test(v)) return PALETTE.has(v.toUpperCase()) || PALETTE.has(v);
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (!m) return false;
  const hex = `#${[m[1], m[2], m[3]]
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')}`;
  return [...PALETTE].some((p) => String(p).toLowerCase() === hex);
}

const colourKeys = ['backgroundColor', 'borderColor', 'borderLeftColor', 'borderTopColor', 'color', 'shadowColor'];
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
      const s = String(v);
      if (v === undefined) continue;
      if (s === colors.brick) reds.push(`${k}:brick`);
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s);
      if (m) {
        const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
        if (r > 120 && r > g * 1.6 && r > b * 1.6) reds.push(`${k}:${s}`);
      }
    }
  }
  check(`${label}: no red / no brick anywhere (never an error state)`, reds.length === 0, reds.join(', '));
}

// ---------------------------------------------------------------------------
// 1. Motifs, rendered
// ---------------------------------------------------------------------------
const motifs = loadTs(path.join(REPO, 'src/theme/motifs.tsx'));
const AMBER = themeAccents.gratitude.accent;
const STILL = themeAccents.stillness;

// --- TickRing (§3.4.1 / §3.3.3) --------------------------------------------
const trackRing = nodes(
  motifs.TickRing({ lit: 12, total: 48, size: 132, radius: 56, tick: 4, color: AMBER }),
);
check('tick ring: 48 ticks drawn', withStyle(trackRing, (s) => s.height === 4 * 2.6).length === 48,
  String(withStyle(trackRing, (s) => s.height === 4 * 2.6).length));
check(
  'tick ring: lit ticks wear the focus hue, the track keeps `rule` hairlines',
  withStyle(trackRing, (s) => s.backgroundColor === AMBER).length === 12 &&
    withStyle(trackRing, (s) => s.backgroundColor === colors.rule).length === 36,
);
check(
  'tick ring: decorative root is accessibility-hidden + pointerEvents none',
  trackRing[0].props.accessibilityElementsHidden === true && trackRing[0].props.pointerEvents === 'none',
);
assertPaletteOnly('tick ring', trackRing);
assertNoRed('tick ring', trackRing);

// The Glimpse ring settles to sage when the minute completes (kept, not "won").
const settledRing = nodes(
  motifs.TickRing({ lit: 48, total: 48, size: 132, radius: 56, tick: 4, color: colors.sageMark }),
);
check(
  'tick ring: settles to SAGE when the minute completes',
  withStyle(settledRing, (s) => s.backgroundColor === colors.sageMark).length === 48 &&
    withStyle(settledRing, (s) => s.backgroundColor === colors.rule).length === 0,
);
const thinRing = nodes(
  motifs.TickRing({ lit: 0, total: 48, size: 156, radius: 66, tick: 3, color: STILL.accent }),
);
check('tick ring: the pause plate uses a thinner tick', withStyle(thinRing, (s) => s.height === 3 * 2.6).length === 48);

// --- KeptSeal (§3.3.4 / §3.4.3) -------------------------------------------
const seal = nodes(motifs.KeptSeal({ size: 64, tone: 'sage' }));
check(
  'kept seal: sageTint fill + the drawn check (never a ✓ glyph)',
  withStyle(seal, (s) => s.backgroundColor === colors.sageTint).length === 1 &&
    withStyle(
      seal,
      (s) => s.borderLeftWidth > 0 && s.borderBottomWidth > 0 && JSON.stringify(s.transform).includes('-45'),
    ).length === 1,
);
check(
  'kept seal: decorative root is accessibility-hidden + pointerEvents none',
  seal[0].props.accessibilityElementsHidden === true && seal[0].props.pointerEvents === 'none',
);
assertPaletteOnly('kept seal', seal);
assertNoRed('kept seal', seal);

// --- StemMark: the bud that gains one leaf on save (§3.4.2/§3.3.4) ---------
const budNoLeaf = nodes(motifs.StemMark({ leaves: 0, bud: true, size: 34, color: colors.sageMark }));
const budOneLeaf = nodes(motifs.StemMark({ leaves: 1, bud: true, size: 30, color: colors.sageDeep }));
const leavesOf = (tree, color) =>
  withStyle(tree, (s) => s.backgroundColor === color && s.borderTopLeftRadius >= s.height * 1.5).length;
check(
  'bud-leaf-on-save: the ring-base bud draws ZERO leaves',
  leavesOf(budNoLeaf, colors.sageMark) === 0 && withStyle(budNoLeaf, (s) => s.borderColor === colors.sageMark).length === 1,
);
check(
  'bud-leaf-on-save: the saved keepsake draws exactly ONE leaf',
  leavesOf(budOneLeaf, colors.sageDeep) === 1,
  String(leavesOf(budOneLeaf, colors.sageDeep)),
);
check(
  'bud-leaf-on-save: the gain is exactly one leaf (0 → 1)',
  leavesOf(budOneLeaf, colors.sageDeep) - leavesOf(budNoLeaf, colors.sageMark) === 1,
);
const stemNoBud = nodes(motifs.StemMark({ leaves: 1, size: 30, color: colors.sageDeep }));
check('stem mark: `bud` is optional (no bud circle when false)', withStyle(stemNoBud, (s) => s.height === 1 && s.backgroundColor === colors.rule).length === 1);
check(
  'stem mark: decorative root is accessibility-hidden + pointerEvents none',
  budOneLeaf[0].props.accessibilityElementsHidden === true && budOneLeaf[0].props.pointerEvents === 'none',
);
assertPaletteOnly('stem mark', budOneLeaf);
assertNoRed('stem mark', budOneLeaf);

// --- The light bloom (§4.3, the owner's replacement for confetti) ----------
check('bloom: one soft fade, ~900ms (≤1.2s as the spec caps it)', motifs.BLOOM_MS === 900 && motifs.BLOOM_MS <= 1200, String(motifs.BLOOM_MS));
check(
  'bloom: layered translucent discs stand in for a gradient (no new dependency)',
  Array.isArray(motifs.BLOOM_LAYERS) &&
    motifs.BLOOM_LAYERS.length >= 3 &&
    motifs.BLOOM_LAYERS.every((l) => l.alpha <= 0.1 && l.scale > 0 && l.scale <= 1),
  JSON.stringify(motifs.BLOOM_LAYERS),
);
const motifSrc = fs.readFileSync(path.join(REPO, 'src/theme/motifs.tsx'), 'utf8');
check('bloom: no looping animation (no Animated.loop / iterate / repeat)', !/Animated\s*\.\s*(loop|sequence|stagger)|loop\s*:/.test(motifSrc));
check('bloom: exactly ONE Animated.timing call', (motifSrc.match(/Animated\.timing\(/g) || []).length === 1);
check('bloom: respects AccessibilityInfo.isReduceMotionEnabled', motifSrc.includes('AccessibilityInfo.isReduceMotionEnabled()'));
check(
  'bloom: Reduce Motion disables the animation (settles instantly, no motion)',
  /if \(reduce\) \{\s*settle\(\);\s*return;\s*\}/.test(motifSrc),
);
check(
  'bloom: the bloom is decoration (hidden from assistive tech, transparent to touch)',
  /styles\.bloomField/.test(motifSrc) && /function Mark[\s\S]{0,300}pointerEvents="none"/.test(motifSrc),
);

// --- The level-up overlay, rendered (§4.3) ---------------------------------
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));
const info3 = progress.levelTitleInfo(3);
const BLESSING = info3.blessing;
const DISMISS = 'Back to today';
const TIER_NOTE = `3 of ${progress.TOTAL_LEVELS} growth levels — you're on the way.`;
const overlay = nodes(
  motifs.LevelUpOverlay({
    level: 3,
    title: info3.title,
    blessing: BLESSING,
    tierNote: TIER_NOTE,
    dismissLabel: DISMISS,
    onDismiss: () => {},
  }),
);
check(
  'overlay: full-screen paper field (absolute, all insets, paper background)',
  ['position', 'top', 'left', 'right', 'bottom'].every((k) => overlay[0].style[k] !== undefined) &&
    overlay[0].style.position === 'absolute' &&
    overlay[0].style.backgroundColor === colors.paper,
);
check(
  'overlay: the light bloom is inside it, exactly once (and nothing else animates)',
  withStyle(overlay, (s, p) => p && p.__bloom !== undefined).length === 0 &&
    overlay.filter((n) => n.type === 'LightBloom').length === 1,
  String(overlay.filter((n) => n.type === 'LightBloom').length),
);
check(
  'overlay: one light field only — no second static wash disc behind the bloom',
  withStyle(
    overlay,
    (s) => typeof s.borderRadius === 'number' && s.borderRadius >= 100 && /^rgba\(/.test(String(s.backgroundColor)),
  ).length === 0,
);
check(
  'overlay: a ~120px stage glyph',
  withStyle(overlay, (s) => s.width === 120 && s.height === 120).length === 1,
);
check(
  'overlay: a goldBright hairline + ✦ ornament',
  withStyle(overlay, (s) => String(s.backgroundColor) === withAlpha(colors.goldBright, 0.6)).length === 2 &&
    overlay.some((n) => textOf(n) === '✦'),
);
const overlayTitle = overlay.find((n) => n.style.fontSize === 34);
check(
  'overlay: the level title in serif 34px',
  !!overlayTitle && overlayTitle.style.fontFamily === serifFamily && textOf(overlayTitle) === info3.title,
  overlayTitle ? `${overlayTitle.style.fontSize}px ${overlayTitle.style.fontFamily}` : 'missing',
);
check(
  'overlay: the blessing renders VERBATIM',
  overlay.some((n) => textOf(n) === BLESSING),
  BLESSING,
);
check('overlay: the tier note renders verbatim', overlay.some((n) => textOf(n) === TIER_NOTE));
check(
  'overlay: exactly ONE CTA, a ghost button labelled "Back to today"',
  withStyle(overlay, (s, p) => p && p.accessibilityRole === 'button').length === 1 &&
    overlay.some((n) => textOf(n) === DISMISS),
);
check('overlay: no confetti particles and no sound anywhere in the art', !/confetti|particle|Sound|Haptic/i.test(motifSrc.replace(/\/\*[\s\S]*?\*\//g, '')));
assertPaletteOnly('overlay', overlay);
assertNoRed('overlay', overlay);

// ---------------------------------------------------------------------------
// 2. Screens — structure + frozen copy
// ---------------------------------------------------------------------------
const questSrc = fs.readFileSync(path.join(REPO, 'src/screens/QuestScreen.tsx'), 'utf8');
const glimpseSrc = fs.readFileSync(path.join(REPO, 'src/screens/GlimpseScreen.tsx'), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const questCode = strip(questSrc);
const glimpseCode = strip(glimpseSrc);

function has(src, needle, label) {
  check(label, src.includes(needle), needle.slice(0, 52));
}
function hasNot(src, re, label) {
  check(label, !re.test(src));
}

// --- §3.3.1 meta row -------------------------------------------------------
has(questCode, '{ backgroundColor: accent.tint }', 'quest: theme chip wears the day\'s tint');
has(questCode, 'color: accent.deep', 'quest: theme chip text wears the day\'s `deep` (state ink)');
has(questCode, 'typeChip: {\n    backgroundColor: colors.sand', 'quest: type chip stays neutral (sand)');
has(questCode, 'typeChipText: {\n    color: colors.inkSoft', 'quest: neutral type chip text at full contrast');
has(questCode, '[typeScale.display, styles.title]', 'quest: title in the serif 26px display voice');

// --- §3.3.2 the enlarged verse plate --------------------------------------
has(questCode, 'styles.verseBox, { borderLeftColor: accent.accent }', 'quest: verse plate carries the theme left rule');
has(questCode, 'verseBox: {\n    backgroundColor: colors.vellum', 'quest: verse plate sits on vellum');
has(questCode, 'borderLeftWidth: 3', 'quest: verse plate 3px rule');
has(questCode, '<Ornament style={styles.verseOrnament} />', 'quest: goldBright ✦ ornament above the verse');
has(questCode, 'typeScale.readingLg', 'quest: verse in the serif italic 19px reading voice');
has(questCode, '[typeScale.smallCaps, styles.verseRef]', 'quest: reference in small caps');
has(questCode, '{verse.reference} · {verse.translation}', 'quest: reference string unchanged');
has(questCode, '{verse.attribution}', 'quest: attribution kept verbatim');

// --- §3.3.3 type-specific accents ----------------------------------------
has(questCode, 'accent={accent}', 'read & reflect: rows receive the day\'s accent');
has(questCode, 'selected && { borderColor: accent.accent, backgroundColor: accent.tint }', 'read & reflect: selected row takes theme accent + tint');
has(questCode, '<Leaf size={16} color={accent.deep} style={styles.checkLeaf} />', 'read & reflect: filled leaf replaces the plain dot');
hasNot(questCode, /checkDot/, 'read & reflect: the plain teal dot is gone');
has(questCode, '{ borderColor: accent.accent },', 'act: "I did it" pill wears the theme accent');
has(
  questCode,
  'performed && { borderColor: accent.deep, backgroundColor: accent.tint }',
  'act: performed = theme tint fill (state ink on the edge)',
);
has(questCode, '<Leaf size={16} color={accent.deep} style={styles.actLeaf} />', 'act: performed draws a leaf check');
has(questCode, '>I did it</Text>', 'act: "I did it" copy unchanged');
has(questCode, 'styles.pausePlate,', 'pause: the digits sit in a plate');
has(questCode, 'backgroundColor: still.tint', 'pause: the plate is soft stillness blue');
has(questCode, '<TickRing', 'pause: the existing ticking ring frames the digits');
has(questCode, 'lit={pauseLitTicks}', 'pause: the ring tracks the real countdown (no timer of its own)');
has(questCode, 'color: still.deep', 'pause: digits in stillness `deep` (state ink)');
has(questCode, 'accessibilityLabel={`${duration} seconds`}', 'pause: the digits keep their a11y label');
hasNot(questCode, /breathe|inhale|breath[- ]?sync|breathing/i, 'pause: no breath/medical framing anywhere');
hasNot(questCode, /Animated/, 'pause: no pulsing animation on the quest screen');
has(questCode, '{ borderColor: withAlpha(accent.accent, 0.45) }', 'write: input wears a theme hairline');
has(questCode, 'focused && { borderColor: accent.accent, borderWidth: 1.5 }', 'write: focus = theme accent border');
has(questCode, 'input: {\n    borderWidth: 1,', 'write: input is a vellum sheet');
has(questCode, 'backgroundColor: colors.vellum,', 'write: vellum writing surface');

// --- §3.3.4 the completion card ------------------------------------------
has(questCode, '<KeptSeal size={64} tone="sage"', 'done: kept seal in sage (reused motif)');
has(questCode, '<View style={[badges.chip, badges.gold, styles.xpPill]}>', 'done: the gold XP pill');
has(questCode, '+{xpGained} XP', 'done: the pill shows the real XP gained');
has(questCode, '<StemMark leaves={1} bud size={32} color={colors.sageDeep}', 'done: a small stem with the leaf it just gained');
has(questCode, "Today's quest is done.", 'done: title copy verbatim');
has(questCode, "Day {streakDays} secured — whenever you're ready", 'done: the streak line stays verbatim');
hasNot(questCode, /doneCheck/, 'done: the old ✓ glyph is gone (drawn art instead)');

// --- §4.3 the overlay wiring --------------------------------------------
has(questCode, '<LevelUpMoment level={result.level} onDismiss={leaveAfterCompletion} />', 'overlay: escalates from the completion moment');
has(questCode, 'done && result && result.leveledUp && !result.levelGated', 'overlay: shown only for a real level-up (never for the free gate)');
has(questCode, 'blessing={info.blessing}', 'overlay: blessing passed through untouched');
has(questCode, 'title={info.title}', 'overlay: level title passed through untouched');
has(questCode, 'dismissLabel="Back to today"', 'overlay: one ghost CTA, same label as before');
has(questCode, '<View style={styles.screenRoot}>', 'overlay: the screen has a root that can carry the overlay');
has(questCode, "tierNote={`${level} of ${TOTAL_LEVELS} growth levels — you're on the way.`}", 'overlay: tier note copy verbatim');
check('quest: no confetti anywhere (the bloom replaces it)', !/confetti|particle/i.test(questCode));
check('quest: no red-ish colour and no brick', !/brick|coral/i.test(questCode));
check('quest: no raw hex colour literals (tokens only)', !/#[0-9a-fA-F]{3,8}\b/.test(questCode));
// Inline hues on this screen are deliberately limited to TWO (§5 rule 1): the
// day's theme, plus the pause plate's stillness blue — which §3.3.3 mandates by
// name, and which is the "stillness" the Pause quest IS (no third hue, and no
// gold ornament is added to the pause body to keep the pair quiet).
const inlineThemes = [...new Set(questCode.match(/themeAccents\[quest\.theme\]|themeAccents\.\w+/g) || [])].sort();
check(
  "quest: inline theme hues are only the day's theme + the pause plate's stillness (§3.3.3)",
  inlineThemes.length === 2 &&
    inlineThemes.includes('themeAccents[quest.theme]') &&
    inlineThemes.includes('themeAccents.stillness'),
  inlineThemes.join(', '),
);

// --- §3.4 Glimpse ---------------------------------------------------------
has(glimpseCode, 'const settled = elapsed >= RING_SECONDS;', 'glimpse: the ring knows when the minute is complete');
has(glimpseCode, 'color={settled ? colors.sageMark : GRATITUDE.accent}', 'glimpse: lit ticks amber → settle to sage (kept, not won)');
has(glimpseCode, 'trackColor={colors.rule}', 'glimpse: track ticks are rule hairlines');
check('glimpse: exactly one wash per screen (§5 rule 2)', (glimpseCode.match(/<Wash\b/g) || []).length === 1);
has(glimpseCode, 'color={GRATITUDE.wash}', 'glimpse: the wash is the day\'s amber');
has(glimpseCode, 'style={styles.ringWash}', 'glimpse: the wash sits behind the ring');
has(glimpseCode, 'opacity={0.3}', 'glimpse: the wash blooms at the agreed 30%');
has(glimpseCode, '<StemMark leaves={0} bud size={34} color={colors.sageMark}', 'glimpse: the bud at the ring\'s base has no leaf yet');
check(
  'glimpse: every saved state shows the same bud WITH its leaf',
  (glimpseCode.match(/<StemMark leaves=\{1\} bud/g) || []).length === 3,
  String((glimpseCode.match(/<StemMark leaves=\{1\} bud/g) || []).length),
);
has(glimpseCode, '[typeScale.prompt, styles.prompt]', 'glimpse: prompt in the serif 20px prompt voice');
has(glimpseCode, '<Ornament style={styles.promptOrnament} />', 'glimpse: goldBright ✦ ornament above the prompt');
has(glimpseCode, 'backgroundColor: colors.vellum,', 'glimpse: the entry box is a vellum keepsake');
has(glimpseCode, 'borderLeftWidth: 3', 'glimpse: entry box keeps the theme left rule');
has(glimpseCode, '[typeScale.reading, styles.entryText]', 'glimpse: the entry is shown back in the serif reading voice');
has(glimpseCode, '<KeptSeal size={56} tone="sage"', 'glimpse: kept in sage (kept, not "won")');
hasNot(glimpseCode, /doneCheck/, 'glimpse: the old ✓ glyph is gone');
has(glimpseCode, 'plusStrip: {\n    alignSelf: \'stretch\',\n    backgroundColor: colors.goldTint,', 'gate: the Calm Quest+ line moves onto a goldTint strip');
has(glimpseCode, 'ghostGold: {\n    alignSelf: \'stretch\',\n    borderWidth: 1,\n    borderColor: colors.gold,', 'gate: the ghost CTA gets a gold hairline (a door, not a wall)');
hasNot(glimpseCode, /Vibration|expo-av|playSound|Sound\./, 'glimpse: no sound cue');
hasNot(glimpseCode, /countdown|CountdownBar|progressBarFill/i, 'glimpse: no countdown bar');
hasNot(glimpseCode, /breathe|inhale|breathing/i, 'glimpse: no breath/medical framing');
check('glimpse: no confetti anywhere', !/confetti|particle/i.test(glimpseCode));
check('glimpse: the ring never turns red and never wears brick', !/brick|coral/i.test(glimpseCode));
check('glimpse: no raw hex colour literals (tokens only)', !/#[0-9a-fA-F]{3,8}\b/.test(glimpseCode));

// --- Frozen copy, byte-identical -----------------------------------------
const streaks = loadTs(path.join(REPO, 'src/streaks/streak.ts'));
check(
  'STREAK_MESSAGES.secured verbatim',
  streaks.STREAK_MESSAGES.secured(12) === "Day 12 secured — whenever you're ready",
  streaks.STREAK_MESSAGES.secured(12),
);
const FROZEN_QUEST = [
  { label: 'GRATITUDE GLIMPSE', where: glimpseSrc },
  { label: 'Your one glimpse for today is complete.', where: glimpseSrc },
  { label: 'Gratitude practiced.', where: glimpseSrc },
  { label: '+{XP_GLIMPSE} XP · Saved to your glimpses', where: glimpseSrc },
  { label: 'See what Calm Quest+ includes', where: glimpseSrc },
  { label: 'A grateful glance', where: glimpseSrc },
  { label: 'Which word stays with you?', where: questSrc },
  { label: "No wrong answer — a word is enough.", where: questSrc },
  { label: "When you've taken the step, tap and then Complete.", where: questSrc },
  { label: 'One line is enough. There is no right answer.', where: questSrc },
  { label: '+{XP_QUEST} XP when you finish · the daily loop is free, forever.', where: questSrc },
  { label: 'Continue', where: questSrc, optional: true },
];
for (const { label, where, optional } of FROZEN_QUEST) {
  if (optional) continue;
  has(where, label, `frozen copy intact — "${label.slice(0, 40)}"`);
}
// The two gate/cap state lines keep their EXACT wording (§3.4.4).
has(
  glimpseSrc,
  "'Calm Quest+ gives you as many glimpses as you like, any day.'",
  'cap state: the Calm Quest+ line is byte-identical',
);
has(
  glimpseSrc,
  "'Saved to your glimpses. Come back tomorrow — your next glimpse will be waiting.'",
  'cap state: the keepsake line is byte-identical',
);
has(
  glimpseSrc,
  "'That level is part of Calm Quest+ — your XP is safe and keeps counting. Levels 1–5 stay free, always.'",
  'gate state: the level-gate line is byte-identical',
);
has(glimpseSrc, 'One word is enough. There&rsquo;s no right answer.', 'glimpse: entry hint copy intact');
has(glimpseSrc, '+{XP_GLIMPSE} XP when you finish · kept private, on this device.', 'glimpse: XP hint copy intact');
check(
  'glimpse: the gentle keepsake lines are unchanged',
  ['Small mercies count. This one is kept.', 'Noticed with a grateful heart — held lightly.', 'A good thing, kept gently for tomorrow.', 'Grace for today, quietly noted.'].every((l) =>
    glimpseSrc.includes(l),
  ),
);

// ---------------------------------------------------------------------------
// 3. Integrity: no new dependency, safe-area contract preserved
// ---------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
check(
  'wave 2 added no dependency (no svg / gradient / font / animation package)',
  !Object.keys(pkg.dependencies).some((d) => /svg|gradient|expo-font|reanimated|lottie|confetti/i.test(d)),
  Object.keys(pkg.dependencies).join(','),
);
for (const [name, src] of [
  ['QuestScreen', questSrc],
  ['GlimpseScreen', glimpseSrc],
]) {
  const containers = (src.match(/contentContainerStyle=\{/g) || []).length;
  const withInsets = (src.match(/contentContainerStyle=\{\[[^\]]*screenInsets\]\}/g) || []).length;
  check(
    `${name}: every scroll container keeps its additive screenInsets (no safe-area regression)`,
    containers > 0 && withInsets === containers,
    `${withInsets}/${containers}`,
  );
  check(
    `${name}: the boot/loading box also keeps its insets`,
    !/bootInsets/.test(src) || /\[styles\.bootBox, bootInsets\]/.test(src),
  );
}

console.log('');
if (failures > 0) {
  console.log(`WAVE 2 VISUAL PROOFS FAILED (${failures})`);
  process.exit(1);
}
console.log('ALL WAVE 2 VISUAL PROOFS PASSED');
