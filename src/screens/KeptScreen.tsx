/**
 * Calm Quest — "Kept" (build 13, proposal §2 items A and D).
 *
 * Two sections on one quiet screen:
 *  - MY GLIMPSES — the archive the paywall has been promising ("plus your whole
 *    archive") since build 9. Every kept glimpse, newest first, grouped by
 *    month, each one the date + the prompt it answered + the user's own line in
 *    the serif reading voice on a vellum plate. Tapping one re-opens it
 *    read-only. FREE reads the LAST 7 and is told, in a gold line, how many
 *    more are beyond — no padlock, nothing dimmed, nothing lost. Calm Quest+
 *    reads the whole archive.
 *  - SAVED AFFIRMATIONS — the other half of what the app stores and never
 *    showed: `state.savedAffirmationIds` as vellum cards grouped by theme, each
 *    with a small drawn leaf. NEVER GATED — a user's own kept words are not a
 *    subscription feature, and this screen says so in one line.
 *
 * The iron rule for every surface here: **zero XP**. Browsing, re-reading and
 * looking at what you kept is not practice. Nothing on this screen writes to
 * storage, credits a streak, touches the daily loop, or fires analytics — it
 * only reads (see src/keepsakes/keepsakes.ts).
 *
 * Presentation follows docs/VISUAL.md: one hue for the glimpse family
 * (gratitude amber paint, `deep` for ink), sage for what is kept, gold for the
 * value/invitation family, no wash, no motion, no red, no emoji chrome.
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { KeepsakePlate } from '../components/KeepsakePlate';
import { PlusInvitation } from '../components/PlusInvitation';
import { pickToday, prompts } from '../content';
import {
  archiveView,
  dayLabel,
  promptTextFor,
  savedAffirmations,
  savedByTheme,
} from '../keepsakes/keepsakes';
import type { GlimpseEntry } from '../models/types';
import type { AppRouteParamList } from '../navigation/types';
import { loadState } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  buttons,
  cards,
  colors,
  KeptSeal,
  Leaf,
  page,
  radii,
  SectionHead,
  serifFamily,
  spacing,
  StemMark,
  themeAccents,
  typeScale,
  useScreenInsets,
} from '../theme';
import { localDateString } from '../utils/daily';

// --- COPY (build 13) — mirrored verbatim in NEW_STRINGS.md ---
const COPY = {
  title: 'Kept',
  back: '‹ Back',
  loading: 'Loading what you have kept…',
  glimpsesSection: 'MY GLIMPSES',
  keptCount: (n: number) => `${n} kept`,
  openHint: 'Opens it for reading. Nothing here changes.',
  gateOne: 'One more is part of Calm Quest+ — nothing you kept is lost.',
  gateMany: (n: number) => `The other ${n} are part of Calm Quest+ — nothing you kept is lost.`,
  glimpsesEmptyTitle: 'Nothing kept here yet',
  glimpsesEmpty:
    'Your first kept glimpse lands here — one good thing, however small.',
  glimpsesEmptyCta: 'Take today’s glimpse',
  affirmationsSection: 'SAVED AFFIRMATIONS',
  savedCount: (n: number) => `${n} saved`,
  affirmationsNote: 'These stay free — what you keep is yours.',
  affirmationsEmptyTitle: 'No affirmations saved yet',
  affirmationsEmpty: 'Save today’s affirmation and it will wait here for you.',
  readingNote: 'Kept as you wrote it. Reading it changes nothing.',
  readingBack: 'Back to everything kept',
};
// --- /COPY ---

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Kept'>;

/** The glimpse family's one hue (§1b): amber paint, amber `deep` for ink. */
const GLIMPSE_ACCENT = themeAccents.gratitude;

// ---------------------------------------------------------------------------
// A — the archive
// ---------------------------------------------------------------------------

/**
 * The kept-glimpses archive. Hooks-free: the screen passes the persisted state
 * in, so the proof suite can invoke it and walk exactly what a user sees at
 * each tier and at each ledger size.
 */
export function GlimpseArchive({
  state,
  onOpen,
  onSeePlus,
  onTakeGlimpse,
}: {
  state: Pick<AppState, 'glimpses' | 'entitlements'>;
  onOpen: (entry: GlimpseEntry) => void;
  onSeePlus: () => void;
  /** Only provided when today's prompt resolves — never a fabricated link. */
  onTakeGlimpse?: () => void;
}) {
  const view = archiveView(state);

  return (
    <View>
      <SectionHead label={COPY.glimpsesSection} style={styles.sectionHead} />
      {view.total > 0 ? (
        <>
          {/* The real count of everything on this device — not the visible slice. */}
          <Text style={styles.count}>{COPY.keptCount(view.total)}</Text>
          {view.groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.month}>{group.label}</Text>
              {group.entries.map((entry) => {
                const prompt = promptTextFor(entry);
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityHint={COPY.openHint}
                    onPress={() => onOpen(entry)}
                    style={({ pressed }) => [styles.entryCard, pressed && styles.pressed]}
                  >
                    <Text style={typeScale.smallCaps}>{dayLabel(entry.date)}</Text>
                    {prompt ? <Text style={styles.entryPrompt}>{`“${prompt}”`}</Text> : null}
                    <KeepsakePlate text={entry.text} accent={GLIMPSE_ACCENT.accent} />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {view.gated ? (
            <PlusInvitation
              line={view.hidden === 1 ? COPY.gateOne : COPY.gateMany(view.hidden)}
              onPress={onSeePlus}
              style={styles.gate}
            />
          ) : null}
        </>
      ) : (
        <View style={[cards.card, styles.emptyCard]}>
          <KeptSeal size={48} tone="sage" style={styles.emptyMark} />
          <Text style={styles.emptyTitle}>{COPY.glimpsesEmptyTitle}</Text>
          <Text style={styles.emptyText}>{COPY.glimpsesEmpty}</Text>
          {onTakeGlimpse ? (
            <Pressable
              accessibilityRole="button"
              onPress={onTakeGlimpse}
              style={({ pressed }) => [buttons.ghost, styles.emptyCta, pressed && styles.pressed]}
            >
              <Text style={buttons.ghostText}>{COPY.glimpsesEmptyCta}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// D — saved affirmations (never gated)
// ---------------------------------------------------------------------------

/**
 * The saved-affirmation collection: vellum cards grouped by theme, each marked
 * with the same small drawn leaf the theme rows use. Ungated at every tier —
 * and the note under it says so as a fact, not as a favour.
 */
export function AffirmationCollection({ state }: { state: Pick<AppState, 'savedAffirmationIds'> }) {
  const groups = savedByTheme(state);
  const total = savedAffirmations(state).length;

  return (
    <View>
      <SectionHead label={COPY.affirmationsSection} style={styles.sectionHead} />
      {total > 0 ? (
        <>
          <Text style={styles.count}>{COPY.savedCount(total)}</Text>
          {groups.map((group) => (
            <View key={group.theme} style={styles.group}>
              <Text style={styles.themeLabel}>{group.label}</Text>
              {group.items.map((item) => (
                <View key={item.id} style={styles.affirmCard}>
                  <Leaf size={12} color={colors.sageMark} rotate={-28} style={styles.leaf} />
                  <Text style={styles.affirmText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.note}>{COPY.affirmationsNote}</Text>
        </>
      ) : (
        <View style={[cards.card, styles.emptyCard]}>
          <Leaf size={20} color={colors.sageMark} rotate={-28} style={styles.emptyMark} />
          <Text style={styles.emptyTitle}>{COPY.affirmationsEmptyTitle}</Text>
          <Text style={styles.emptyText}>{COPY.affirmationsEmpty}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Re-opening one kept glimpse: read-only, and it stays that way
// ---------------------------------------------------------------------------

/**
 * A kept glimpse, re-opened. The same keepsake card the Glimpse flow shows on
 * completion — kept seal, the prompt it answered, the entry on vellum, the stem
 * that gained its leaf — with one honest line and one way back. There is no
 * edit affordance, no delete, no share, and no XP: reading is reading.
 */
export function KeptReading({ entry, onBack }: { entry: GlimpseEntry; onBack: () => void }) {
  const prompt = promptTextFor(entry);
  return (
    <View style={[cards.card, styles.readingCard]}>
      <KeptSeal size={56} tone="sage" style={styles.emptyMark} />
      <Text style={typeScale.smallCaps}>{dayLabel(entry.date)}</Text>
      {prompt ? <Text style={styles.readingPrompt}>{`“${prompt}”`}</Text> : null}
      <KeepsakePlate text={entry.text} accent={GLIMPSE_ACCENT.accent} style={styles.readingPlate} />
      <StemMark leaves={1} bud size={30} color={colors.sageDeep} style={styles.readingMark} />
      <Text style={styles.readingNote}>{COPY.readingNote}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [buttons.ghost, styles.readingBack, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>{COPY.readingBack}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function KeptScreen() {
  const navigation = useNavigation<Nav>();

  // Safe-area fix: additive device insets on top of the design padding.
  const screenInsets = useScreenInsets(spacing.lg, spacing.xl);
  const today = localDateString();
  const [state, setState] = useState<AppState | null>(null);
  // The one piece of screen state: which kept glimpse is open for reading.
  const [open, setOpen] = useState<GlimpseEntry | null>(null);

  // Re-read the persisted ledgers on every focus, so a glimpse kept while this
  // screen is in the stack shows up the moment it comes back to the front.
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

  const prompt = pickToday(prompts, today);

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

      {state === null ? (
        <Text style={cards.subtitle}>{COPY.loading}</Text>
      ) : open ? (
        <KeptReading entry={open} onBack={() => setOpen(null)} />
      ) : (
        <>
          <GlimpseArchive
            state={state}
            onOpen={setOpen}
            onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
            onTakeGlimpse={
              prompt ? () => navigation.navigate('Glimpse', { promptId: prompt.id }) : undefined
            }
          />
          <AffirmationCollection state={state} />
        </>
      )}
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
  count: {
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  group: {
    marginBottom: spacing.sm,
  },
  month: {
    fontFamily: serifFamily,
    fontSize: 17,
    lineHeight: 24,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  entryPrompt: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  gate: {
    marginTop: spacing.xs,
  },
  affirmCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.vellum,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  leaf: {
    marginTop: 5,
  },
  affirmText: {
    flex: 1,
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sageDeep,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyMark: {
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  readingCard: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  readingPrompt: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 25,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  readingPlate: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
  readingMark: {
    marginTop: spacing.md,
  },
  readingNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  readingBack: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.paperEdge,
  },
  pressed: {
    opacity: 0.88,
  },
});
