/**
 * Calm Quest — "Sit with a verse" (build 13, proposal §2 item I).
 *
 * An unlimited, zero-XP reading surface over the 60 WEB verses already bundled
 * in the app. Nothing here is a task: there is no completion tap, no timer, no
 * streak interaction, no XP, and nothing to finish. The screen shows a verse in
 * a large vellum plate WITH its attribution (the model's rule: never render a
 * verse without one), one line of quiet guidance, an honest count of what this
 * tier may read, and a list you can browse.
 *
 * The shelf (src/content/verseSets.ts):
 *  - FREE: today's verse + a FIXED evergreen set of ten. The set never rotates,
 *    never changes with the date and is not derived from anything — a treadmill
 *    of "daily verse content" is exactly what this product does not do, and the
 *    gold line under the count says so as a fact.
 *  - Calm Quest+: the whole library, with today's verse still marked in place.
 *
 * The count is unique-verses-shown over the real library size ("11 of 60"), so
 * it stays honest on the day the daily pick is also one of the evergreen ten.
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlusInvitation } from '../components/PlusInvitation';
import { verseShelf } from '../content/verseSets';
import type { VerseShelf } from '../content/verseSets';
import type { Verse } from '../models/types';
import type { AppRouteParamList } from '../navigation/types';
import { loadState } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  badges,
  buttons,
  cards,
  colors,
  page,
  radii,
  SectionHead,
  serifFamily,
  spacing,
  themeAccents,
  typeScale,
  useScreenInsets,
} from '../theme';
import { localDateString } from '../utils/daily';

// --- COPY (build 13) — mirrored verbatim in NEW_STRINGS.md ---
const COPY = {
  title: 'Sit with a verse',
  back: '‹ Back',
  sectionDay: 'TODAY’S VERSE',
  sectionChosen: 'A VERSE YOU CHOSE',
  guidance: 'Read it once, then once more — and let one word stay with you.',
  countLine: (shown: number, total: number) => `${shown} of ${total} verses`,
  gateLine:
    'The rest of the library is part of Calm Quest+ — the day’s verse and ten evergreen ones stay open.',
  browserSection: 'BROWSE THE VERSES',
  todayTag: 'today',
  backToToday: 'Back to today’s verse',
  libraryEmpty: 'The verse library is empty in this build.',
};
// --- /COPY ---

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Verse'>;

/**
 * The reading plate. `vellum` paper, a 3px gold-family rule (the app's
 * value/light hue — purpose shares the brand gold), the verse in the large
 * serif reading voice, its reference AND its full attribution line beneath.
 * The plate is the only hue on the screen; the invitation below adds gold tint,
 * which is the same family — never a third.
 */
export function VerseReading({ verse, guidance }: { verse: Verse; guidance: string }) {
  return (
    <View style={styles.plateCard}>
      <Text style={[typeScale.readingLg, styles.verseText]}>{verse.text}</Text>
      <Text style={[typeScale.smallCaps, styles.verseRef]}>
        {`${verse.reference} · ${verse.translation}`}
      </Text>
      <Text style={[typeScale.smallCaps, styles.verseAttribution]}>{verse.attribution}</Text>
      <Text style={styles.guidance}>{guidance}</Text>
    </View>
  );
}

/**
 * The browse list: every verse this tier may open, in reading order, with
 * today's marked. Hooks-free — the shelf arrives as a prop so the proof suite
 * can assert the count and the rows at both tiers without a device.
 */
export function VerseBrowser({
  shelf,
  onPick,
  onSeePlus,
  onBackToToday,
}: {
  shelf: VerseShelf;
  onPick: (verse: Verse) => void;
  onSeePlus: () => void;
  onBackToToday?: () => void;
}) {
  return (
    <View>
      <SectionHead label={COPY.browserSection} style={styles.sectionHead} />
      <Text style={styles.count}>{COPY.countLine(shelf.shown, shelf.total)}</Text>
      <View style={styles.list}>
        {shelf.list.map((verse) => (
          <Pressable
            key={verse.id}
            accessibilityRole="button"
            onPress={() => onPick(verse)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowRef}>{verse.reference}</Text>
            {verse.id === shelf.dayId ? (
              <View style={[badges.chip, badges.sand, styles.todayChip]}>
                <Text style={[badges.chipText, badges.sandText]}>{COPY.todayTag}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      {shelf.gated ? (
        <PlusInvitation line={COPY.gateLine} onPress={onSeePlus} style={styles.gate} />
      ) : null}
      {onBackToToday ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBackToToday}
          style={({ pressed }) => [buttons.ghost, styles.backToToday, pressed && styles.pressed]}
        >
          <Text style={buttons.ghostText}>{COPY.backToToday}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function SitWithVerseScreen() {
  const navigation = useNavigation<Nav>();

  // Safe-area fix: additive device insets on top of the design padding.
  const screenInsets = useScreenInsets(spacing.lg, spacing.xl);
  const today = localDateString();
  const [state, setState] = useState<AppState | null>(null);
  // The one piece of screen state: a verse the reader chose, if any.
  const [picked, setPicked] = useState<Verse | null>(null);

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

  const tier = state ? state.entitlements.tier : 'free';
  const shelf = verseShelf(tier, today);
  const open = picked ?? shelf.day;

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container, screenInsets]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>{COPY.back}</Text>
        </Pressable>
        <Text style={[typeScale.display, styles.title]}>{COPY.title}</Text>
        <View style={styles.backBtn} />
      </View>

      <SectionHead
        label={open && open.id === shelf.dayId ? COPY.sectionDay : COPY.sectionChosen}
        style={styles.sectionHead}
      />
      {open ? (
        <VerseReading verse={open} guidance={COPY.guidance} />
      ) : (
        <Text style={cards.subtitle}>{COPY.libraryEmpty}</Text>
      )}

      <VerseBrowser
        shelf={shelf}
        onPick={setPicked}
        onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
        onBackToToday={picked ? () => setPicked(null) : undefined}
      />
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
    marginBottom: spacing.lg,
  },
  backBtn: {
    minWidth: 72,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.tealDeep,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  sectionHead: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  plateCard: {
    backgroundColor: colors.vellum,
    borderLeftWidth: 3,
    borderLeftColor: themeAccents.purpose.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  verseText: {
    marginBottom: spacing.md,
  },
  verseRef: {
    color: colors.inkSoft,
  },
  verseAttribution: {
    color: colors.inkFaint,
    marginTop: 2,
  },
  guidance: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginTop: spacing.md,
  },
  count: {
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowRef: {
    flexShrink: 1,
    fontFamily: serifFamily,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  todayChip: {
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  gate: {
    marginTop: spacing.md,
  },
  backToToday: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.paperEdge,
  },
  pressed: {
    opacity: 0.88,
  },
});
