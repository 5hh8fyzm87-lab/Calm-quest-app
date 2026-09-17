/**
 * Calm Quest — Onboarding (Flow A, feature spec §2).
 *
 * One screen, ≈60s, no account wall. Warm hero copy, then path selection:
 * Christian Mindset preselected and featured; Entrepreneur + Anxiety shown
 * as disabled "Coming soon" rows (tap → gentle note via Alert). One "Begin"
 * CTA saves the profile (`path: 'christian'`, `onboarded: true`) through the
 * existing AsyncStorage store and navigates to Home.
 *
 * Guardrails: no medical claims, no guaranteed outcomes, no scarcity/urgency.
 *
 * Visual-Richness wave 3 (§3.1): the dawn hero band (one purpose-gold wash, a
 * horizon hairline behind the badge, a drawn sprout above the serif-32
 * headline), path rows with real visual grammar — live = `card` surface + 3px
 * teal left edge + `tealTint` glyph disc + the gold chip, coming-soon = `sand`
 * fill + outline-only glyph + the visible "Coming soon" chip at FULL `inkSoft`
 * opacity (the old `opacity: 0.62` jail failed 4.5:1 and is gone) — and the
 * fine print as a vellum note with a hairline left rule. Presentation only:
 * the flow, the storage path, the alert copy and every approved string are
 * untouched.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import { PATH_LABELS } from '../content';
import { loadState, saveState } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  badges,
  buttons,
  cards,
  colors,
  ComingSoonChip,
  page,
  radii,
  shadows,
  spacing,
  Sprout,
  themeAccents,
  typeScale,
  useScreenInsets,
  Wash,
} from '../theme';

const HERO_COPY =
  'Faith-first mindset training, made playful. One gentle quest a day — miss a day and you pick up right where you left off.';

/**
 * The one approved copy addition of this wave (visual-direction §3.1.2 /
 * §5 rule 10): the visible chip on the disabled rows, which restores the
 * spec's Flow A step 2 wording. Nothing else on this screen is new text.
 */
const COMING_SOON_LABEL = 'Coming soon';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Onboarding'>;

/**
 * A path row: featured Christian (preselected, live today) + disabled
 * coming-soon rows. Availability is expressed by the FILL and the glyph's
 * weight — never by an opacity jail over the label (§1c).
 */
function PathRow({
  label,
  badge,
  live,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  badge?: string;
  live?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pathRow,
        live ? styles.pathRowLive : styles.pathRowSoon,
        pressed && !disabled && styles.pathRowPressed,
      ]}
    >
      {/* Glyph disc: teal-tint + solid sprout when live, card + outline-only
          sprout when the path is not here yet. */}
      <View style={[styles.pathGlyph, live ? styles.pathGlyphLive : styles.pathGlyphSoon]}>
        <Sprout size={18} color={live ? colors.tealDeep : colors.inkSoft} hollow={!live} />
      </View>

      <View style={styles.pathRowLeft}>
        <Text style={[styles.pathLabel, disabled && styles.textDisabled]}>{label}</Text>
        {badge ? (
          <View style={[badges.chip, badges.gold]}>
            <Text style={[badges.chipText, badges.goldText]}>{badge}</Text>
          </View>
        ) : null}
        {disabled ? <ComingSoonChip label={COMING_SOON_LABEL} /> : null}
      </View>

      {/* A disabled row is not an unselected choice, so it draws no radio —
          the sand fill, the outline glyph and the chip already say "not yet".
          Its a11y state (role `radio`, disabled) is unchanged. */}
      {disabled ? null : (
        <View style={[styles.radio, live && styles.radioLive]}>
          {live ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  // Safe-area fix: additive device inset on top of the design padding.
  const screenInsets = useScreenInsets(spacing.xl, spacing.xl);
  const [busy, setBusy] = useState(false);

  // Christian is preselected per Flow A step 2; the other rows are disabled.
  const path: AppState['profile']['path'] = 'christian';

  async function begin() {
    if (busy) return;
    setBusy(true);
    try {
      const state = await loadState();
      const next: AppState = {
        ...state,
        profile: { ...state.profile, path, onboarded: true },
      };
      await saveState(next);
      navigation.navigate('Home');
    } catch {
      Alert.alert(
        'Could not save your choice',
        'Your path is stored on this device — please try again.',
      );
      setBusy(false);
    }
  }

  function comingSoon(label: string) {
    Alert.alert(
      `${label} is coming soon`,
      'This path is on the way. For now, Christian Mindset is where the quests are — and it is yours for free.',
      [{ text: 'Sounds good' }],
    );
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container, screenInsets]}
    >
      {/* Dawn hero band — one purpose-gold wash, a horizon hairline behind the
          badge, a drawn sprout above the serif headline. */}
      <View style={styles.heroBand}>
        <Wash color={themeAccents.purpose.wash} size={320} opacity={0.9} style={styles.heroWash} />
        <View style={styles.heroBadgeRow}>
          {/* Dawn horizon — decoration: invisible to assistive tech, transparent
              to touches (the same contract every drawn mark in motifs.tsx keeps). */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.heroHorizon}
          />
          <View style={[badges.chip, badges.gold]}>
            <Text style={[badges.chipText, badges.goldText]}>CALM QUEST</Text>
          </View>
        </View>
        <Sprout size={26} color={colors.goldDeep} style={styles.heroSprout} />
        <Text style={[typeScale.displayLg, styles.heroTitle]}>
          A calmer day,{'\n'}one small quest at a time.
        </Text>
        <Text style={styles.heroCopy}>{HERO_COPY}</Text>
      </View>

      {/* Path selection */}
      <View style={styles.sectionHead}>
        <Text style={cards.label}>Choose your path</Text>
        <Text style={styles.sectionHint}>You can change this anytime.</Text>
      </View>

      <PathRow
        label="Christian Mindset"
        badge="You're in the right place"
        live
        selected
        onPress={() => {
          // Preselected; tapping keeps it — navigation begins below.
        }}
      />
      <PathRow
        label={PATH_LABELS.entrepreneur}
        disabled
        onPress={() => comingSoon(PATH_LABELS.entrepreneur)}
      />
      <PathRow
        label={PATH_LABELS.anxiety_stress}
        disabled
        onPress={() => comingSoon(PATH_LABELS.anxiety_stress)}
      />

      {/* Fine print as a vellum note with a hairline left rule. */}
      <View style={styles.finePrint}>
        <Text style={styles.finePrintText}>
          No account needed. Everything is saved on your device until you choose
          to create one.
        </Text>
      </View>

      {/* CTA — quiet and single, with a hairline and space above the hint. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={begin}
        style={({ pressed }) => [buttons.primary, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>{busy ? 'Getting ready…' : 'Begin'}</Text>
      </Pressable>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.ctaRule}
      />
      <Text style={styles.skipHint}>About a minute — no signup, no rush.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroBand: {
    // No fixed height: the band grows with Dynamic Type (the art never clips
    // the headline), and its single wash is clipped to the band.
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroWash: {
    top: -70,
    left: -80,
  },
  heroBadgeRow: {
    position: 'relative',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroHorizon: {
    // The horizon: a hairline that runs the width of the band and passes
    // behind the badge (which masks it, so it reads as a dawn horizon).
    position: 'absolute',
    left: -spacing.lg,
    right: -spacing.lg,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
  },
  heroSprout: {
    marginTop: spacing.xs,
  },
  heroTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  sectionHead: {
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pathRowLive: {
    // Live path: a card surface with a 3px teal left edge.
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  pathRowSoon: {
    // Coming soon: sand fill, full-opacity ink, no opacity jail (§1c).
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.paperEdge,
  },
  pathRowPressed: {
    opacity: 0.9,
  },
  pathGlyph: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pathGlyphLive: {
    backgroundColor: colors.tealTint,
  },
  pathGlyphSoon: {
    backgroundColor: colors.card,
  },
  pathRowLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  pathLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  textDisabled: {
    // FULL `inkSoft` opacity — the fill and the glyph weight carry "not yet".
    color: colors.inkSoft,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioLive: {
    borderColor: colors.teal,
  },
  radioDot: {
    width: 13,
    height: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.teal,
  },
  finePrint: {
    marginVertical: spacing.md,
    backgroundColor: colors.vellum,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.rule,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  finePrintText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.88,
  },
  ctaRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  skipHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkSoft,
  },
});
