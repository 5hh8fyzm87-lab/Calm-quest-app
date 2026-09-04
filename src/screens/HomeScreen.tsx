/**
 * Calm Quest — Home / Today (Flow B, feature spec §2), Phase 2b + Phase 3.
 *
 * The daily loop opens here: today's quest (1 Quest from the bundle via pure
 * date rotation), the Affirmation of the Day, a Gratitude Glimpse entry point,
 * and a grace-toned streak chip. Phase 2b wires completion:
 *  - "Begin today's quest" → Quest screen (4 quest types, +50 XP, streak)
 *  - Affirmation card gains a "Save +5 XP" action (one per day)
 *  - Glimpse card → Glimpse screen (Phase 2c builds the full mini-game)
 *  - After completion the quest card shows its done state and the header
 *    shows XP, level and progress toward the next level.
 *
 * Phase 3 strengthens the streak chip: it derives the HONEST current position
 * from StreakState + today (src/streaks/ui.ts) — during grace it reads
 * "Day N secured — … grace remaining" instead of the stale "secured" the
 * persisted ledger alone would show — refreshes on every focus (so a
 * completion on Quest/Glimpse is reflected on return), and adds a Settings
 * (gear) entry for the one gentle daily reminder.
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  affirmations,
  CONTENT_COUNTS,
  CONTENT_META,
  pickToday,
  QUEST_TYPE_INTROS,
  QUEST_TYPE_LABELS,
  prompts,
  quests,
  THEME_LABELS,
  verses,
} from '../content';
import { analytics } from '../analytics';
import type { AppRouteParamList } from '../navigation/types';
import type { Quest, QuestTheme, Verse } from '../models/types';
import {
  displayLevel,
  levelFloorXp,
  levelGate,
  levelTitleInfo,
  TOTAL_LEVELS,
  XP_AFFIRMATION,
  XP_GLIMPSE,
  XP_PER_LEVEL,
  XP_QUEST,
} from '../progress/progress';
import { completeBonusQuest, loadState, saveAffirmation } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  bonusQuestAvailable,
  canBrowseThemes,
  pickBonusQuest,
  themeQuestCounts,
  THEME_ORDER,
  visibleThemes,
} from '../subscription/gates';
import { paywallSurface } from '../subscription/paywall';
import { streakUi } from '../streaks/ui';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';
import { friendlyDate, localDateString } from '../utils/daily';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Home'>;

/** Finds a verse by id (bundle is small; a Map would be premature). */
function verseFor(verseId: string | undefined): Verse | undefined {
  if (!verseId) return undefined;
  return verses.find((v) => v.id === verseId);
}

/** Type-specific body copy (details shown "as appropriate per type"). */
function bodyFor(quest: Quest): string {
  switch (quest.type) {
    case 'read_reflect':
      return quest.reflection ?? 'Sit with this verse and one word that stays with you.';
    case 'act':
      return quest.actionPrompt ?? QUEST_TYPE_INTROS.act;
    case 'pause':
      return `${QUEST_TYPE_INTROS.pause} ${quest.durationSeconds ?? 60} seconds.`;
    case 'write':
      return quest.journalPrompt ?? QUEST_TYPE_INTROS.write;
  }
}

/** XP meter: total XP, level badge, and progress toward the next level. */
function LevelChip({ state }: { state: AppState }) {
  const { totalXp } = state.progress;
  // Phase 4a (§5/F4): free users hold at most level 5 — the meter shows the
  // honest held level while XP keeps accruing (never reset, never faked).
  const level = displayLevel(totalXp, state.entitlements.tier);
  const gate = levelGate(totalXp, state.entitlements.tier);
  const floor = levelFloorXp(totalXp);
  const into = totalXp - floor;
  const pct = Math.min(100, Math.round((into / XP_PER_LEVEL) * 100));
  const info = levelTitleInfo(level);
  return (
    <View style={styles.levelWrap}>
      <View style={styles.levelTopRow}>
        <Text style={styles.levelTitle}>
          Level {level} · {info.title}
        </Text>
        <Text style={styles.levelXp}>{totalXp} XP</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}%` }}
        style={styles.meterTrack}
      >
        <View style={[styles.meterFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.levelHint}>
        {gate.gated
          ? `${totalXp} XP and growing — levels 6–20 are part of Calm Quest+, your XP is safe.`
          : `${into}/${XP_PER_LEVEL} XP to Level ${level + 1} · ${TOTAL_LEVELS - level} levels to the top`}
      </Text>
    </View>
  );
}

function QuestCard({
  quest,
  done,
  onBegin,
}: {
  quest: Quest;
  done: boolean;
  onBegin: () => void;
}) {
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
      {!done ? (
        <>
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
            onPress={onBegin}
            style={({ pressed }) => [buttons.primary, styles.beginBtn, pressed && styles.pressed]}
          >
            <Text style={buttons.primaryText}>Begin today's quest</Text>
          </Pressable>
          <Text style={[cards.small, styles.xpHint]}>+{XP_QUEST} XP on completion</Text>
        </>
      ) : (
        <View style={styles.doneBox}>
          <Text style={styles.doneMark}>✓ Done today</Text>
          <Text style={styles.doneText}>
            See you tomorrow — wherever you are, the loop waits right here.
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Phase 4b (§5): bonus (2nd daily) quest — paid only. The completion path is
// store.completeBonusQuest, which appends to the dedicated bonusCompletions
// ledger and awards +50 XP, and NEVER touches completions /
// lastQuestCompletionDate / streak / paywall trigger. The card's copy says
// exactly that: extra XP, never a second streak credit.
// ---------------------------------------------------------------------------

function BonusQuestCard({
  quest,
  onComplete,
  busy,
}: {
  quest: Quest;
  onComplete: () => void;
  busy: boolean;
}) {
  const verse = verseFor(quest.verseId);
  return (
    <View style={[cards.card, styles.bonusCard]}>
      <View style={styles.chipRow}>
        <View style={[badges.chip, badges.gold]}>
          <Text style={[badges.chipText, badges.goldText]}>BONUS QUEST</Text>
        </View>
        <View style={[badges.chip, badges.sand]}>
          <Text style={[badges.chipText, badges.sandText]}>+{XP_QUEST} XP</Text>
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
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onComplete}
        style={({ pressed }) => [buttons.primary, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>Complete · +{XP_QUEST} XP</Text>
      </Pressable>
      <Text style={[cards.small, styles.xpHint]}>
        A little extra — it adds XP only, and never touches your daily loop or
        streak.
      </Text>
    </View>
  );
}

function AffirmationCard({
  text,
  id,
  saved,
  onSave,
}: {
  text: string;
  id: string;
  saved: boolean;
  onSave: () => void;
}) {
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
      {revealed ? (
        saved ? (
          <View style={[styles.saveChip, styles.saveChipSaved]}>
            <Text style={[styles.saveChipText, styles.saveChipTextSaved]}>
              ✓ Saved to your day (+{XP_AFFIRMATION} XP)
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              onSave();
            }}
            style={({ pressed }) => [styles.saveChip, pressed && styles.pressed]}
          >
            <Text style={styles.saveChipText}>Save to your day · +{XP_AFFIRMATION} XP</Text>
          </Pressable>
        )
      ) : (
        <Text style={[cards.small, styles.affirmHint]}>A small word for today. Tap to reveal.</Text>
      )}
    </Pressable>
  );
}

function StreakChip({ state }: { state: AppState }) {
  const today = localDateString();
  const ui = streakUi(state.streak, today);
  const inGrace = ui.status === 'grace';
  const resetsToday = ui.resetsToday;
  return (
    <>
      <View
        style={[
          badges.chip,
          styles.streakChip,
          inGrace && styles.streakChipGrace,
          resetsToday && styles.streakChipResets,
        ]}
      >
        <Text
          style={[
            badges.chipText,
            styles.streakChipText,
            inGrace && styles.streakChipTextGrace,
            resetsToday && styles.streakChipTextResets,
          ]}
        >
          {ui.message}
        </Text>
      </View>
      {/* A small, honest grace note below the chip — never a countdown, never
          guilt (Flow C rule 6: neutral-positive during grace only). */}
      {resetsToday ? (
        <Text style={styles.graceNoteResets}>
          Today still counts — a quiet minute whenever you're ready. And if you
          let this day pass, that's okay too: Day 1 starts fresh when you say
          today.
        </Text>
      ) : inGrace ? (
        <Text style={styles.graceNote}>
          Grace is holding your streak — take your time, no pressure.
        </Text>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Phase 4b (S1 theme peek): read-only preview for everyone, full library for
// Calm Quest+. Free users see only today's quest theme (the daily quest is
// NEVER gated — removing it from view would block play); paid users see all
// five themes with the library peek. One calm Growth link for free — no
// guilt, no lock icons, no dark patterns.
// ---------------------------------------------------------------------------

function ThemesCard({
  themes,
  browsing,
  themeCounts,
  onSeePlus,
}: {
  themes: QuestTheme[];
  browsing: boolean;
  themeCounts: Record<QuestTheme, number> | null;
  onSeePlus: () => void;
}) {
  return (
    <View style={[cards.card, styles.themesCard]}>
      <View style={styles.chipRow}>
        <View style={[badges.chip, badges.sand]}>
          <Text style={[badges.chipText, badges.sandText]}>THEMES</Text>
        </View>
      </View>
      <Text style={cards.title}>Five themes, one at a time</Text>
      <Text style={[cards.subtitle, styles.body]}>
        {browsing
          ? 'Your library, by theme — each one holds its own quests.'
          : 'Each day brings one theme. Calm Quest+ opens all five, any day.'}
      </Text>
      <View style={styles.themeGrid}>
        {THEME_ORDER.map((t) => {
          const visible = themes.includes(t);
          const count = themeCounts ? themeCounts[t] : null;
          return (
            <View
              key={t}
              style={[styles.themeRow, !visible && styles.themeRowLocked]}
            >
              <Text
                style={[styles.themeName, !visible && styles.themeNameLocked]}
                accessibilityLabel={visible ? `${THEME_LABELS[t]}, available` : undefined}
              >
                {THEME_LABELS[t]}
              </Text>
              {visible ? (
                <Text style={styles.themeCount}>
                  {count != null ? `${count} quest${count === 1 ? '' : 's'}` : 'today'}
                </Text>
              ) : (
                <Text style={styles.themeCountLocked}>with Calm Quest+</Text>
              )}
            </View>
          );
        })}
      </View>
      {!browsing ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSeePlus}
          style={({ pressed }) => [buttons.ghost, styles.themeCta, pressed && styles.pressed]}
        >
          <Text style={buttons.ghostText}>See what Calm Quest+ includes</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const today = localDateString();
  const [state, setState] = useState<AppState | null>(null);
  // Phase 4b: brief lock while the bonus completion persists (no double-tap).
  const [bonusBusy, setBonusBusy] = useState(false);

  // Reload persisted state whenever the screen gains focus — keeps the
  // completed state / level chip fresh after the Quest screen saves.
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

  // Phase 4a (Flow E): after a decline, no modal re-nag for 7 days; from day
  // 7 the small "Growth" header button re-surfaces the paywall — dismissible,
  // never blocking content, no guilt copy. Derived fresh on every focus.
  const showGrowthButton =
    !!state && paywallSurface(state, today, false) === 'growth';

  const quest = pickToday(quests, today);
  const affirmation = pickToday(affirmations, today);
  const prompt = pickToday(prompts, today);
  const friendly = friendlyDate();

  const questDone = !!state && state.quests.lastQuestCompletionDate === today;
  const affirmationSaved = !!state && !!affirmation && state.savedAffirmationIds.includes(affirmation.id);

  // -----------------------------------------------------------------------
  // Phase 4b (§5 + S1): paid-only surfaces, all derived at interaction time.
  //  - Bonus (2nd daily) quest: paid only, one per day, +50 XP, never a loop
  //    credit. Free users never see an usable affordance — the gate is the
  //    data (`bonusQuestAvailable` is false for free), not a hidden button.
  //  - Themes (S1): paid sees all five themes + the library peek; free sees
  //    only today's quest theme. The daily quest itself is never gated.
  // -----------------------------------------------------------------------
  const bonusQuest =
    state && bonusQuestAvailable(state, today) ? pickBonusQuest(state, today) : undefined;
  const themes = state ? visibleThemes(state, today) : [];
  const browsingThemes = !!state && canBrowseThemes(state);
  const themeCounts = browsingThemes ? themeQuestCounts() : null;

  async function saveAffirm() {
    if (!state || !affirmation || affirmationSaved) return;
    try {
      const next = await saveAffirmation(state, affirmation);
      // Phase 5 (S5): the bonus (+5 XP) was actually granted — track the save.
      analytics.track('affirmation_saved', { affirmationId: affirmation.id });
      if (next.progress.level > state.progress.level) {
        analytics.track('level_up', { level: next.progress.level, totalXp: next.progress.totalXp });
      }
      setState(next);
    } catch {
      Alert.alert(
        'Could not save your affirmation',
        'It is stored on this device — please try again.',
      );
    }
  }

  /**
   * Phase 4b (§5): complete the paid bonus quest. Routed through
   * store.completeBonusQuest — the ONLY path that writes bonusCompletions —
   * so the XP award matches daily quests (+50, tier-gated level) while the
   * daily-loop ledger, streak, and paywall trigger are structurally untouched.
   * On null (cap met, free tier, or race) the card simply re-derives away.
   */
  async function finishBonusQuest() {
    if (!state || !bonusQuest || bonusBusy) return;
    setBonusBusy(true);
    try {
      const next = await completeBonusQuest(state, bonusQuest, today);
      if (next !== null) {
        // Phase 5 (S5): a REAL bonus completion — the +50 XP and the dedicated
        // ledger row both exist. The event carries the type + a loop flag so
        // the KPI can tell bonus completions apart from the daily loop.
        analytics.track('quest_completed', {
          questId: bonusQuest.id,
          type: bonusQuest.type,
          bonus: true,
        });
        if (next.progress.level > state.progress.level) {
          analytics.track('level_up', { level: next.progress.level, totalXp: next.progress.totalXp });
        }
      }
      setState(next ?? state);
    } catch {
      Alert.alert(
        'Could not save your bonus quest',
        'It is stored on this device — please try again.',
      );
    } finally {
      setBonusBusy(false);
    }
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{friendly}</Text>
          <Text style={styles.headline}>Today's quest</Text>
        </View>
        {state ? <StreakChip state={state} /> : null}
        {/* Phase 4a: the small, dismissible Growth re-surface (day 7+). */}
        {showGrowthButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Calm Quest+ — more ways to grow"
            onPress={() => navigation.navigate('Paywall', { source: 'growth' })}
            style={({ pressed }) => [styles.growthBtn, pressed && styles.pressed]}
          >
            <Text style={styles.growthText}>Growth</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings — daily gentle reminder"
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [styles.gearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.gearText}>⚙︎</Text>
        </Pressable>
      </View>
      {state ? <LevelChip state={state} /> : null}

      {/* Today's quest */}
      {quest ? (
        <QuestCard
          quest={quest}
          done={questDone}
          onBegin={() => navigation.navigate('Quest', { questId: quest.id })}
        />
      ) : (
        <Text style={cards.subtitle}>Quest library empty — nothing to show today.</Text>
      )}

      {/* Phase 4b (§5): the paid bonus quest — renders ONLY when
          bonusQuestAvailable (paid tier, none used today) yields a pick.
          Free users never see an usable card: the gate is the data. */}
      {bonusQuest ? (
        <BonusQuestCard
          quest={bonusQuest}
          busy={bonusBusy}
          onComplete={() => void finishBonusQuest()}
        />
      ) : null}

      {/* Affirmation of the day */}
      {affirmation ? (
        <AffirmationCard
          text={affirmation.text}
          id={affirmation.id}
          saved={affirmationSaved}
          onSave={() => void saveAffirm()}
        />
      ) : null}

      {/* Gratitude Glimpse — entry point (full mini-game is Phase 2c) */}
      {prompt ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Glimpse', { promptId: prompt.id })}
          style={({ pressed }) => [cards.card, styles.glimpseCard, pressed && styles.pressed]}
        >
          <View style={styles.chipRow}>
            <View style={[badges.chip, badges.sage]}>
              <Text style={[badges.chipText, badges.sageText]}>GRATITUDE GLIMPSE</Text>
            </View>
            <View style={[badges.chip, badges.sand]}>
              <Text style={[badges.chipText, badges.sandText]}>+{XP_GLIMPSE} XP</Text>
            </View>
          </View>
          <Text style={styles.glimpseTitle}>Take a Gratitude Glimpse</Text>
          <Text style={styles.glimpsePrompt}>“{prompt.prompt}”</Text>
          <Text style={[cards.small, styles.glimpseHint]}>
            A gentle 60-second reflection. The full guided screen is next in the
            loop — tap to see today's prompt.
          </Text>
        </Pressable>
      ) : null}

      {/* Phase 4b (S1): the Themes peek — read-only for all, full library for
          Calm Quest+. Free users see only today's theme; the daily quest is
          never gated. Non-blocking: no lock icons, no guilt, one calm link. */}
      {state ? (
        <ThemesCard
          themes={themes}
          browsing={browsingThemes}
          themeCounts={themeCounts}
          onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
        />
      ) : null}

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
  headerLeft: {
    flexShrink: 1,
  },
  gearBtn: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  growthBtn: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  gearText: {
    fontSize: 22,
    color: colors.inkSoft,
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
  levelWrap: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  levelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  levelXp: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  meterTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.creamDeep,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.teal,
  },
  levelHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.inkSoft,
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
  doneBox: {
    marginTop: spacing.md,
    backgroundColor: colors.tealSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  doneMark: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.tealDeep,
  },
  doneText: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    textAlign: 'center',
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
  saveChip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    marginTop: spacing.xs,
  },
  saveChipSaved: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
  },
  saveChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tealDeep,
  },
  saveChipTextSaved: {
    color: colors.sageDeep,
  },
  glimpseCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glimpseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  glimpsePrompt: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    color: colors.tealDeep,
    marginTop: spacing.xs,
  },
  glimpseHint: {
    marginTop: spacing.xs,
  },
  bonusCard: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.white,
  },
  themesCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeGrid: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  themeRowLocked: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  themeNameLocked: {
    color: colors.inkSoft,
    fontWeight: '600',
  },
  themeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tealDeep,
  },
  themeCountLocked: {
    fontSize: 12,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
  themeCta: {
    marginTop: spacing.xs,
    alignSelf: 'stretch',
  },
  streakChip: {
    alignSelf: 'center',
    backgroundColor: colors.sageSoft,
    maxWidth: '48%',
    flexShrink: 1,
  },
  streakChipGrace: {
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  streakChipResets: {
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.softCoral,
  },
  streakChipText: {
    color: colors.sageDeep,
  },
  streakChipTextGrace: {
    color: colors.inkSoft,
  },
  streakChipTextResets: {
    color: colors.inkSoft,
  },
  graceNote: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: '68%',
    alignSelf: 'center',
  },
  graceNoteResets: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 17,
    color: colors.softCoral,
    textAlign: 'center',
    maxWidth: '68%',
    alignSelf: 'center',
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