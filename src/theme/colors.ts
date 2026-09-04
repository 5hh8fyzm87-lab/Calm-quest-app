/**
 * Calm Quest — palette (Phase 2a).
 *
 * Mirrors the marketing site's `@theme` tokens (teal / sage / cream / ink /
 * gold) so the app and site feel like one brand. Flat values by design — this
 * MVP uses no theme provider; screens import these constants directly.
 */

export const colors = {
  /** Warm near-white page background */
  cream: '#fbf8f3',
  /** Slightly deeper cream for card alt fills */
  creamDeep: '#f3eee5',
  /** Section dividers / soft sand */
  sand: '#e9e2d5',
  /** Calm sage accents */
  sage: '#7d8f6e',
  sageDeep: '#5f7052',
  sageSoft: '#e6ecdf',
  /** Primary brand teal */
  teal: '#0e7a72',
  tealDeep: '#0a5f59',
  tealSoft: '#ddefea',
  /** Ink text + soft ink */
  ink: '#29352f',
  inkSoft: '#4c5a53',
  /** Gold accent (deep gold for white text on gold) */
  gold: '#b98a2f',
  goldDeep: '#7a5b1f',
  goldBright: '#c9a227',
  /** UI neutrals */
  white: '#ffffff',
  border: '#e2dccf',
  /** Soft error/warning used only for gentle notes (no alarm) */
  softCoral: '#d98a7a',
} as const;

export type ColorToken = keyof typeof colors;