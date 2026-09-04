/**
 * Calm Quest — Daily Quest completion screen (Phase 2b, feature spec §2 Flow B,
 * §3 F1/F4, Flow D).
 *
 * Renders today's quest by type and, on Complete, persists the completion:
 * +50 XP, streak credit (with missed-day reconciliation), level recompute, and
 * a gentle level-up moment when the user crosses a level boundary.
 *
 * Type-specific interactions (all shame-free, no right answers):
 *  - read_reflect: verse + attribution + reflection + a 3-choice check-in
 *  - act:          action prompt + "I did it" tap
 *  - pause:        60s silent timer (finishing early is fine) + "I paused" tap
 *  - write:        journal prompt + one-line text input (one line counts)
 *
 * Guardrails: no medical claims, no guilty-urgency copy, no forced length,
 * no participation trophies — XP comes only from real Completed taps.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  QUEST_TYPE_LABELS,
  QUEST_TYPE_INTROS,
  THEME_LABELS,
  quests,
  verses,
} from '../content';
import type { AppRouteParamList } from '../navigation/types';
import type { Quest, Verse } from '../models/types';
import { levelForXp, levelTitleInfo, TOTAL_LEVELS, XP_QUEST } from '../progress/progress';
import { completeQuest, loadState } from '../storage/store';
import type { AppState } from '../storage/store';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';
import { localDateString } from '../utils/daily';

/** Finds a verse by id (bundle is small; a Map would be premature). */
function verseFor(verseId: string | undefined): Verse | undefined {
  if (!verseId) return undefined;
  return verses.find((v) => v.id === verseId);
}

/** Today's screen quest: the one the user tapped on Home. */
function questById(id: string): Quest | undefined {
  return quests.find((q) => q.id === id);
}

// ---------------------------------------------------------------------------
// Level-up moment (Flow D) — gentle celebration card, one CTA, never asks
// ---------------------------------------------------------------------------

function LevelUpCard({
  level,
  onDismiss,
}: {
  level: number;
  onDismiss: () => void;
}) {
  const info = levelTitleInfo(level);
  return (
    <View style={styles.levelCard}>
      <View style={[badges.chip, badges.gold, styles.levelBadge]}>
        <Text style={[badges.chipText, badges.goldText]}>LEVEL {level}</Text>
      </View>
      <Text style={styles.levelTitle}>{info.title}</Text>
      <Text style={styles.levelBlessing}>{info.blessing}</Text>
      <Text style={styles.levelTierNote}>
        {level} of {TOTAL_LEVELS} growth levels — you're on the way.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed }) => [buttons.ghost, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>Back to today</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quest completion card (Flow B step 5) — shown after the Completed tap
// ---------------------------------------------------------------------------

function QuestCompleteCard({
  xpGained,
  streakDays,
  level,
  leveledUp,
  onDone,
}: {
  xpGained: number;
  streakDays: number;
  level: number;
  leveledUp: boolean;
  onDone: () => void;
}) {
  return (
    <View style={[cards.card, styles.doneCard]}>
      <Text style={styles.doneCheck}>✓</Text>
      <Text style={styles.doneTitle}>Today's quest is done.</Text>
      <Text style={styles.doneCopy}>
        +{xpGained} XP · Day {streakDays} secured — whenever you're ready
      </Text>
      {leveledUp ? (
        <LevelUpCard level={level} onDismiss={onDone} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [buttons.primary, pressed && styles.pressed]}
        >
          <Text style={buttons.primaryText}>Back to today</Text>
        </Pressable>
      )}
    </View>
  );
}

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Quest'>;

/** A check-in choice row for Read & Reflect quests. */
function CheckInRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkRow,
        selected && styles.checkRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.checkText, selected && styles.checkTextSelected]}>{label}</Text>
      {selected ? <View style={styles.checkDot} /> : null}
    </Pressable>
  );
}

export default function QuestScreen({ route }: { route: { params: { questId: string } } }) {
  const navigation = useNavigation<Nav>();
  const { questId } = route.params;
  const today = localDateString();

  // Persisted state is loaded once; completion mutates through completeQuest.
  const [state, setState] = useState<AppState | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  // For act: "I did it" · for pause: "I paused". One shared performed-tap per
  // screen is enough — a screen serves exactly one quest type.
  const [performed, setPerformed] = useState(false);
  const [writeText, setWriteText] = useState('');
  const [focused, setFocused] = useState(false);

  // Pause timer countdown.
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Completion results (XP boundary crossing decides the celebration card).
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{
    xpGained: number;
    totalXp: number;
    streakDays: number;
    level: number;
    leveledUp: boolean;
  } | null>(null);
  const busyRef = useRef(false);
  const startXpRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    loadState().then((s) => {
      if (!active) return;
      setState(s);
      startXpRef.current = s.progress.totalXp;
      const q = questById(questId);
      setSecondsLeft(q?.type === 'pause' ? (q.durationSeconds ?? 60) : 0);
    });
    return () => {
      active = false;
    };
  }, [questId]);

  const quest =
    state && !state.quests.completedQuestIds.includes(questId) ? questById(questId) : undefined;

  // -------------------------------------------------------------------------
  // Pause timer: one interval, counts down, stops at zero. Finishing early is
  // fine — there is no hard block (spec F3's zero-pressure pattern).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!quest || quest.type !== 'pause' || done) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [quest, secondsLeft, done]);

  if (!state || !quest) {
    return (
      <View style={styles.bootBox}>
        <Text style={cards.subtitle}>
          {!state
            ? 'Loading today\u2019s quest\u2026'
            : 'This quest is already complete \u2014 back to today.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [buttons.ghost, styles.bootBtn, pressed && styles.pressed]}
        >
          <Text style={buttons.ghostText}>Back to today</Text>
        </Pressable>
      </View>
    );
  }

  const verse = verseFor(quest.verseId);
  const duration = quest.durationSeconds ?? 60;

  // Const snapshots after the null-guard — closures stay narrowable this way.
  const currentState = state;
  const currentQuest = quest;

  const pauseReady = quest.type !== 'pause' || performed || secondsLeft === 0;
  const canComplete = pauseReady && (quest.type !== 'write' || writeText.trim().length > 0);

  // -------------------------------------------------------------------------
  // Completed tap → store the day's completion, compute XP/level/streak.
  // -------------------------------------------------------------------------
  async function finishQuest() {
    if (done || busyRef.current) return;
    busyRef.current = true;
    try {
      const before = startXpRef.current ?? currentState.progress.totalXp;
      const next = await completeQuest(currentState, currentQuest, today);
      if (next === null) {
        // Day already completed (defensive; the screen shouldn't be reachable).
        navigation.goBack();
        return;
      }
      const leveledUp = levelForXp(before) < next.progress.level;
      setResult({
        xpGained: XP_QUEST,
        totalXp: next.progress.totalXp,
        streakDays: next.streak.streakDays,
        level: next.progress.level,
        leveledUp,
      });
      setDone(true);
    } catch {
      Alert.alert(
        'Could not save your progress',
        'Your quest progress is stored on this device — please try again.',
      );
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container]}
    >
      {/* Header meta */}
      <View style={styles.metaRow}>
        <View style={[badges.chip, badges.sage]}>
          <Text style={[badges.chipText, badges.sageText]}>{THEME_LABELS[quest.theme]}</Text>
        </View>
        <View style={[badges.chip, styles.typeChip]}>
          <Text style={badges.chipText}>{QUEST_TYPE_LABELS[quest.type]}</Text>
        </View>
      </View>
      <Text style={styles.title}>{quest.title}</Text>

      {done && result ? (
        <QuestCompleteCard
          xpGained={result.xpGained}
          streakDays={result.streakDays}
          level={result.level}
          leveledUp={result.leveledUp}
          onDone={() => navigation.goBack()}
        />
      ) : (
        <View style={[cards.card, styles.bodyCard]}>
          {quest.type === 'read_reflect' ? (
            <>
              {verse ? (
                <View style={styles.verseBox}>
                  <Text style={styles.verseText}>{verse.text}</Text>
                  <Text style={styles.verseRef}>
                    {verse.reference} · {verse.translation}
                  </Text>
                  <Text style={styles.attribution}>{verse.attribution}</Text>
                </View>
              ) : null}
              <Text style={styles.reflection}>{quest.reflection}</Text>
              <Text style={styles.promptLabel}>Which word stays with you?</Text>
              {(quest.checkInOptions ?? []).map((o) => (
                <CheckInRow
                  key={o.label}
                  label={o.label}
                  selected={checkIn === o.label}
                  onPress={() => setCheckIn(o.label)}
                />
              ))}
              <Text style={styles.optionalHint}>No wrong answer — a word is enough.</Text>
            </>
          ) : null}

          {quest.type === 'act' ? (
            <>
              <Text style={styles.actionPrompt}>
                {quest.actionPrompt ?? QUEST_TYPE_INTROS.act}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: performed }}
                onPress={() => setPerformed((p) => !p)}
                style={({ pressed }) => [
                  styles.performedRow,
                  performed && styles.performedRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.performedText, performed && styles.performedTextSelected]}
                >
                  {performed ? '✓ I did it' : 'I did it'}
                </Text>
              </Pressable>
              <Text style={styles.optionalHint}>
                When you've taken the step, tap and then Complete.
              </Text>
            </>
          ) : null}

          {quest.type === 'pause' ? (
            <>
              <Text style={styles.pauseCopy}>
                {QUEST_TYPE_INTROS.pause} Close your eyes if it helps; just be still.
              </Text>
              <View style={styles.timerWrap}>
                <Text accessibilityLabel={`${duration} seconds`} style={styles.timerText}>
                  {formatSeconds(secondsLeft)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPerformed(true)}
                style={({ pressed }) => [
                  buttons.primary,
                  styles.pauseBtn,
                  performed && buttons.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[buttons.primaryText, performed && buttons.disabledText]}>
                  {performed ? 'I paused — done' : 'Start the pause'}
                </Text>
              </Pressable>
              <Text style={styles.optionalHint}>
                {performed
                  ? secondsLeft > 0
                    ? `${formatSeconds(secondsLeft)} left — or Complete to finish early.`
                    : 'Your minute is up — soft landing.'
                  : 'A quiet minute, nothing else required.'}
              </Text>
            </>
          ) : null}

          {quest.type === 'write' ? (
            <>
              <Text style={styles.journalPrompt}>{quest.journalPrompt}</Text>
              <Text style={styles.optionalHint}>
                One line is enough. There is no right answer.
              </Text>
              <TextInput
                style={[styles.input, focused && styles.inputFocused]}
                value={writeText}
                onChangeText={setWriteText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Write a line (or a word)"
                placeholderTextColor={colors.inkSoft}
                multiline
                maxLength={280}
                accessibilityLabel="Your one-line journal entry"
              />
            </>
          ) : null}

          {/* Single completion CTA for all four types */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canComplete }}
            disabled={!canComplete}
            onPress={() => void finishQuest()}
            style={({ pressed }) => [
              buttons.primary,
              !canComplete && buttons.disabled,
              pressed && canComplete && styles.pressed,
              styles.completeBtn,
            ]}
          >
            <Text style={[buttons.primaryText, !canComplete && buttons.disabledText]}>
              {quest.type === 'act' && !performed
                ? 'Complete when done'
                : `Complete · +${XP_QUEST} XP`}
            </Text>
          </Pressable>
          <Text style={styles.xpHint}>
            +{XP_QUEST} XP when you finish · the daily loop is free, forever.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/** "mm:ss" from whole seconds. */
function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  bootBox: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  bootBtn: {
    marginTop: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeChip: {
    backgroundColor: colors.tealSoft,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  bodyCard: {
    paddingTop: spacing.lg,
  },
  verseBox: {
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  verseText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 25,
    color: colors.ink,
  },
  verseRef: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.inkSoft,
  },
  attribution: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
  reflection: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  promptLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tealDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  checkRowSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  checkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  checkTextSelected: {
    color: colors.tealDeep,
  },
  checkDot: {
    width: 14,
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.teal,
  },
  optionalHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionPrompt: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  performedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.pill,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  performedRowSelected: {
    backgroundColor: colors.tealSoft,
  },
  performedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.tealDeep,
  },
  performedTextSelected: {
    color: colors.tealDeep,
  },
  pauseCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  timerWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.teal,
    fontVariant: ['tabular-nums'],
  },
  pauseBtn: {
    marginBottom: spacing.xs,
  },
  journalPrompt: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 90,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.teal,
  },
  completeBtn: {
    marginTop: spacing.md,
  },
  xpHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  doneCard: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  doneCheck: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.teal,
    marginBottom: spacing.sm,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  doneCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  levelCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sand,
    marginBottom: spacing.sm,
  },
  levelBadge: {
    marginBottom: spacing.sm,
  },
  levelTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.goldDeep,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  levelBlessing: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  levelTierNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
});