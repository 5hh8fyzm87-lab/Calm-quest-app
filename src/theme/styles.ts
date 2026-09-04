/**
 * Calm Quest — shared style tokens (Phase 2a).
 *
 * Rounded, generous, calm: all cards use the same corner radii, shadow, and
 * padding so screens feel like one family. No theme provider needed — import
 * these and the palette where used.
 */

import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const radii = {
  sm: 12,
  md: 16,
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

/** Page-level container (cream background, top-safe padding via callee). */
export const page = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
  },
});

/** Card surfaces + typography shared by Home / Onboarding. */
export const cards = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    // Soft, consistent elevation (both platforms)
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
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
    color: colors.white,
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
    backgroundColor: colors.tealSoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tealDeep,
    letterSpacing: 0.3,
  },
  gold: {
    backgroundColor: '#f4e8c8',
  },
  goldText: {
    color: colors.goldDeep,
  },
  sage: {
    backgroundColor: colors.sageSoft,
  },
  sageText: {
    color: colors.sageDeep,
  },
  sand: {
    backgroundColor: colors.sand,
  },
  sandText: {
    color: colors.inkSoft,
  },
});

export { colors } from './colors';
export type { ColorToken } from './colors';