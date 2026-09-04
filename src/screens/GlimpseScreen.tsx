/**
 * Calm Quest — Gratitude Glimpse (feature spec §3 F3, Phase 2b ENTRY POINT).
 *
 * Phase 2c builds the full mini-game (60s progress ring, free-text, completion
 * → +20 XP + private archive). This screen ships the CARD it will grow into:
 * prompts rotate deterministically on Home; this stub shows today's prompt
 * honestly as "coming in the loop" with zero fake progress. No XP is awarded
 * here and nothing is persisted — the spec's no-fake-progress guardrail.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pickToday, prompts } from '../content';
import type { AppRouteParamList } from '../navigation/types';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';
import { localDateString } from '../utils/daily';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Glimpse'>;

export default function GlimpseScreen({ route }: { route: { params: { promptId: string } } }) {
  const navigation = useNavigation<Nav>();
  const today = localDateString();
  const prompt = pickToday(prompts, today) ?? prompts[0];

  return (
    <View style={[page.screen, styles.container]}>
      <View style={[cards.card, styles.card]}>
        <View style={[badges.chip, badges.sage, styles.badge]}>
          <Text style={[badges.chipText, badges.sageText]}>GRATITUDE GLIMPSE</Text>
        </View>
        <Text style={styles.title}>A grateful glance</Text>
        <Text style={styles.prompt}>{prompt.prompt}</Text>
        <Text style={styles.note}>
          The 60-second guided glimpse is coming in the loop — same gentle
          prompt, a soft ring, and your private archive. No XP is awarded on
          this stub; nothing is saved until the real screen ships.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [buttons.primary, pressed && styles.pressed]}
        >
          <Text style={buttons.primaryText}>Back to today</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  badge: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 27,
    color: colors.tealDeep,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  note: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
});