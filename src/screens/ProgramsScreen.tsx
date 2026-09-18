/**
 * Calm Quest — Programs (build 14, two-paths proposal §2 + §3).
 *
 * The switching door. Three rows — the program you hold, and the other two —
 * with one honest line under them: *"Your streak, XP, levels and everything
 * you've kept stay exactly as they are."* A tap on a row you do not hold makes
 * it yours, and that is the whole feature: no migration, no reset, no re-opened
 * daily loop, no second completion flag. The only persisted change is
 * `profile.path` — one field, written through the same store as every other
 * setting, and read by the gates and the rotation.
 *
 * What switching does NOT do (each of these is load-bearing):
 *  - it does not touch the streak, XP, levels, entitlements or any completed or
 *    kept ledger (they never mention a program at all);
 *  - it does not re-open today's loop: `lastQuestCompletionDate` still says
 *    today, so Home keeps showing the quest that was actually completed (by id,
 *    from ALL_QUESTS) rather than a new one;
 *  - it does not gate anything already earned: the kept archive and saved
 *    affirmations resolve their ids against ALL_QUESTS / ALL_AFFIRMATIONS.
 *
 * Fork (a), the owner's decision (proposal §3): free HOLDS one program and may
 * change which one any time. What Calm Quest+ adds is holding all three at
 * once — which is exactly what the gold line + invitation below say, honestly,
 * with no padlock and nothing dimmed. `canSwitchPrograms` is consulted rather
 * than assumed, so the owner's fallback (fork (b): locked program) would work
 * here without a code change.
 *
 * Visual grammar (docs/VISUAL.md; no new hue and no new art): the held row is
 * `tealTint` with the filled drawn `Sprout` and a solid 3px teal left edge (the
 * live PathRow pair from onboarding); a program you do not hold is a `card`
 * surface with the hollow `Leaf`, its real quest count, and the app's drawn
 * `ChevronMark` as the door. Gold stays the value family: availability line and
 * invitation only. The routing note is a vellum plate with a hairline rule —
 * the same quiet-note grammar as onboarding's fine print.
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { analytics } from '../analytics';
import { PlusInvitation } from '../components/PlusInvitation';
import { PATH_LABELS, PATH_ORDER, questPool } from '../content';
import { ROUTING_NOTE } from '../content/programs/anxietyStress';
import type { AppRouteParamList } from '../navigation/types';
import type { PathId } from '../models/types';
import { loadState, saveState } from '../storage/store';
import type { AppState } from '../storage/store';
import { canSwitchPrograms, programsFor } from '../subscription';
import {
  badges,
  cards,
  ChevronMark,
  colors,
  Leaf,
  page,
  radii,
  shadows,
  spacing,
  Sprout,
  typeScale,
  useScreenInsets,
} from '../theme';

// --- COPY (build 14) — mirrored verbatim in NEW_STRINGS.md ---
export const COPY = {
  title: 'Programs',
  back: '‹ Back',
  section: 'CHOOSE YOUR PROGRAM',
  /** Proposal §2, verbatim — the promise switching makes. */
  honestLine:
    "Your streak, XP, levels and everything you've kept stay exactly as they are.",
  currentChip: 'YOUR PROGRAM',
  /** Real quest count for a row (a program's own pool length, nothing summed). */
  questCount: (n: number) => `${n} quest${n === 1 ? '' : 's'}`,
  /** Gold line under the rows, for anyone who does not hold all three. */
  plusLine: 'Calm Quest+ holds all three at once. Changing which one is yours is free, any day.',
  switchHint: 'Makes this your program. Nothing you have kept changes.',
  errorTitle: 'Could not switch your program',
  errorBody: 'Your program is stored on this device — please try again.',
};
// --- /COPY ---

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Programs'>;

/**
 * One program row. Hooks-free, so the proof suite can invoke it and walk the
 * tree; state is expressed by fill + glyph weight + chip, never by an opacity
 * jail over the text.
 */
export function ProgramRow({
  label,
  count,
  current,
  switchable,
  busy,
  onPress,
}: {
  label: string;
  count: number;
  current: boolean;
  switchable: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={current ? 'radio' : 'button'}
      accessibilityState={{ selected: current, disabled: busy }}
      accessibilityLabel={current ? `${label}, your program` : label}
      accessibilityHint={current ? undefined : COPY.switchHint}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        current ? styles.rowCurrent : styles.rowOther,
        pressed && !busy && styles.pressed,
      ]}
    >
      <View style={[styles.glyph, current ? styles.glyphCurrent : styles.glyphOther]}>
        <Leaf size={16} color={current ? colors.tealDeep : colors.inkSoft} rotate={-28} hollow={!current} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, !current && styles.rowLabelOther]}>{label}</Text>
        <Text style={styles.rowMeta}>{COPY.questCount(count)}</Text>
      </View>
      {current ? (
        <View style={[badges.chip, badges.sage, styles.currentChip]}>
          <Sprout size={12} color={colors.sageDeep} />
          <Text style={[badges.chipText, badges.sageText]}>{COPY.currentChip}</Text>
        </View>
      ) : switchable ? (
        <ChevronMark />
      ) : (
        <Text style={styles.plusMeta}>Included with Calm Quest+</Text>
      )}
    </Pressable>
  );
}

export default function ProgramsScreen() {
  const navigation = useNavigation<Nav>();
  // Safe-area fix: additive device inset on top of the design padding.
  const screenInsets = useScreenInsets(spacing.lg, spacing.xl);
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);

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

  const current = state ? state.profile.path : null;
  const held = state ? programsFor(state) : [];
  const switchable = !!state && canSwitchPrograms(state);

  /**
   * Make `path` the program that is yours. Re-reads the persisted state at the
   * moment of the tap (never a stale render), writes ONE profile field, and
   * tracks the switch only after the write succeeded — with the real previous
   * and next ids, and only when the program actually changed.
   */
  async function choose(path: PathId) {
    if (!state || busy) return;
    if (state.profile.path === path) return; // already yours — nothing to write
    if (!canSwitchPrograms(state)) return; // fork (b) fallback: locked program
    setBusy(true);
    try {
      const latest = await loadState();
      if (latest.profile.path === path) {
        setState(latest);
        return;
      }
      const next: AppState = { ...latest, profile: { ...latest.profile, path } };
      await saveState(next);
      analytics.track('program_switched', { from: latest.profile.path, to: path });
      setState(next);
    } catch {
      Alert.alert(COPY.errorTitle, COPY.errorBody);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container, screenInsets]}
    >
      {/* Header row: back + title (the same shape Settings uses). */}
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

      <Text style={cards.label}>{COPY.section}</Text>
      {/* The one honest line (proposal §2), on a vellum plate: what switching
          costs. It says the whole truth — nothing here resets. */}
      <View style={styles.honest}>
        <Text style={styles.honestText}>{COPY.honestLine}</Text>
      </View>

      {PATH_ORDER.map((path) => (
        <ProgramRow
          key={path}
          label={PATH_LABELS[path]}
          count={questPool(path).length}
          current={current === path}
          switchable={switchable}
          busy={busy}
          onPress={() => void choose(path)}
        />
      ))}

      {/* Anyone who does not hold all three sees what Calm Quest+ adds — in the
          app's existing gold invitation family (no padlock, no countdown). */}
      {state && held.length < PATH_ORDER.length ? (
        <PlusInvitation
          line={COPY.plusLine}
          onPress={() => navigation.navigate('Paywall', { source: 'growth' })}
          style={styles.plusBlock}
        />
      ) : null}

      {/* Peace & Rest's ONE routing line (proposal §4) — a vellum note, never a
          quest, and never inside the daily loop. Shown on the picker because
          that is where the program is offered; the copy pass can move it. */}
      <View style={styles.routing}>
        <Text style={styles.routingText}>{ROUTING_NOTE}</Text>
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
  honest: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.vellum,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.rule,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  honestText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  rowCurrent: {
    backgroundColor: colors.tealTint,
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  rowOther: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.paperEdge,
  },
  pressed: {
    opacity: 0.88,
  },
  glyph: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  glyphCurrent: {
    backgroundColor: colors.card,
  },
  glyphOther: {
    backgroundColor: colors.sand,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  rowLabelOther: {
    color: colors.inkSoft,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  currentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  plusMeta: {
    fontSize: 12,
    color: colors.goldDeep,
    maxWidth: 120,
    textAlign: 'right',
  },
  plusBlock: {
    marginTop: spacing.md,
  },
  routing: {
    marginTop: spacing.lg,
    backgroundColor: colors.vellum,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.rule,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  routingText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
});
