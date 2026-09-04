/**
 * Calm Quest — Onboarding (Flow A, feature spec §2).
 *
 * One screen, ≈60s, no account wall. Warm hero copy, then path selection:
 * Christian Mindset preselected and featured; Entrepreneur + Anxiety shown
 * as disabled "Coming soon" chips (tap → gentle note via Alert). One "Begin"
 * CTA saves the profile (`path: 'christian'`, `onboarded: true`) through the
 * existing AsyncStorage store and navigates to Home.
 *
 * Guardrails: no medical claims, no guaranteed outcomes, no scarcity/urgency.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import { PATH_LABELS } from '../content';
import { loadState, saveState } from '../storage/store';
import type { AppState } from '../storage/store';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';

const HERO_COPY =
  'Faith-first mindset training, made playful. One gentle quest a day — miss a day and you pick up right where you left off.';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Onboarding'>;

/** A path row: featured Christian (preselected) + disabled coming-soon rows. */
function PathRow({
  label,
  badge,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  badge?: string;
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
        selected && styles.pathRowSelected,
        disabled && styles.pathRowDisabled,
        pressed && !disabled && styles.pathRowPressed,
      ]}
    >
      <View style={styles.pathRowLeft}>
        <Text style={[styles.pathLabel, disabled && styles.textDisabled]}>{label}</Text>
        {badge ? (
          <View style={[badges.chip, selected && badges.gold]}>
            <Text style={[badges.chipText, selected && badges.goldText]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
          disabled && styles.radioDisabled,
        ]}
      >
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
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
      contentContainerStyle={[page.content, styles.container]}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[badges.chip, badges.gold, styles.heroBadge]}>
          <Text style={[badges.chipText, badges.goldText]}>CALM QUEST</Text>
        </View>
        <Text style={styles.heroTitle}>A calmer day,{'\n'}one small quest at a time.</Text>
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

      <View style={styles.finePrint}>
        <Text style={styles.finePrintText}>
          No account needed. Everything is saved on your device until you choose
          to create one.
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={begin}
        style={({ pressed }) => [buttons.primary, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>{busy ? 'Getting ready…' : 'Begin'}</Text>
      </Pressable>
      <Text style={styles.skipHint}>About a minute — no signup, no rush.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroBadge: {
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
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
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pathRowSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  pathRowDisabled: {
    opacity: 0.62,
  },
  pathRowPressed: {
    opacity: 0.9,
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
    marginLeft: spacing.sm,
  },
  radioSelected: {
    borderColor: colors.teal,
  },
  radioDisabled: {
    borderColor: colors.border,
  },
  radioDot: {
    width: 13,
    height: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.teal,
  },
  finePrint: {
    marginVertical: spacing.md,
    backgroundColor: colors.creamDeep,
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
  skipHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
});