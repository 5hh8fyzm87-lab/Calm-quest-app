/**
 * Calm Quest — the "Kept this week" strip (build 13, proposal §2 item H).
 *
 * The discovery door: one quiet card under the day's quest that shows up to
 * three real keeps — the newest kept glimpse, the most recently saved
 * affirmation, and the most recent completed quest — and one gold line into the
 * archive. Everything it renders is data the app already stores (see
 * src/keepsakes/keepsakes.ts); it writes nothing, grants nothing, and knows
 * nothing about XP.
 *
 * What it deliberately is not: no badges, no counters that could only go up, no
 * "new" markers, no feed, no scroll, and no second daily duty. A user who never
 * taps it loses nothing.
 *
 * Hooks-free on purpose — Home passes the loaded state in, and the proof suite
 * invokes it directly to walk the tree it draws.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { dayLabel, keptCounts, keptHighlights } from '../keepsakes/keepsakes';
import type { KeptHighlight } from '../keepsakes/keepsakes';
import type { AppState } from '../storage/store';
import { cards, colors, radii, SectionHead, serifFamily, spacing, typeScale } from '../theme';

// --- COPY (build 13) — mirrored verbatim in NEW_STRINGS.md ---
const COPY = {
  heading: 'KEPT THIS WEEK',
  glimpseLabel: 'a glimpse kept',
  affirmationLabel: 'an affirmation saved',
  questLabel: 'a quest completed',
  empty: 'Nothing kept yet. Your first glimpse, affirmation or completed quest lands here.',
  /** The real counts, all three ledgers, nothing summed into one number. */
  countsLine: (g: number, a: number, q: number) =>
    `${g} glimpses · ${a} affirmations · ${q} quests kept`,
  inviteFree: 'Everything you have kept',
  invitePlus: 'Your whole archive',
};
// --- /COPY ---

/** The small-caps dateline + what the row is. */
function metaFor(row: KeptHighlight): string {
  if (row.kind === 'glimpse') {
    return row.date ? `${dayLabel(row.date)} · ${COPY.glimpseLabel}` : COPY.glimpseLabel;
  }
  if (row.kind === 'quest') {
    return row.date ? `${dayLabel(row.date)} · ${COPY.questLabel}` : COPY.questLabel;
  }
  return COPY.affirmationLabel;
}

export function KeptThisWeekStrip({
  state,
  onOpenArchive,
  style,
}: {
  /** Real persisted state — the strip derives its rows, it is never told them. */
  state: Pick<AppState, 'glimpses' | 'savedAffirmationIds' | 'quests' | 'entitlements'>;
  /** Opens the Kept screen. For Calm Quest+ that is the whole archive. */
  onOpenArchive: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = keptHighlights(state);
  const counts = keptCounts(state);
  const invite = state.entitlements.tier === 'paid' ? COPY.invitePlus : COPY.inviteFree;

  return (
    <View style={[cards.card, styles.strip, style]}>
      <SectionHead label={COPY.heading} />
      {rows.length > 0 ? (
        <>
          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={`${row.kind}:${row.id}`} style={styles.row}>
                <Text style={typeScale.smallCaps}>{metaFor(row)}</Text>
                <Text style={row.kind === 'quest' ? styles.questText : styles.keptText}>
                  {row.text}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.counts}>
            {COPY.countsLine(counts.glimpses, counts.affirmations, counts.quests)}
          </Text>
        </>
      ) : (
        <Text style={styles.empty}>{COPY.empty}</Text>
      )}
      {/* The gold line: a door to what is already yours, at every tier. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={invite}
        onPress={onOpenArchive}
        style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
      >
        <Text style={styles.inviteText}>{invite}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    // Quieter than the hero quest card: default elevation, no top edge — the
    // strip is a doorway, not a second thing to do.
    backgroundColor: colors.card,
  },
  rows: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    gap: 2,
  },
  keptText: {
    fontFamily: serifFamily,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  questText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  counts: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkFaint,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  invite: {
    alignSelf: 'stretch',
    backgroundColor: colors.goldTint,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  pressed: {
    opacity: 0.88,
  },
});
