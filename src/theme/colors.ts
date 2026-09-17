/**
 * Calm Quest — palette (Phase 2a; retuned for Visual-Richness Wave 1, §1).
 *
 * Mirrors the marketing site's brand tokens so the app and site feel like one
 * brand. Flat values by design — this MVP uses no theme provider; screens
 * import these constants directly.
 *
 * Wave-1 rule that keeps the colour coherent (visual-direction §1b):
 *   `accent` = paint (fills, 3px edges, washes, ornament) — DECORATION ONLY,
 *             2.4–3.1:1 on paper, so it is never text and never a state glyph.
 *   `deep`   = ink (all text and all state-bearing marks), ≥4.5:1 on its tint.
 * Every hue has exactly one job (anti-noise rule 1): teal = action, sage =
 * kept/grown, gold = value/light, notice = gentle notice (grace), brick =
 * destructive (delete only, text only).
 */

import type { QuestTheme } from '../models/types';

export const colors = {
  /** Warm near-white page background */
  paper: '#FCF9F4',
  /** Slightly deeper paper for alt fills and quiet boxes */
  paperDeep: '#F4EEE3',
  /** Reading surfaces: verse plates, glimpse entry box, journal input */
  vellum: '#FBF7EE',
  /** Card surface — never pure white */
  card: '#FFFDFA',
  /** 1px card hairline (cards are warm now, not pure white) */
  paperEdge: '#EAE2D3',
  /** Dividers, hairlines, ornament rules */
  rule: '#E3DAC7',
  /** Disabled / coming-soon fill, chip backgrounds */
  sand: '#EDE5D6',
  /** Ink text + secondary ink + dateline/colophon ink (3.6:1 — large/decoration) */
  ink: '#26312C',
  inkSoft: '#55615A',
  inkFaint: '#7C877F',
  /** The active/practice family: primary buttons, switches, timers, selected */
  teal: '#0E7A72',
  tealDeep: '#0A5F59',
  tealTint: '#DCEBE6',
  /** Kept / completed / grown */
  sageTint: '#E9F0E2',
  sageMark: '#7D8F6E',
  sageDeep: '#4F6B45',
  /** Encouragement / value / light */
  goldTint: '#FAF1D9',
  gold: '#B98A2F',
  goldDeep: '#7A5B1F',
  goldBright: '#C9A227',
  /** Gentle notice (grace) — the tone fix that replaces softCoral */
  noticeTint: '#EEEAF4',
  noticeDeep: '#4C4269',
  /** Destructive (delete only — the only brick in the product, text only) */
  brick: '#9E4B3F',
} as const;

export type ColorToken = keyof typeof colors;

/** The three paint/ink values every theme carries, plus its background wash. */
export interface ThemeAccent {
  /** Surfaces and chips */
  tint: string;
  /** Paint: fills, 3px edges, washes, ornament (decoration only) */
  accent: string;
  /** Ink: all text and all state-bearing marks (≥4.5:1 on `tint`) */
  deep: string;
  /** The soft background bloom — the accent at low alpha, no new hex */
  wash: string;
}

/**
 * One hue per theme (visual-direction §1b). Purpose deliberately shares the
 * brand gold family; forgiveness is clay rose (green is the app's kept/grown
 * semantic and stays reserved for sage).
 */
export const themeAccents: Record<QuestTheme, ThemeAccent> = {
  gratitude: { tint: '#F9EDDD', accent: '#C08339', deep: '#8A5620', wash: 'rgba(192,131,57,0.14)' },
  stillness: { tint: '#E6EEF3', accent: '#4A7A99', deep: '#2B5570', wash: 'rgba(74,122,153,0.13)' },
  purpose: { tint: '#FAF1D9', accent: '#C9A227', deep: '#7A5B1F', wash: 'rgba(201,162,39,0.14)' },
  forgiveness: { tint: '#F8EBE9', accent: '#BA8288', deep: '#7E4A55', wash: 'rgba(186,130,136,0.13)' },
  patience: { tint: '#EEEAF4', accent: '#7A6B9C', deep: '#4C4269', wash: 'rgba(122,107,156,0.12)' },
};

/** '#RRGGBB' → 'rgba(r,g,b,alpha)'. Non-hex input is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Gated-row fill: a theme tint laid on the card at ~55% (§3.2.5 — a real tint,
 * never an opacity jail over text). Text on top keeps full contrast.
 */
export const GATED_TINT_ALPHA = 0.55;
