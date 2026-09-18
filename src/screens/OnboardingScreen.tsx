/**
 * Calm Quest — Onboarding (Flow A, feature spec §2).
 *
 * One screen, ≈60s, no account wall. Warm hero copy, then path selection:
 * three REAL program rows (Christian Mindset preselected, the others a tap
 * away), one "Begin" CTA that saves the profile (`path: <the chosen program>`,
 * `onboarded: true`) through the existing AsyncStorage store and navigates to
 * Home.
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
 *
 * Build 14 (two-paths §2, Flow A): the two "coming soon" rows became REAL
 * radio rows. All three programs are live, one is selected, the "Coming soon"
 * chip and its alert retire (3 strings, listed as retired in NEW_STRINGS.md),
 * the approved badge "You're in the right place" moves from the hardcoded row
 * to the SELECTED row, each row gains one one-liner (draft copy for the copy
 * pass), and `Begin` writes the path the user actually chose instead of a
 * hardcoded 'christian'. The row grammar is unchanged — the selected row wears
 * the live pair (card + 3px teal edge + tealTint glyph + filled sprout + the
 * dotted radio), an unselected row wears the sand pair with the hollow sprout
 * and an empty radio. The existing hint "You can change this anytime." is
 * finally, literally true (Settings → YOUR PROGRAM, or Home's PROGRAMS card).
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import { analytics } from '../analytics';
import { PATH_LABELS, PATH_ORDER } from '../content';
import type { PathId } from '../models/types';
import { loadState, saveState } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  badges,
  buttons,
  cards,
  colors,
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

// --- COPY (build 14) — mirrored verbatim in NEW_STRINGS.md ---
/**
 * The approved badge, lifted verbatim from the hardcoded Christian row: it now
 * belongs to whichever row is SELECTED, which is what it always meant.
 */
const RIGHT_PLACE_BADGE = "You're in the right place";

/**
 * One one-liner per program row (build 14, Flow A). DRAFT COPY for the owner's
 * copy pass — each says what the program is for in the app's own voice, with no
 * medical or outcome claim (the Peace & Rest one stays inside the program's
 * guardrails: everyday language only, promise the practice, never the result).
 */
const PATH_ONE_LINERS: Record<PathId, string> = {
  christian: 'Scripture-aligned quests, affirmations and gentle reflection.',
  entrepreneur: 'The same daily practice, for the life of building something.',
  anxiety_stress: 'Comfort and quiet for the heavy days, at the pace you can keep.',
};
// --- /COPY ---

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Onboarding'>;

/**
 * A path row: three real radio rows now (build 14) — availability and state are
 * carried by the FILL, the glyph's weight and the radio, never by an opacity
 * jail over the label (§1c).
 */
function PathRow({
  label,
  sub,
  badge,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={sub}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pathRow,
        selected ? styles.pathRowLive : styles.pathRowSoon,
        pressed && styles.pathRowPressed,
      ]}
    >
      {/* Glyph disc: teal-tint + solid sprout on the selected row, card +
          outline-only sprout on a row you have not chosen. */}
      <View style={[styles.pathGlyph, selected ? styles.pathGlyphLive : styles.pathGlyphSoon]}>
        <Sprout size={18} color={selected ? colors.tealDeep : colors.inkSoft} hollow={!selected} />
      </View>

      <View style={styles.pathRowLeft}>
        <Text style={[styles.pathLabel, !selected && styles.textUnselected]}>{label}</Text>
        <Text style={styles.pathSub}>{sub}</Text>
        {badge ? (
          <View style={[badges.chip, badges.gold]}>
            <Text style={[badges.chipText, badges.goldText]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {/* Every row is a real choice now, so every row draws its radio. */}
      <View style={[styles.radio, selected && styles.radioLive]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();

  // Safe-area fix: additive device inset on top of the design padding.
  const screenInsets = useScreenInsets(spacing.xl, spacing.xl);
  const [busy, setBusy] = useState(false);

  // Christian is preselected per Flow A step 2; all three rows are live and the
  // badge follows the selection (build 14).
  const [path, setPath] = useState<PathId>('christian');

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
      // Build 14 (S5): the FIRST program choice, tracked only after the choice
      // was actually persisted — never on a tap that failed to save.
      analytics.track('program_selected', { path });
      navigation.navigate('Home');
    } catch {
      Alert.alert(
        'Could not save your choice',
        'Your path is stored on this device — please try again.',
      );
      setBusy(false);
    }
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

      {/* Path selection — three real rows (build 14). The approved badge marks
          the SELECTED row, and every row is a choice you can take. */}
      <View style={styles.sectionHead}>
        <Text style={cards.label}>Choose your path</Text>
        <Text style={styles.sectionHint}>You can change this anytime.</Text>
      </View>

      {PATH_ORDER.map((option) => (
        <PathRow
          key={option}
          label={PATH_LABELS[option]}
          sub={PATH_ONE_LINERS[option]}
          badge={path === option ? RIGHT_PLACE_BADGE : undefined}
          selected={path === option}
          onPress={() => setPath(option)}
        />
      ))}

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
    // Unselected row: sand fill, full-opacity ink, no opacity jail (§1c).
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
  /** The one-line "what this program is for", under the row's label. */
  pathSub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  textUnselected: {
    // FULL `inkSoft` opacity — the fill and the glyph weight carry "not chosen".
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
