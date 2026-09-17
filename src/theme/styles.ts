/**
 * Calm Quest — shared style tokens (Phase 2a; retuned in Visual-Richness W1).
 *
 * Rounded, generous, calm: all cards share corner radii, an elevation weight and
 * padding so screens feel like one family. No theme provider needed — import
 * these and the palette where used.
 *
 * Wave 1 (§2): three shadow weights replace the single flat shadow —
 * `flat` (settings/list rows) · `card` (default) · `raised` (today's quest card,
 * the level-up overlay, the paywall hero only). Elevation is information: the
 * more a surface matters, the higher it sits. Editorial type adds a serif for
 * reading (Platform.select → Georgia on iOS) with zero dependencies and no font
 * assets; UI voice stays system sans with letter-spaced small caps for labels.
 */

import { Platform, StyleSheet } from 'react-native';

import { colors } from './colors';

export const radii = {
  sm: 12,
  md: 16,
  /** Today's quest hero card (§3.2.2) */
  hero: 20,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Serif family for display + reading voice. `Platform.select` with a guarded
 * call so the module is also loadable in the node proof/QA harnesses (their
 * react-native shim has no `select`), then an honest iOS-first default.
 */
const platformSelect = (
  Platform as unknown as { select?: (spec: Record<string, string>) => string | undefined }
).select;
export const serifFamily: string =
  platformSelect?.({ ios: 'Georgia', android: 'serif', default: 'serif' }) ?? 'Georgia';

/** Editorial type scale (§2.4): display, reading voice, small-caps labels. */
export const typeScale = StyleSheet.create({
  display: {
    fontFamily: serifFamily,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  displayLg: {
    fontFamily: serifFamily,
    fontSize: 32,
    lineHeight: 39,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  /** Verses, affirmations, glimpse prompts & entries, blessings. */
  reading: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink,
  },
  readingLg: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 19,
    lineHeight: 28,
    color: colors.ink,
  },
  /** Datelines, chips, meta — system sans, letter-spaced, upper case. */
  smallCaps: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  smallCapsDeep: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** The one ornament glyph app-wide (§2.4): a small goldBright ✦. */
  ornament: {
    fontSize: 11,
    color: colors.goldBright,
  },
});

/** Three elevation weights (§2.2) — an ink shadow, never a grey halo. */
export const shadows = StyleSheet.create({
  flat: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
});

/** Page-level container (paper background, top-safe padding via callee). */
export const page = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.paper,
  },
  content: {
    padding: spacing.lg,
  },
});

/** Card surfaces + typography shared by Home / Onboarding. */
export const cards = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    // Default elevation: a sheet laid on paper (hairline + soft ink shadow)
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.paperEdge,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  small: {
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 19,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tealDeep,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

/** Primary / secondary buttons. */
export const buttons = StyleSheet.create({
  primary: {
    backgroundColor: colors.teal,
    borderRadius: radii.pill,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.tealDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ghost: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ghostText: {
    color: colors.tealDeep,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: colors.sand,
  },
  disabledText: {
    color: colors.inkSoft,
  },
});

/** Small label chips (theme pill, streak chip, path badge). */
export const badges = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.tealTint,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tealDeep,
    letterSpacing: 0.3,
  },
  gold: {
    backgroundColor: colors.goldTint,
  },
  goldText: {
    color: colors.goldDeep,
  },
  sage: {
    backgroundColor: colors.sageTint,
  },
  sageText: {
    color: colors.sageDeep,
  },
  sand: {
    backgroundColor: colors.sand,
  },
  sandText: {
    // Full opacity: sand + inkSoft clears contrast (never an opacity jail).
    color: colors.inkSoft,
  },
});
