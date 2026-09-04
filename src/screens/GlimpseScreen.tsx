/**
 * Calm Quest — Gratitude Glimpse mini-game (Phase 2c, feature spec §3 F3,
 * §2 Flow B step 4).
 *
 * The loop's zero-pressure proof point: today's prompt (deterministic
 * rotation, same as Home), a soft ambient 60s progress ring (an invite, never
 * a timer that punishes — finishing early or ignoring it is fine), a
 * free-text box where one word counts, and a Complete tap that archives the
 * entry to "My Glimpses" and awards +20 XP. One credit per local day:
 * a same-day return shows the saved entry back with no re-award.
 *
 * Guardrails: no medical claims, no guilt, no scarcity, no fake progress —
 * XP arrives only from a real Completed tap via `saveGlimpse`.
 *
 * Phase 4b (§5): the free tier gets ONE glimpse per local day — derived from
 * the persisted ledger at interaction time (`glimpseCapReached`), so closing
 * and reopening can never grant a second one. When the cap is reached the
 * screen becomes a calm, honest note ("your one glimpse for today is
 * complete") with a quiet Calm Quest+ invitation — no guilt, no mockery,
 * tomorrow's free glimpse is never in question. Calm Quest+ is unlimited:
 * a paid user can write another glimpse any time, and `saveGlimpse` archives
 * each with a unique id.
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

import { pickToday, prompts } from '../content';
import { dayNumber } from '../content/rotation';
import type { AppRouteParamList } from '../navigation/types';
import type { GlimpseEntry } from '../models/types';
import { levelForXp, levelTitleInfo, XP_GLIMPSE } from '../progress/progress';
import { glimpseForDate, loadState, saveGlimpse } from '../storage/store';
import type { AppState } from '../storage/store';
import { paywallSurface } from '../subscription/paywall';
import { glimpseCapReached } from '../subscription/gates';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';
import { localDateString } from '../utils/daily';

/** Ambient ring length: ~60 seconds of gentle ticks. Never a hard stop. */
const RING_SECONDS = 60;
const RING_TICKS = 48;
const RING_SIZE = 132;
const RING_RADIUS = 56;

/**
 * Gentle completion lines, grace-toned: no outcomes promised, no guilt,
 * no scarcity, no medical claims. Rotated deterministically by date.
 */
const KEEPSAKE_LINES: readonly string[] = [
  'Small mercies count. This one is kept.',
  'Noticed with a grateful heart — held lightly.',
  'A good thing, kept gently for tomorrow.',
  'Grace for today, quietly noted.',
];

function keepsakeLine(today: string): string {
  return KEEPSAKE_LINES[dayNumber(today) % KEEPSAKE_LINES.length] as string;
}

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Glimpse'>;

// ---------------------------------------------------------------------------
// Ambient progress ring — 48 soft ticks that fill over ~60s, then rest full.
// Purely decorative: finishing early or ignoring it changes nothing.
// ---------------------------------------------------------------------------

function AmbientRing({ elapsed }: { elapsed: number }) {
  const lit = Math.min(
    RING_TICKS,
    Math.floor((Math.min(elapsed, RING_SECONDS) / RING_SECONDS) * RING_TICKS),
  );
  const center = RING_SIZE / 2;
  const ticks = [];
  for (let i = 0; i < RING_TICKS; i += 1) {
    const angle = (i / RING_TICKS) * Math.PI * 2 - Math.PI / 2;
    const x = center + RING_RADIUS * Math.cos(angle) - 3;
    const y = center + RING_RADIUS * Math.sin(angle) - 3;
    ticks.push(
      <View
        key={i}
        style={[styles.tick, { left: x, top: y }, i < lit ? styles.tickLit : styles.tickDim]}
      />,
    );
  }
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: RING_SECONDS,
        now: Math.min(elapsed, RING_SECONDS),
        text: elapsed < RING_SECONDS ? 'a quiet minute, still unfolding' : 'a quiet minute, complete — take your time',
      }}
      style={styles.ring}
    >
      {ticks}
      <View style={styles.ringCenter}>
        <Text style={styles.ringCenterText}>
          {elapsed < RING_SECONDS ? 'a quiet\nminute' : 'take your\ntime'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Completion card — entry shown back + "Saved to your glimpses" + keepsake
// ---------------------------------------------------------------------------

function GlimpseCompleteCard({
  entry,
  leveledUp,
  levelGated,
  level,
  today,
  onSeePlus,
  onDone,
}: {
  entry: GlimpseEntry;
  leveledUp: boolean;
  /** Phase 4a: raw level crossed into L6+ while tier is free — honest gate. */
  levelGated: boolean;
  level: number;
  today: string;
  onSeePlus: () => void;
  onDone: () => void;
}) {
  const info = levelTitleInfo(level);
  return (
    <View style={[cards.card, styles.doneCard]}>
      <Text style={styles.doneCheck}>✓</Text>
      <Text style={styles.doneTitle}>Gratitude practiced.</Text>
      <Text style={styles.doneXp}>+{XP_GLIMPSE} XP · Saved to your glimpses</Text>
      <View style={styles.entryBox}>
        <Text style={styles.entryText}>“{entry.text}”</Text>
      </View>
      <Text style={styles.keepsake}>{keepsakeLine(today)}</Text>
      {levelGated ? (
        <>
          <Text style={styles.gateNote}>
            That level is part of Calm Quest+ — your XP is safe and keeps
            counting. Levels 1–5 stay free, always.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onSeePlus}
            style={({ pressed }) => [buttons.ghost, pressed && styles.pressed]}
          >
            <Text style={buttons.ghostText}>See what Calm Quest+ includes</Text>
          </Pressable>
        </>
      ) : leveledUp ? (
        <Text style={styles.levelNote}>
          Level {level} · {info.title} — {info.blessing}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={({ pressed }) => [buttons.primary, styles.doneBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>Back to today</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Phase 4b (§5): the free glimpse cap, reached. Calm and honest — the day's
 * glimpse is complete, nothing is wrong, tomorrow's is already waiting. The
 * Calm Quest+ mention is a quiet invitation, never pressure (the brief's
 * exact copy, lightly framed).
 */
function GlimpseCapCard({
  entry,
  onSeePlus,
  onDone,
}: {
  entry: GlimpseEntry;
  onSeePlus: () => void;
  onDone: () => void;
}) {
  return (
    <View style={[cards.card, styles.doneCard]}>
      <Text style={styles.doneCheck}>✓</Text>
      <Text style={styles.doneTitle}>Your one glimpse for today is complete.</Text>
      <View style={styles.entryBox}>
        <Text style={styles.entryText}>“{entry.text}”</Text>
      </View>
      <Text style={styles.keepsake}>
        Saved to your glimpses. Come back tomorrow — your next glimpse will be
        waiting.
      </Text>
      <Text style={styles.gateNote}>
        Calm Quest+ gives you as many glimpses as you like, any day.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSeePlus}
        style={({ pressed }) => [buttons.ghost, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>See what Calm Quest+ includes</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={({ pressed }) => [buttons.primary, styles.doneBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.primaryText}>Back to today</Text>
      </Pressable>
    </View>
  );
}

export default function GlimpseScreen({ route }: { route: { params: { promptId: string } } }) {
  const navigation = useNavigation<Nav>();
  const { promptId } = route.params;
  const today = localDateString();

  const [state, setState] = useState<AppState | null>(null);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [savedEntry, setSavedEntry] = useState<GlimpseEntry | null>(null);
  const [freshSave, setFreshSave] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const [levelGated, setLevelGated] = useState(false);
  const [savedLevel, setSavedLevel] = useState(1);
  // Phase 4b (§5): true when the FREE daily cap is reached — derived from the
  // persisted ledger at load (and re-derived after any save), never from an
  // in-memory flag, so close-and-reopen cannot grant another glimpse.
  const [capReached, setCapReached] = useState(false);
  const busyRef = useRef(false);
  const startXpRef = useRef<number | null>(null);
  // Phase 4a (Flow E): one-time paywall, queued behind the completion card.
  const [pendingPaywall, setPendingPaywall] = useState(false);

  // Today's prompt: prefer the one Home passed (same rotation), fall back to
  // the deterministic pick so a deep link never shows a blank screen.
  const prompt =
    prompts.find((p) => p.id === promptId) ?? pickToday(prompts, today) ?? prompts[0];

  useEffect(() => {
    let active = true;
    loadState().then((s) => {
      if (!active) return;
      setState(s);
      startXpRef.current = s.progress.totalXp;
      const existing = glimpseForDate(s, today);
      if (existing) {
        // Already saved today: saved state, no re-award possible for free.
        setSavedEntry(existing);
        setDone(true);
        setSavedLevel(s.progress.level);
        // Phase 4b: for a free user this same-day return IS the cap state —
        // their one glimpse is written. Derived from the persisted ledger,
        // so close-and-reopen cannot conjure another. Paid users are past
        // the cap by definition (unlimited) and get a "write another" card.
        setCapReached(glimpseCapReached(s, today));
      } else if (glimpseCapReached(s, today)) {
        // Defensive: ledger says the free cap is met but no same-day entry
        // resolved (should not happen — same source). Calm cap card, no game.
        setCapReached(true);
      }
    });
    return () => {
      active = false;
    };
  }, [today]);

  // Ambient ring ticker: one timeout chain, caps at 60s, never blocks.
  useEffect(() => {
    if (done || elapsed >= RING_SECONDS) return;
    const t = setTimeout(() => {
      setElapsed((s) => Math.min(RING_SECONDS, s + 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [elapsed, done]);

  if (!state || !prompt) {
    return (
      <View style={styles.bootBox}>
        <Text style={cards.subtitle}>Loading today&rsquo;s glimpse…</Text>
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

  const currentState = state;
  const canComplete = text.trim().length > 0;

  async function finishGlimpse() {
    if (done || busyRef.current || !canComplete) return;
    busyRef.current = true;
    try {
      const before = startXpRef.current ?? currentState.progress.totalXp;
      const entry: GlimpseEntry = {
        id: `glimpse-${today}`,
        date: today,
        text: text.trim(),
        promptId: prompt?.id ?? null,
      };
      const next = await saveGlimpse(currentState, entry);
      if (next === null) {
        // Free cap already met and saved elsewhere mid-session (defensive):
        // show the archived entry. A paid user never lands here (unlimited).
        const existing = glimpseForDate(currentState, today);
        if (existing) {
          setSavedEntry(existing);
          setSavedLevel(currentState.progress.level);
          setDone(true);
          setCapReached(glimpseCapReached(currentState, today));
        } else {
          navigation.goBack();
        }
        return;
      }
      // Phase 4a level gating: raw level crossed into L6+ while tier is free.
      // The persisted level is already capped (saveGlimpse stores
      // displayLevel); this only swaps the celebration note for the gate note.
      const rawBefore = levelForXp(before);
      const rawAfter = levelForXp(next.progress.totalXp);
      const gated = rawBefore < rawAfter && rawAfter > 5 && next.progress.level <= 5;
      setLevelGated(gated);
      setLeveledUp(!gated && levelForXp(before) < next.progress.level);
      setSavedLevel(next.progress.level);
      setSavedEntry(entry);
      setFreshSave(true);
      setState(next);
      setDone(true);

      // Phase 4a (Flow E): queue the one-time paywall if this glimpse is the
      // 3rd completed loop — presented after the completion card, never over it.
      if (paywallSurface(next, today, true) === 'auto') {
        setPendingPaywall(true);
      }
    } catch {
      Alert.alert(
        'Could not save your glimpse',
        'It is stored on this device — please try again.',
      );
    } finally {
      busyRef.current = false;
    }
  }

  // Done view: a fresh completion shows the entry back with its +20 XP;
  // a same-day return shows the archived entry — for a free user that IS the
  // daily cap state (no re-award possible), for Calm Quest+ it carries a
  // "write another" affordance (unlimited). Neither path can double-credit:
  // saveGlimpse guards the free tier by date, and paid entries always append.
  /** Leave the screen; route to the queued paywall first, if the 3rd loop queued it. */
  function leaveAfterCompletion() {
    if (pendingPaywall) {
      setPendingPaywall(false);
      navigation.navigate('Paywall', { source: 'auto' });
      return;
    }
    navigation.goBack();
  }

  /** Phase 4b (§5, paid only): unlimited glimpses — reset to a fresh write. */
  function writeAnother() {
    setDone(false);
    setSavedEntry(null);
    setFreshSave(false);
    setLeveledUp(false);
    setLevelGated(false);
    setCapReached(false);
    setText('');
    setElapsed(0);
    // Fresh XP baseline so the next completion's level math is its own.
    startXpRef.current = null;
  }

  if (done && savedEntry) {
    // Phase 4b (§5): the FREE cap state — the one glimpse for today is in the
    // persisted ledger, so this screen shows the calm cap card (derived at
    // interaction time; close-and-reopen cannot grant another). Paid is never
    // capped, so it never reaches this branch.
    if (capReached) {
      return (
        <ScrollView
          style={page.screen}
          contentContainerStyle={[page.content, styles.container]}
        >
          <View style={[badges.chip, badges.sage, styles.badge]}>
            <Text style={[badges.chipText, badges.sageText]}>GRATITUDE GLIMPSE</Text>
          </View>
          <GlimpseCapCard
            entry={savedEntry}
            onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
            onDone={() => navigation.goBack()}
          />
        </ScrollView>
      );
    }
    return (
      <ScrollView
        style={page.screen}
        contentContainerStyle={[page.content, styles.container]}
      >
        <View style={[badges.chip, badges.sage, styles.badge]}>
          <Text style={[badges.chipText, badges.sageText]}>GRATITUDE GLIMPSE</Text>
        </View>
        {freshSave ? (
          <GlimpseCompleteCard
            entry={savedEntry}
            leveledUp={leveledUp}
            levelGated={levelGated}
            level={savedLevel}
            today={today}
            onSeePlus={() => navigation.navigate('Paywall', { source: 'growth' })}
            onDone={leaveAfterCompletion}
          />
        ) : (
          <View style={[cards.card, styles.doneCard]}>
            <Text style={styles.doneCheck}>✓</Text>
            <Text style={styles.doneTitle}>Glimpse saved today — see you tomorrow.</Text>
            <View style={styles.entryBox}>
              <Text style={styles.entryText}>“{savedEntry.text}”</Text>
            </View>
            <Text style={styles.keepsake}>
              Saved to your glimpses. {keepsakeLine(today)}
            </Text>
            {/* Phase 4b (§5): Calm Quest+ is unlimited — a paid user who
                reopens today's glimpse can write another, any time. Free
                users see no such affordance (their one glimpse is written;
                the cap card handles their same-day state). */}
            {currentState.entitlements.tier === 'paid' ? (
              <Pressable
                accessibilityRole="button"
                onPress={writeAnother}
                style={({ pressed }) => [buttons.ghost, styles.againBtn, pressed && styles.pressed]}
              >
                <Text style={buttons.ghostText}>Write another glimpse</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [buttons.primary, styles.doneBtn, pressed && styles.pressed]}
            >
              <Text style={buttons.primaryText}>Back to today</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[badges.chip, badges.sage, styles.badge]}>
        <Text style={[badges.chipText, badges.sageText]}>GRATITUDE GLIMPSE</Text>
      </View>
      <Text style={styles.title}>A grateful glance</Text>
      <Text style={styles.prompt}>{prompt.prompt}</Text>

      <AmbientRing elapsed={elapsed} />

      <View style={[cards.card, styles.writeCard]}>
        <Text style={styles.hint}>One word is enough. There&rsquo;s no right answer.</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="A word, a line — whatever comes"
          placeholderTextColor={colors.inkSoft}
          multiline
          accessibilityLabel="Your gratitude glimpse"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canComplete }}
          disabled={!canComplete}
          onPress={() => void finishGlimpse()}
          style={({ pressed }) => [
            buttons.primary,
            !canComplete && buttons.disabled,
            pressed && canComplete && styles.pressed,
            styles.completeBtn,
          ]}
        >
          <Text style={[buttons.primaryText, !canComplete && buttons.disabledText]}>
            Complete · +{XP_GLIMPSE} XP
          </Text>
        </Pressable>
        <Text style={styles.xpHint}>+{XP_GLIMPSE} XP when you finish · kept private, on this device.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
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
    fontSize: 19,
    lineHeight: 28,
    color: colors.tealDeep,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  tickLit: {
    backgroundColor: colors.teal,
  },
  tickDim: {
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  writeCard: {
    alignSelf: 'stretch',
  },
  hint: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    alignSelf: 'stretch',
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
  doneXp: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldDeep,
    marginBottom: spacing.md,
  },
  entryBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  entryText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  keepsake: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  levelNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.goldDeep,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  gateNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  doneBtn: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  againBtn: {
    marginBottom: spacing.xs,
    alignSelf: 'stretch',
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
  pressed: {
    opacity: 0.88,
  },
});
