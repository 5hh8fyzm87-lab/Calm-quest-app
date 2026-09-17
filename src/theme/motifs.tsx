/**
 * Calm Quest — drawn motifs (Visual-Richness Wave 1, visual-direction §3.2/§4).
 *
 * Every mark here is plain `View`/`Text` art: no `react-native-svg`, no
 * `expo-linear-gradient`, no font asset (owner decision, Sep 2026 — Tier C is
 * out of scope). The two typographic marks the design keeps are `✦` (ornament)
 * and `⚙︎` (settings); everything else is drawn.
 *
 * Rules honoured here:
 *  - Accents are DECORATION ONLY (§1b note): state-bearing marks and every
 *    piece of text use a `deep`/`sage`/`gold` ink token, never a pale accent.
 *  - Growth is monotone: buckets are honest (they read real `streakDays` /
 *    held level) and nothing ever visually shrinks — no withered plant, no
 *    broken chain, no flame, no red, no decreasing number.
 *  - Decorative marks are hidden from assistive tech (`accessibilityElementsHidden`)
 *    and never swallow touches (`pointerEvents="none"`).
 *  - Wave 1 art is static. Wave 2 adds exactly ONE motion device — the level-up
 *    light bloom (§4.3, the owner's replacement for confetti): a single ~900ms
 *    opacity fade, never looping, disabled under Reduce Motion.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, withAlpha } from './colors';
import { badges, buttons, serifFamily, spacing } from './styles';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Decorative container: invisible to assistive tech, transparent to touches.
 * Every mark in this file is wrapped in (or built from) one.
 */
function Mark({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={style}
    >
      {children}
    </View>
  );
}

/**
 * The one wash device (§2.3): a single soft bloom of the day's theme, anchored
 * by the caller and clipped by its container. One per screen.
 */
export function Wash({
  color,
  size = 280,
  opacity = 1,
  style,
}: {
  color: string;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Mark
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Hairline `rule` + a small `goldBright` ✦ — the only ornament app-wide (§2.4).
 * `ruleColor` lets the peak moments (§4.3) carry the same hairline in gold.
 */
export function Ornament({
  ruleColor = colors.rule,
  style,
}: {
  ruleColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Mark style={[styles.ornamentRow, style]}>
      <View style={[styles.ornamentRule, styles.ornamentFlex, { backgroundColor: ruleColor }]} />
      <Text style={styles.ornamentStar}>✦</Text>
      <View style={[styles.ornamentRule, styles.ornamentFlex, { backgroundColor: ruleColor }]} />
    </Mark>
  );
}

/** A drawn leaf. Rounded on two opposite corners; `hollow` = outline only. */
export function Leaf({
  size = 12,
  color = colors.sageMark,
  rotate = 0,
  hollow = false,
  style,
}: {
  size?: number;
  color?: string;
  rotate?: number;
  hollow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Mark
      style={[
        {
          width: size,
          height: size * 0.6,
          backgroundColor: hollow ? 'transparent' : color,
          borderTopLeftRadius: size,
          borderBottomRightRadius: size,
          borderWidth: hollow ? 1 : 0,
          borderColor: color,
          transform: [{ rotate: `${rotate}deg` }],
        },
        style,
      ]}
    />
  );
}

/** The kept/done check, drawn as a rotated hairline "L" (no glyph, no asset). */
export function CheckMark({
  size = 11,
  color = colors.card,
  stroke = 2,
  style,
}: {
  size?: number;
  color?: string;
  stroke?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Mark
      style={[
        {
          width: size,
          height: size * 0.55,
          borderLeftWidth: stroke,
          borderBottomWidth: stroke,
          borderColor: color,
          borderBottomLeftRadius: 2,
          transform: [{ rotate: '-45deg' }],
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Growth stages (§4.1): Seed L1–5 · Sprout L6–10 · Rooted L11–15 · Shelter L16–20
// ---------------------------------------------------------------------------

export type GrowthStage = 'seed' | 'sprout' | 'rooted' | 'shelter';

const GROWTH_STAGES: readonly GrowthStage[] = ['seed', 'sprout', 'rooted', 'shelter'];
/** Levels per stage — 5, so the free tier (L1–5) is a COMPLETE stage. */
export const STAGE_LEVELS = 5;
/** 15 levels sit behind the free gate (L6–20) — the gold region on the vine. */
export const GATED_LEVEL_MARKS = 15;

/** The growth stage a held level belongs to (honest: real level in, real stage out). */
export function stageForLevel(level: number): GrowthStage {
  const l = Math.max(1, Math.floor(level));
  const i = Math.min(GROWTH_STAGES.length - 1, Math.floor((l - 1) / STAGE_LEVELS));
  return GROWTH_STAGES[i];
}

/** The stage after the held one (drawn ghosted behind it), or null at the top. */
export function nextStageForLevel(level: number): GrowthStage | null {
  const i = GROWTH_STAGES.indexOf(stageForLevel(level));
  return GROWTH_STAGES[i + 1] ?? null;
}

/** A drawn sprout: stem + two leaves (§3.1 path rows, §4.1 faint stages). */
export function Sprout({
  size = 20,
  color = colors.sageDeep,
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const stemW = Math.max(1.6, size * 0.11);
  const leaf = size * 0.6;
  return (
    <Mark style={[{ width: size, height: size }, style]}>
      <View
        style={{
          position: 'absolute',
          left: (size - stemW) / 2,
          top: size * 0.36,
          width: stemW,
          height: size * 0.62,
          borderRadius: stemW / 2,
          backgroundColor: color,
        }}
      />
      <Leaf
        size={leaf}
        color={color}
        rotate={-26}
        style={{ position: 'absolute', left: size * 0.5 - leaf * 0.95, top: size * 0.42 }}
      />
      <Leaf
        size={leaf}
        color={color}
        rotate={26}
        style={{ position: 'absolute', left: size * 0.5 + leaf * 0.12, top: size * 0.5 }}
      />
    </Mark>
  );
}

/**
 * A stage glyph: seed half-sunk in a soil line → sprout → rooted → shelter.
 * Used by the level seal, the growth strip and (later) the level-up overlay.
 */
export function StageGlyph({
  stage,
  size = 32,
  color = colors.sageDeep,
  soil = colors.rule,
  blossom = colors.goldBright,
  style,
}: {
  stage: GrowthStage;
  size?: number;
  color?: string;
  soil?: string;
  blossom?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const stemW = Math.max(1.6, size * 0.1);
  const soilTop = size * 0.78;
  const leaf = size * 0.42;
  const hasStem = stage !== 'seed';
  const hasLeaves = stage === 'sprout' || stage === 'rooted';
  const budSize = size * 0.2;
  return (
    <Mark style={[{ width: size, height: size }, style]}>
      {/* Soil line — the ground every stage grows from. */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.05,
          top: soilTop,
          width: size * 0.9,
          height: 1,
          backgroundColor: soil,
        }}
      />
      {!hasStem ? (
        <View
          style={{
            position: 'absolute',
            left: size * 0.36,
            top: size * 0.66,
            width: size * 0.28,
            height: size * 0.22,
            borderRadius: size,
            backgroundColor: color,
            transform: [{ rotate: '-18deg' }],
          }}
        />
      ) : null}
      {hasStem ? (
        <View
          style={{
            position: 'absolute',
            left: (size - stemW) / 2,
            top: stage === 'shelter' ? size * 0.34 : size * 0.3,
            width: stemW,
            height: soilTop - (stage === 'shelter' ? size * 0.34 : size * 0.3),
            borderRadius: stemW / 2,
            backgroundColor: color,
          }}
        />
      ) : null}
      {hasLeaves ? (
        <>
          <Leaf
            size={leaf}
            color={color}
            rotate={-28}
            style={{ position: 'absolute', left: size * 0.5 - leaf * 0.95, top: size * 0.4 }}
          />
          <Leaf
            size={leaf}
            color={color}
            rotate={28}
            style={{ position: 'absolute', left: size * 0.5 + leaf * 0.1, top: size * 0.48 }}
          />
        </>
      ) : null}
      {stage === 'rooted' ? (
        <>
          <View style={[styles.glyphRoot, { left: size * 0.42, top: soilTop - 1, backgroundColor: color }]} />
          <View style={[styles.glyphRoot, { left: size * 0.52, top: soilTop - 1, backgroundColor: color }]} />
        </>
      ) : null}
      {stage === 'shelter' ? (
        <>
          {/* Broad canopy + one blossom — the top of the vine, nothing above it. */}
          <View
            style={{
              position: 'absolute',
              left: size * 0.08,
              top: size * 0.1,
              width: size * 0.84,
              height: size * 0.36,
              borderTopLeftRadius: size * 0.5,
              borderTopRightRadius: size * 0.5,
              borderBottomLeftRadius: size * 0.12,
              borderBottomRightRadius: size * 0.12,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: size * 0.66,
              top: size * 0.2,
              width: budSize,
              height: budSize,
              borderRadius: budSize / 2,
              backgroundColor: blossom,
            }}
          />
        </>
      ) : null}
      {stage === 'sprout' ? (
        <View
          style={{
            position: 'absolute',
            left: (size - budSize) / 2,
            top: size * 0.24,
            width: budSize,
            height: budSize,
            borderRadius: budSize / 2,
            borderWidth: 1,
            borderColor: color,
            backgroundColor: withAlpha(color, 0.35),
          }}
        />
      ) : null}
    </Mark>
  );
}

/**
 * Level seal (§4.1): a 44–56px `rule` ring holding the held stage glyph, with
 * the NEXT stage ghosted at 25% behind it — the art never disagrees with the
 * level the user actually holds.
 */
export function LevelSeal({
  level,
  size = 52,
  tone = 'sage',
  style,
}: {
  level: number;
  size?: number;
  tone?: 'sage' | 'gold';
  style?: StyleProp<ViewStyle>;
}) {
  const stage = stageForLevel(level);
  const next = nextStageForLevel(level);
  const ink = tone === 'gold' ? colors.goldDeep : colors.sageDeep;
  return (
    <Mark
      style={[
        styles.seal,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {next ? (
        <View style={[styles.sealLayer, { opacity: 0.25 }]}>
          <StageGlyph stage={next} size={size * 0.76} color={ink} />
        </View>
      ) : null}
      <StageGlyph stage={stage} size={size * 0.64} color={ink} />
    </Mark>
  );
}

// ---------------------------------------------------------------------------
// Vine meter (§4.1): replaces the 8px straight progress bar.
// ---------------------------------------------------------------------------

/** Leaf marks on the stem at 25 / 50 / 75% of the current level's progress. */
export const LEAF_MARKS: readonly number[] = [25, 50, 75];

/**
 * The vine: a stem that grows a leaf at 25/50/75% and ends in a bud that fills
 * gold as XP accrues. Free users see the stem continue into a gold-outlined
 * region of 15 hollow leaf marks (L6–20) — honest, because their XP genuinely
 * keeps accruing behind the gate.
 */
export function VineMeter({
  pct,
  showGate = false,
  style,
}: {
  pct: number;
  showGate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const budSize = 10;
  const budCore = 2 + (8 * p) / 100;
  return (
    <Mark style={[styles.vineRow, style]}>
      <Mark style={styles.vineLive}>
        <View style={styles.vineBase} />
        <View style={[styles.vineTrack, { width: `${p}%` }]} />
        {LEAF_MARKS.map((mark) => (
          <Leaf
            key={mark}
            size={12}
            color={p >= mark ? colors.sageMark : colors.rule}
            hollow={p < mark}
            rotate={-24}
            style={[styles.vineMark, { left: `${mark}%` }]}
          />
        ))}
        <View
          style={[
            styles.vineBud,
            {
              width: budSize,
              height: budSize,
              borderRadius: budSize / 2,
              left: `${p}%`,
              marginLeft: -budSize / 2,
            },
          ]}
        >
          <View
            style={{
              width: budCore,
              height: budCore,
              borderRadius: budCore / 2,
              backgroundColor: colors.goldBright,
            }}
          />
        </View>
      </Mark>
      {showGate ? (
        <Mark style={styles.vineGate}>
          {Array.from({ length: GATED_LEVEL_MARKS }).map((_, i) => (
            <View key={i} style={styles.vineGateMark} />
          ))}
        </Mark>
      ) : null}
    </Mark>
  );
}

// ---------------------------------------------------------------------------
// Streak sprig (§4.2): a plant that never withers.
// ---------------------------------------------------------------------------

export type StreakStage = 'seed' | 'seedling' | 'twoLeaves' | 'stemBud' | 'firstBranch' | 'threeLeaves';

/** Honest buckets of real `streakDays` (§4.2) — the number itself is never replaced. */
export function streakStage(days: number): StreakStage {
  const d = Math.max(0, Math.floor(days));
  if (d >= 100) return 'threeLeaves';
  if (d >= 30) return 'firstBranch';
  if (d >= 7) return 'stemBud';
  if (d >= 3) return 'twoLeaves';
  if (d >= 1) return 'seedling';
  return 'seed';
}

/** Stem top (fraction of `size` above the soil line) per stage. */
const STEM_CROWN: Record<StreakStage, number> = {
  seed: 0,
  seedling: 0.22,
  twoLeaves: 0.44,
  stemBud: 0.58,
  firstBranch: 0.58,
  threeLeaves: 0.62,
};

function Plant({
  stage,
  size,
  color,
  hollow,
  soilTop,
}: {
  stage: StreakStage;
  size: number;
  color: string;
  hollow: boolean;
  soilTop: number;
}) {
  const stemW = hollow ? Math.max(2.6, size * 0.1) : Math.max(1.8, size * 0.07);
  const crown = soilTop - size * STEM_CROWN[stage];
  const hasStem = stage !== 'seed';
  const leaf = stage === 'seedling' ? size * 0.3 : size * 0.4;
  const leaves = stage === 'threeLeaves' ? 3 : stage === 'seedling' ? 2 : stage === 'seed' ? 0 : 2;
  const hasBud = stage === 'stemBud' || stage === 'firstBranch' || stage === 'threeLeaves';
  const budSize = size * 0.17;
  return (
    <>
      {hasStem ? (
        <View
          style={{
            position: 'absolute',
            left: (size - stemW) / 2,
            top: crown,
            width: stemW,
            height: Math.max(1, soilTop - crown),
            borderRadius: stemW / 2,
            backgroundColor: hollow ? 'transparent' : color,
            borderWidth: hollow ? 1 : 0,
            borderColor: color,
          }}
        />
      ) : null}
      {leaves >= 2 ? (
        <>
          <Leaf
            size={leaf}
            color={color}
            rotate={-28}
            hollow={hollow}
            style={{ position: 'absolute', left: size * 0.5 - leaf * 0.95, top: crown + size * 0.06 }}
          />
          <Leaf
            size={leaf}
            color={color}
            rotate={28}
            hollow={hollow}
            style={{ position: 'absolute', left: size * 0.5 + leaf * 0.1, top: crown + size * 0.14 }}
          />
        </>
      ) : null}
      {leaves === 3 ? (
        <Leaf
          size={leaf}
          color={color}
          rotate={4}
          hollow={hollow}
          style={{ position: 'absolute', left: size * 0.5 - leaf * 0.45, top: crown - leaf * 0.5 }}
        />
      ) : null}
      {hasBud ? (
        <View
          style={{
            position: 'absolute',
            left: (size - budSize) / 2,
            top: crown - budSize * 0.85,
            width: budSize,
            height: budSize,
            borderRadius: budSize / 2,
            borderWidth: 1,
            borderColor: color,
            backgroundColor: withAlpha(color, 0.35),
          }}
        />
      ) : null}
      {stage === 'firstBranch' ? (
        <>
          {/* First branch: one arm reaching out with a leaf of its own. */}
          <View
            style={{
              position: 'absolute',
              left: size * 0.58,
              top: soilTop - size * 0.42,
              width: 1.6,
              height: size * 0.22,
              borderRadius: 1,
              backgroundColor: color,
              transform: [{ rotate: '38deg' }],
            }}
          />
          <Leaf
            size={size * 0.3}
            color={color}
            rotate={34}
            hollow={hollow}
            style={{ position: 'absolute', left: size * 0.7, top: soilTop - size * 0.58 }}
          />
        </>
      ) : null}
    </>
  );
}

/**
 * The header sprig: height/stage maps to real `streakDays` buckets; inside
 * grace the stem is drawn hollow with up to three water drops at the base
 * (filled for each real grace day remaining — water, never a timer); on a
 * reset day it is a seed in soil with a dusk-violet halo (never withered).
 */
export function StreakSprig({
  days,
  graceRemaining = 0,
  inGrace = false,
  resetDay = false,
  size = 40,
  style,
}: {
  days: number;
  graceRemaining?: number;
  inGrace?: boolean;
  resetDay?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const stage = streakStage(days);
  const soilTop = size * 0.84;
  const color = inGrace ? colors.noticeDeep : colors.sageDeep;
  const drops = Math.max(0, Math.min(3, Math.round(graceRemaining)));
  const dropSize = Math.max(4, size * 0.12);
  return (
    <Mark style={[styles.sprigWrap, { width: size, height: size }, style]}>
      {resetDay ? (
        <View
          style={[
            styles.sprigHalo,
            {
              width: size * 0.78,
              height: size * 0.78,
              borderRadius: size * 0.39,
              borderColor: withAlpha(colors.noticeDeep, 0.45),
            },
          ]}
        />
      ) : null}
      {/* Soil line — every state grows from real ground. */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.08,
          top: soilTop,
          width: size * 0.84,
          height: 1,
          backgroundColor: colors.rule,
        }}
      />
      {resetDay ? (
        <View
          style={{
            position: 'absolute',
            left: size * 0.36,
            top: soilTop - size * 0.1,
            width: size * 0.28,
            height: size * 0.2,
            borderRadius: size,
            backgroundColor: colors.sageDeep,
            transform: [{ rotate: '-18deg' }],
          }}
        />
      ) : (
        <Plant stage={stage} size={size} color={color} hollow={inGrace} soilTop={soilTop} />
      )}
      {inGrace && !resetDay
        ? Array.from({ length: 3 }).map((_, i) => {
            const filled = i < drops;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: size * 0.5 - dropSize * 1.9 + i * dropSize * 1.25,
                  top: soilTop + size * 0.05,
                  width: dropSize,
                  height: dropSize,
                  borderRadius: dropSize / 2,
                  backgroundColor: filled ? colors.noticeDeep : 'transparent',
                  borderWidth: filled ? 0 : 1,
                  borderColor: withAlpha(colors.noticeDeep, 0.5),
                }}
              />
            );
          })
        : null}
    </Mark>
  );
}

// ---------------------------------------------------------------------------
// Wave 2 — the peak moments (§3.3 Quest · §3.4 Glimpse · §4.3 level-up overlay)
// ---------------------------------------------------------------------------

/**
 * The ambient tick ring (§3.4.1; the same device rings the Quest pause digits,
 * §3.3.3). Ticks are radial hairlines: `lit` of them wear the focus hue and the
 * rest stay `rule` — a soft clock, never a dial with a deadline. Static: it
 * redraws from real elapsed seconds, and nothing here breathes or pulses.
 */
export function TickRing({
  lit,
  total,
  size,
  radius,
  tick = 3,
  color,
  trackColor = colors.rule,
  style,
}: {
  lit: number;
  total: number;
  size: number;
  radius: number;
  tick?: number;
  color: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const center = size / 2;
  const on = Math.max(0, Math.min(total, Math.round(lit)));
  const ticks = [];
  for (let i = 0; i < total; i += 1) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle) - tick * 0.5;
    const y = center + radius * Math.sin(angle) - tick * 1.3;
    ticks.push(
      <View
        key={i}
        style={[
          styles.tickBar,
          {
            left: x,
            top: y,
            width: tick,
            height: tick * 2.6,
            backgroundColor: i < on ? color : trackColor,
            transform: [{ rotate: `${(i / total) * 360}deg` }],
          },
        ]}
      />,
    );
  }
  return <Mark style={[styles.tickRing, { width: size, height: size }, style]}>{ticks}</Mark>;
}

/**
 * The kept seal (§3.3.4 quest done, §3.4 sage settle): a calm ring holding the
 * drawn check. Sage = kept, gold = value. No trophy, no number, no score.
 */
export function KeptSeal({
  size = 56,
  tone = 'sage',
  style,
}: {
  size?: number;
  tone?: 'sage' | 'gold';
  style?: StyleProp<ViewStyle>;
}) {
  const ink = tone === 'sage' ? colors.sageDeep : colors.goldDeep;
  const fill = tone === 'sage' ? colors.sageTint : colors.goldTint;
  return (
    <Mark
      style={[
        styles.keptSeal,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          borderColor: withAlpha(ink, 0.35),
        },
        style,
      ]}
    >
      <CheckMark size={size * 0.34} color={ink} stroke={Math.max(2, size * 0.05)} />
    </Mark>
  );
}

/**
 * A small stem that gains a leaf (§3.3.4 "a small stem that gains one leaf on
 * completion", §3.4.2 "a bud at the ring's base that gains a leaf on save").
 * `leaves` is the honest count actually drawn: the art never disagrees with how
 * many times the thing has really been kept.
 */
export function StemMark({
  leaves = 1,
  bud = false,
  size = 30,
  color = colors.sageDeep,
  soil = colors.rule,
  style,
}: {
  leaves?: number;
  bud?: boolean;
  size?: number;
  color?: string;
  soil?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const stemW = Math.max(1.8, size * 0.075);
  const soilTop = size * 0.9;
  const leafSize = size * 0.42;
  const budSize = size * 0.24;
  const count = Math.max(0, Math.floor(leaves));
  return (
    <Mark style={[{ width: size, height: size }, style]}>
      {/* Soil line — the same ground every stage in this app grows from. */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.14,
          top: soilTop,
          width: size * 0.72,
          height: 1,
          backgroundColor: soil,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: (size - stemW) / 2,
          top: size * 0.3,
          width: stemW,
          height: Math.max(1, soilTop - size * 0.3),
          borderRadius: stemW / 2,
          backgroundColor: color,
        }}
      />
      {Array.from({ length: count }).map((_, i) => {
        const right = i % 2 === 1;
        return (
          <Leaf
            key={i}
            size={leafSize}
            color={color}
            rotate={right ? 26 : -26}
            style={{
              position: 'absolute',
              left: right ? size * 0.5 + leafSize * 0.08 : size * 0.5 - leafSize * 1.08,
              top: size * (0.4 + i * 0.26),
            }}
          />
        );
      })}
      {bud ? (
        <View
          style={{
            position: 'absolute',
            left: (size - budSize) / 2,
            top: size * 0.3 - budSize * 0.5,
            width: budSize,
            height: budSize,
            borderRadius: budSize / 2,
            borderWidth: 1,
            borderColor: color,
            backgroundColor: withAlpha(color, 0.35),
          }}
        />
      ) : null}
    </Mark>
  );
}

/**
 * The light bloom that replaces confetti (§4.3, owner decision). One soft
 * opacity fade — ~900ms, no loop, no particles, no sound — and under Reduce
 * Motion the light is simply already there, so nothing moves at all.
 * Layered translucent discs stand in for a gradient (no dependency): the
 * stacked alphas fall off toward the edge so the bloom has no hard rim.
 */
export const BLOOM_MS = 900;
/** Concentric discs: outermost first. Alpha per disc, not per animation. */
export const BLOOM_LAYERS: readonly { scale: number; alpha: number }[] = [
  { scale: 1, alpha: 0.05 },
  { scale: 0.72, alpha: 0.06 },
  { scale: 0.46, alpha: 0.07 },
  { scale: 0.24, alpha: 0.08 },
];

export function LightBloom({
  color = colors.goldBright,
  size = 620,
  style,
}: {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    const settle = () => anim.setValue(1);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!active) return;
        // Reduce Motion (§4.3): no animation — the light is simply present.
        if (reduce) {
          settle();
          return;
        }
        Animated.timing(anim, {
          toValue: 1,
          duration: BLOOM_MS,
          useNativeDriver: true,
        }).start();
      })
      .catch(() => settle());
    return () => {
      active = false;
    };
  }, [anim]);
  return (
    <Mark style={[styles.bloomField, style]}>
      {BLOOM_LAYERS.map((layer) => {
        const d = size * layer.scale;
        return (
          <Animated.View
            key={layer.scale}
            style={[
              styles.bloomLayer,
              {
                width: d,
                height: d,
                borderRadius: d / 2,
                backgroundColor: color,
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, layer.alpha],
                }),
              },
            ]}
          />
        );
      })}
    </Mark>
  );
}

/**
 * The level-up overlay (§4.3, Flow D peak moment) — full-screen, one wash of
 * light, one CTA. ALL copy arrives as props from the screen (the level title,
 * the blessing verbatim, the tier note, the dismiss label), so this file never
 * invents a word of product copy.
 */
export function LevelUpOverlay({
  level,
  title,
  blessing,
  tierNote,
  dismissLabel,
  onDismiss,
  style,
}: {
  level: number;
  title: string;
  blessing: string;
  tierNote: string;
  dismissLabel: string;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.overlayRoot, style]}>
      <LightBloom />
      <View style={[badges.chip, badges.gold, styles.overlayChip]}>
        <Text style={[badges.chipText, badges.goldText]}>LEVEL {level}</Text>
      </View>
      <StageGlyph
        stage={stageForLevel(level)}
        size={120}
        color={colors.sageDeep}
        style={styles.overlayGlyph}
      />
      <Ornament ruleColor={withAlpha(colors.goldBright, 0.6)} style={styles.overlayOrnament} />
      <Text style={styles.overlayTitle}>{title}</Text>
      <Text style={styles.overlayBlessing}>{blessing}</Text>
      <Text style={styles.overlayTierNote}>{tierNote}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed }) => [buttons.ghost, styles.overlayBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>{dismissLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ornamentRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
  },
  ornamentFlex: {
    flex: 1,
  },
  ornamentStar: {
    fontSize: 11,
    color: colors.goldBright,
  },
  glyphRoot: {
    position: 'absolute',
    width: 1.6,
    height: 8,
    borderRadius: 1,
    transform: [{ rotate: '22deg' }],
  },
  seal: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.rule,
    backgroundColor: colors.card,
  },
  sealLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vineLive: {
    flex: 1,
    height: 14,
  },
  vineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.sand,
  },
  vineTrack: {
    position: 'absolute',
    left: 0,
    top: 5,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.sageMark,
  },
  vineMark: {
    position: 'absolute',
    top: 0,
    marginLeft: -6,
  },
  vineBud: {
    position: 'absolute',
    top: 1,
    borderWidth: 1.5,
    borderColor: colors.sageMark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vineGate: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  vineGateMark: {
    flex: 1,
    height: 5,
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
  },
  sprigWrap: {
    position: 'relative',
  },
  sprigHalo: {
    position: 'absolute',
    left: '11%',
    top: '11%',
    backgroundColor: colors.noticeTint,
    borderWidth: 1,
  },
  // --- Wave 2 (peak moments) ------------------------------------------------
  tickRing: {
    position: 'relative',
  },
  tickBar: {
    position: 'absolute',
    borderRadius: 1,
  },
  keptSeal: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bloomField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomLayer: {
    position: 'absolute',
  },
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overlayChip: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  overlayGlyph: {
    marginBottom: spacing.xs,
  },
  overlayOrnament: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  overlayTitle: {
    fontFamily: serifFamily,
    fontSize: 34,
    lineHeight: 40,
    color: colors.goldDeep,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  overlayBlessing: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 27,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  overlayTierNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  overlayBtn: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.88,
  },
});
