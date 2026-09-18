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
  questById,
  THEME_LABELS,
  verses,
} from '../content';
import { analytics } from '../analytics';
import type { AppRouteParamList } from '../navigation/types';
import type { Quest, Verse } from '../models/types';
import { levelForXp, levelTitleInfo, FREE_LEVELS, TOTAL_LEVELS, XP_QUEST } from '../progress/progress';
import { completeQuest, loadState } from '../storage/store';
import type { AppState } from '../storage/store';
import { paywallSurface } from '../subscription/paywall';
import {
  KeptSeal,
  Leaf,
  LevelUpOverlay,
  Ornament,
  StemMark,
  TickRing,
  badges,
  buttons,
  cards,
  colors,
  page,
  radii,
  spacing,
  themeAccents,
  typeScale,
  useScreenInsets,
  withAlpha,
} from '../theme';
import type { ThemeAccent } from '../theme';
import { localDateString } from '../utils/daily';

/**
 * The pause plate's thin ticking ring (§3.3.3). Same tick device as the
 * Gratitude Glimpse ring — decorative stillness, never a breathing pulse and
 * never a countdown that punishes: it just redraws from the real seconds.
 */
const PAUSE_RING_SIZE = 156;
const PAUSE_RING_RADIUS = 66;
const PAUSE_RING_TICKS = 48;

/** Finds a verse by id (bundle is small; a Map would be premature). */
function verseFor(verseId: string | undefined): Verse | undefined {
  if (!verseId) return undefined;
  return verses.find((v) => v.id === verseId);
}

/**
 * Today's screen quest: the one the user tapped on Home.
 *
 * Build 14 (two-paths §3): id resolution goes through `ALL_QUESTS` (the content
 * barrel's `questById`), NOT the program the profile currently holds. A quest
 * completed this morning must still open — with its real text — after a mid-day
 * program switch; resolving against the current pool would make it vanish.
 */

// ---------------------------------------------------------------------------
// Level-up moment (Flow D) — the peak moment, escalated to a full-screen
// overlay (visual-direction §4.3): paper, one ~900ms light bloom instead of
// confetti, a 120px stage glyph, the level title in serif 34px, the blessing
// verbatim, one quiet CTA. Copy is passed through untouched.
// ---------------------------------------------------------------------------

function LevelUpMoment({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const info = levelTitleInfo(level);
  return (
    <LevelUpOverlay
      level={level}
      title={info.title}
      blessing={info.blessing}
      tierNote={`${level} of ${TOTAL_LEVELS} growth levels — you're on the way.`}
      dismissLabel="Back to today"
      onDismiss={onDismiss}
    />
  );
}

// ---------------------------------------------------------------------------
// Paid-level gate (Phase 4a, §5/F4) — honest card when a free user's XP
// crosses into level 6+: the level isn't granted, nothing is lost, and the
// next step is a calm choice (see Calm Quest+ / keep going free).
// ---------------------------------------------------------------------------

function LevelGateCard({
  onSeePlus,
  onDismiss,
}: {
  onSeePlus: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.levelCard}>
      <View style={[badges.chip, badges.gold, styles.levelBadge]}>
        <Text style={[badges.chipText, badges.goldText]}>LEVEL 6</Text>
      </View>
      <Text style={styles.levelTitle}>That level is part of Calm Quest+</Text>
      <Text style={styles.levelBlessing}>
        Your XP is safe and keeps counting — it's all yours the moment you step
        through. Levels 6–20 come with Calm Quest+; levels 1–5 stay free,
        always.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSeePlus}
        style={({ pressed }) => [buttons.primary, styles.gateBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>See what Calm Quest+ includes</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed }) => [buttons.ghost, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>Keep going free</Text>
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
  levelGated,
  onSeePlus,
  onDone,
}: {
  xpGained: number;
  streakDays: number;
  level: number;
  leveledUp: boolean;
  /** Phase 4a: XP crossed into L6+ while tier is free — honest gate, not a level-up. */
  levelGated: boolean;
  onSeePlus: () => void;
  onDone: () => void;
}) {
  return (
    <View style={[cards.card, styles.doneCard]}>
      {/* §3.3.4: kept seal in sage + the gold XP pill + a stem that has just
          gained its one leaf. The level-up escalates to the overlay (§4.3),
          which owns the only CTA in that moment. */}
      <KeptSeal size={64} tone="sage" style={styles.doneSeal} />
      <Text style={styles.doneTitle}>Today's quest is done.</Text>
      <View style={[badges.chip, badges.gold, styles.xpPill]}>
        <Text style={[badges.chipText, badges.goldText, styles.xpPillText]}>
          +{xpGained} XP
        </Text>
      </View>
      <Text style={styles.doneCopy}>Day {streakDays} secured — whenever you're ready</Text>
      <StemMark leaves={1} bud size={32} color={colors.sageDeep} style={styles.doneStem} />
      {levelGated ? (
        <LevelGateCard onSeePlus={onSeePlus} onDismiss={onDone} />
      ) : leveledUp ? null : (
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

/**
 * A check-in choice row for Read & Reflect quests (§3.3.3): the selected row
 * takes the day's theme — tint fill, accent edge, `deep` text and a filled
 * drawn leaf instead of a plain dot. The leaf is decoration: the row's state
 * is carried by `accessibilityState` and by the `deep` ink.
 */
function CheckInRow({
  label,
  selected,
  accent,
  onPress,
}: {
  label: string;
  selected: boolean;
  accent: ThemeAccent;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkRow,
        selected && { borderColor: accent.accent, backgroundColor: accent.tint },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.checkText, selected && { color: accent.deep }]}>{label}</Text>
      {selected ? <Leaf size={16} color={accent.deep} style={styles.checkLeaf} /> : null}
    </Pressable>
  );
}

export default function QuestScreen({ route }: { route: { params: { questId: string } } }) {
  const navigation = useNavigation<Nav>();

  // Safe-area fix: additive device insets on top of the design padding (the
  // scroll container and the full-screen loading box).
  const screenInsets = useScreenInsets(spacing.lg, spacing.xl);
  const bootInsets = useScreenInsets(spacing.lg, spacing.lg);
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

  // Phase 4a (Flow E): the one-time paywall is queued behind the completion
  // card — it presents when the user leaves this screen, never over it.
  const [pendingPaywall, setPendingPaywall] = useState(false);

  // Completion results (XP boundary crossing decides the celebration card).
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{
    xpGained: number;
    totalXp: number;
    streakDays: number;
    level: number;
    leveledUp: boolean;
    levelGated: boolean;
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

  // The daily-loop gate is the LOCAL DATE, matching the store's one-flag-per-
  // day rule (completeQuest blocks on lastQuestCompletionDate). `completed-
  // QuestIds` is a content-usage ledger, not a per-day gate: it must never
  // block play — especially after a content-pass swap that reuses ids with
  // NEW content (a Phase 1 user who completed q-gratitude-01 must still play
  // the Phase 6 q-gratitude-01 on a fresh day).
  const quest =
    state && state.quests.lastQuestCompletionDate !== today ? questById(questId) : undefined;

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
      <View style={[styles.bootBox, bootInsets]}>
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

  // §3.3: the day's theme is the screen's one accent — `accent` is paint only
  // (edges, fills, ornament), `deep` carries every state mark and line of text.
  const accent = themeAccents[quest.theme];
  // Pause plate (§3.3.3): the digits sit in a soft stillness plate. The ring
  // just redraws the real countdown — decoration, never a timer of its own,
  // and never a "breathe with me" pulse.
  const still = themeAccents.stillness;
  const pauseLitTicks =
    quest.type === 'pause' && duration > 0
      ? Math.round(
          (Math.min(duration, Math.max(0, duration - secondsLeft)) / duration) * PAUSE_RING_TICKS,
        )
      : 0;

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
      // Phase 5 (S5): capture the pre-completion grace position so the
      // analytics event can tell the truth about a grace-day completion.
      const beforeStreakGrace = currentState.streak.graceDaysMissed;
      const next = await completeQuest(currentState, currentQuest, today);
      if (next === null) {
        // Day already completed (defensive; the screen shouldn't be reachable).
        navigation.goBack();
        return;
      }
      // Phase 4a level gating (§5/F4): the RAW level crossed into L6+ while
      // tier is free. The persisted level is already capped (completeQuest
      // stores displayLevel); this flag just swaps the celebration for the
      // honest gate card. XP itself is untouched — no fake progress loss.
      const rawBefore = levelForXp(before);
      const rawAfter = levelForXp(next.progress.totalXp);
      // The only raw-increase that isn't a real display level-up: the free
      // cap (raw went 5→6+ while the held level stayed ≤5).
      const levelGated = rawBefore < rawAfter && next.progress.level <= FREE_LEVELS && rawAfter > FREE_LEVELS;
      const leveledUp = !levelGated && rawBefore < rawAfter;
      // Phase 5 (S5) analytics — stub seam, dev-only console logging. The
      // events describe exactly what just happened (nothing fabricated):
      // the completed quest, the streak after this completion, whether grace
      // was in play, and a level boundary crossed when it really was.
      analytics.track('quest_completed', { questId: currentQuest.id, type: currentQuest.type });
      if (next.streak.streakDays > 0) {
        analytics.track('streak_greater_than_0', { streakDays: next.streak.streakDays });
      }
      if (beforeStreakGrace > 0) {
        analytics.track('grace_used', { graceDays: beforeStreakGrace });
      }
      if (leveledUp) {
        analytics.track('level_up', { level: next.progress.level, totalXp: next.progress.totalXp });
      }
      setResult({
        xpGained: XP_QUEST,
        totalXp: next.progress.totalXp,
        streakDays: next.streak.streakDays,
        level: next.progress.level,
        leveledUp,
        levelGated,
      });
      setDone(true);

      // Phase 4a (Flow E): the one-time paywall fires exactly after the 3rd
      // completed loop, for a free user who has never seen it. Evaluated on
      // the persisted post-completion state; it presents AFTER the completion
      // card is dismissed (never covering the celebration).
      if (paywallSurface(next, today, true) === 'auto') {
        setPendingPaywall(true);
      }
    } catch {
      Alert.alert(
        'Could not save your progress',
        'Your quest progress is stored on this device — please try again.',
      );
    } finally {
      busyRef.current = false;
    }
  }

  /** Leave the screen; route to the queued paywall first, if the 3rd loop queued it. */
  function leaveAfterCompletion() {
    if (pendingPaywall) {
      setPendingPaywall(false);
      navigation.navigate('Paywall', { source: 'auto' });
      return;
    }
    navigation.goBack();
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={page.screen}
        contentContainerStyle={[page.content, styles.container, screenInsets]}
      >
        {/* Header meta — the day's colour, a neutral type chip (§3.3.1) */}
        <View style={styles.metaRow}>
          <View style={[badges.chip, styles.themeChip, { backgroundColor: accent.tint }]}>
            <Text style={[badges.chipText, { color: accent.deep }]}>
              {THEME_LABELS[quest.theme]}
            </Text>
          </View>
          <View style={[badges.chip, styles.typeChip]}>
            <Text style={[badges.chipText, styles.typeChipText]}>
              {QUEST_TYPE_LABELS[quest.type]}
            </Text>
          </View>
        </View>
        <Text style={[typeScale.display, styles.title]}>{quest.title}</Text>

        {done && result ? (
          <QuestCompleteCard
            xpGained={result.xpGained}
            streakDays={result.streakDays}
            level={result.level}
            leveledUp={result.leveledUp}
            levelGated={result.levelGated}
            onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
            onDone={leaveAfterCompletion}
          />
        ) : (
          <View style={[cards.card, styles.bodyCard]}>
            {quest.type === 'read_reflect' ? (
              <>
                {verse ? (
                  <View style={[styles.verseBox, { borderLeftColor: accent.accent }]}>
                    <Ornament style={styles.verseOrnament} />
                    <Text style={typeScale.readingLg}>{verse.text}</Text>
                    <Text style={[typeScale.smallCaps, styles.verseRef]}>
                      {verse.reference} · {verse.translation}
                    </Text>
                    <Text style={styles.attribution}>{verse.attribution}</Text>
                  </View>
                ) : null}
                <Text style={styles.reflection}>{quest.reflection}</Text>
                <Text style={[styles.promptLabel, { color: accent.deep }]}>
                  Which word stays with you?
                </Text>
                {(quest.checkInOptions ?? []).map((o) => (
                  <CheckInRow
                    key={o.label}
                    label={o.label}
                    selected={checkIn === o.label}
                    accent={accent}
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
                    { borderColor: accent.accent },
                    performed && { borderColor: accent.deep, backgroundColor: accent.tint },
                    pressed && styles.pressed,
                  ]}
                >
                  {performed ? (
                    <Leaf size={16} color={accent.deep} style={styles.actLeaf} />
                  ) : null}
                  <Text style={[styles.performedText, { color: accent.deep }]}>I did it</Text>
                </Pressable>
                <Text style={styles.optionalHint}>
                  When you've taken the step, tap and then Complete.
                </Text>
              </>
            ) : null}

            {quest.type === 'pause' ? (
              <>
                <Text style={styles.pauseCopy}>
                  {quest.pausePrompt ??
                    `${QUEST_TYPE_INTROS.pause} Close your eyes if it helps; just be still.`}
                </Text>
                <View
                  style={[
                    styles.pausePlate,
                    { backgroundColor: still.tint, borderColor: withAlpha(still.accent, 0.4) },
                  ]}
                >
                  <TickRing
                    lit={pauseLitTicks}
                    total={PAUSE_RING_TICKS}
                    size={PAUSE_RING_SIZE}
                    radius={PAUSE_RING_RADIUS}
                    tick={3}
                    color={still.accent}
                    trackColor={colors.rule}
                    style={styles.pauseRing}
                  />
                  <Text
                    accessibilityLabel={`${duration} seconds`}
                    style={[styles.timerText, { color: still.deep }]}
                  >
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
                  style={[
                    styles.input,
                    { borderColor: withAlpha(accent.accent, 0.45) },
                    focused && { borderColor: accent.accent, borderWidth: 1.5 },
                  ]}
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
      {done && result && result.leveledUp && !result.levelGated ? (
        <LevelUpMoment level={result.level} onDismiss={leaveAfterCompletion} />
      ) : null}
    </View>
  );
}

/** "mm:ss" from whole seconds. */
function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  /** Root wrapper: the scroll body plus the full-screen level-up overlay (§4.3). */
  screenRoot: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  bootBox: {
    flex: 1,
    backgroundColor: colors.paper,
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
  /** §3.3.1 — the theme chip is filled with its own tint (colour set inline). */
  themeChip: {
    alignSelf: 'flex-start',
  },
  /** §3.3.1 — the type chip stays neutral: sand fill, ink text at full contrast. */
  typeChip: {
    backgroundColor: colors.sand,
  },
  typeChipText: {
    color: colors.inkSoft,
  },
  /** The serif 26px display type carries most of this style (§2.4). */
  title: {
    marginBottom: spacing.md,
  },
  bodyCard: {
    paddingTop: spacing.lg,
  },
  /** §3.3.2 — the enlarged verse plate: vellum, 3px theme rule, serif 19px. */
  verseBox: {
    backgroundColor: colors.vellum,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  verseOrnament: {
    marginBottom: spacing.sm,
  },
  verseRef: {
    marginTop: spacing.xs,
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
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.paperEdge,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  checkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  /** §3.3.3 — the filled leaf that replaces the plain selected dot. */
  checkLeaf: {
    marginLeft: spacing.sm,
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
    borderRadius: radii.pill,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  /** §3.3.3 — the performed leaf check beside "I did it". */
  actLeaf: {
    marginRight: spacing.xs,
  },
  performedText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pauseCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  /** §3.3.3 — a soft stillness plate the digits rest in. No pulse, no breath. */
  pausePlate: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: PAUSE_RING_SIZE,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  pauseRing: {
    position: 'absolute',
    zIndex: 0,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    zIndex: 1,
  },
  pauseBtn: {
    marginBottom: spacing.xs,
  },
  journalPrompt: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  /** §3.3.3 — the writing sheet: vellum, theme hairline, theme accent on focus. */
  input: {
    borderWidth: 1,
    borderColor: colors.paperEdge,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 90,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    backgroundColor: colors.vellum,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
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
  /** §3.3.4 — the kept seal in sage. */
  doneSeal: {
    marginBottom: spacing.md,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  /** §3.3.4 — the gold XP pill. */
  xpPill: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  xpPillText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  doneCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  /** §3.3.4 — the stem that has just gained its one leaf. */
  doneStem: {
    marginBottom: spacing.md,
  },
  levelCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.paperDeep,
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
  gateBtn: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
});
