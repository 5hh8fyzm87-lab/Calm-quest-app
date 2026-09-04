/**
 * Calm Quest — Home / Today (Flow B start, feature spec §2).
 *
 * The daily loop opens here: today's quest (1 Quest from the bundle via pure
 * date rotation), the Affirmation of the Day, and a grace-toned streak chip
 * from persisted state. Completion flow is Phase 2b — "Begin today's quest"
 * is a no-op stub for now.
 */

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  affirmations,
  CONTENT_COUNTS,
  CONTENT_META,
  pickToday,
  QUEST_TYPE_INTROS,
  QUEST_TYPE_LABELS,
  quests,
  THEME_LABELS,
  verses,
} from '../content';
import type { Quest, Verse } from '../models/types';
import { loadState } from '../storage/store';
import type { AppState } from '../storage/store';
import { streakMessage, streakStatus } from '../streaks/streak';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';
import { friendlyDate, localDateString } from '../utils/daily';

/** Finds a verse by id (bundle is small; a Map would be premature). */
function verseFor(verseId: string | undefined): Verse | undefined {
  if (!verseId) return undefined;
  return verses.find((v) => v.id === verseId);
}

function QuestCard({ quest }: { quest: Quest }) {
  const verse = verseFor(quest.verseId);
  return (
    <View style={[cards.card, styles.questCard]}>
      <View style={styles.chipRow}>
        <View style={[badges.chip, badges.sage]}>
          <Text style={[badges.chipText, badges.sageText]}>{THEME_LABELS[quest.theme]}</Text>
        </View>
        <View style={[badges.chip, styles.typeChip]}>
          <Text style={badges.chipText}>{QUEST_TYPE_LABELS[quest.type]}</Text>
        </View>
      </View>
      <Text style={cards.title}>{quest.title}</Text>
      <Text style={[cards.subtitle, styles.body]}>{bodyFor(quest)}</Text>
      {verse ? (
        <View style={styles.verseBox}>
          <Text style={styles.verseText}>{verse.text}</Text>
          <Text style={styles.verseRef}>
            {verse.reference} · {verse.translation}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          // Phase 2b: quest completion flow. Stub keeps the loop obvious.
        }}
        style={({ pressed }) => [buttons.primary, styles.beginBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>Begin today's quest</Text>
      </Pressable>
      <Text style={[cards.small, styles.xpHint]}>+50 XP on completion</Text>
    </View>
  );
}

/** Type-specific body copy (details shown "as appropriate per type"). */
function bodyFor(quest: Quest): string {
  switch (quest.type) {
    case 'read_reflect':
      return (
        quest.reflection ??
        'Sit with this verse and one word that stays with you.'
      );
    case 'act':
      return quest.actionPrompt ?? QUEST_TYPE_INTROS.act;
    case 'pause':
      return `${QUEST_TYPE_INTROS.pause} ${quest.durationSeconds ?? 60} seconds.`;
    case 'write':
      return quest.journalPrompt ?? QUEST_TYPE_INTROS.write;
  }
}

function AffirmationCard({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Tap to reveal today's affirmation"
      onPress={() => setRevealed((v) => !v)}
      style={({ pressed }) => [cards.card, styles.affirmCard, pressed && styles.pressed]}
    >
      <View style={styles.chipRow}>
        <View style={[badges.chip, badges.gold]}>
          <Text style={[badges.chipText, badges.goldText]}>AFFIRMATION OF THE DAY</Text>
        </View>
      </View>
      <Text style={styles.affirmText}>{revealed ? text : 'Tap to reveal'}</Text>
      <Text style={[cards.small, styles.affirmHint]}>
        {revealed ? 'Tap again to save it to your day (+5 XP) — coming in Phase 2b.' : 'A small word for today.'}
      </Text>
    </Pressable>
  );
}

function StreakChip({ state }: { state: AppState }) {
  const status = streakStatus(state.streak);
  const message = streakMessage(state.streak);
  return (
    <View
      style={[
        badges.chip,
        styles.streakChip,
        status === 'grace' && styles.streakChipGrace,
      ]}
    >
      <Text
        style={[
          badges.chipText,
          styles.streakChipText,
          status === 'grace' && styles.streakChipTextGrace,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const today = localDateString();
  const [state, setState] = useState<AppState | null>(null);

  // Reload persisted state whenever the screen gains focus — cheap and keeps
  // the chip/state fresh after later phases mutate the store.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadState().then((s) => {
        if (active) setState(s);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const quest = pickToday(quests, today);
  const affirmation = pickToday(affirmations, today);
  const friendly = friendlyDate();

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{friendly}</Text>
          <Text style={styles.headline}>Today's quest</Text>
        </View>
        {state ? <StreakChip state={state} /> : null}
      </View>

      {/* Today's quest */}
      {quest ? (
        <QuestCard quest={quest} />
      ) : (
        <Text style={cards.subtitle}>Quest library empty — nothing to show today.</Text>
      )}

      {/* Affirmation of the day */}
      {affirmation ? <AffirmationCard text={affirmation.text} /> : null}

      {/* Subtle Phase-1 proof footer */}
      <View style={styles.foot}>
        <Text style={[cards.small, styles.footText]}>{CONTENT_META.note}</Text>
        <Text style={[cards.small, styles.footText]}>
          {CONTENT_COUNTS.quests} quests · {CONTENT_COUNTS.affirmations} affirmations ·{' '}
          {CONTENT_COUNTS.prompts} prompts · {CONTENT_COUNTS.verses} verses ·{' '}
          {CONTENT_META.attribution}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tealDeep,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  questCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChip: {
    backgroundColor: colors.tealSoft,
  },
  body: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  verseBox: {
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  verseText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 23,
    color: colors.ink,
  },
  verseRef: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.inkSoft,
  },
  beginBtn: {
    marginTop: spacing.xs,
  },
  xpHint: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  affirmCard: {
    backgroundColor: colors.tealSoft,
    borderWidth: 1.5,
    borderColor: '#c9e0da',
  },
  affirmText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.tealDeep,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  affirmHint: {
    color: colors.inkSoft,
  },
  streakChip: {
    alignSelf: 'center',
    backgroundColor: colors.sageSoft,
    maxWidth: '60%',
  },
  streakChipGrace: {
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  streakChipText: {
    color: colors.sageDeep,
  },
  streakChipTextGrace: {
    color: colors.inkSoft,
  },
  foot: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  footText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});