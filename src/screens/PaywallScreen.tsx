/**
 * Calm Quest — Paywall (Phase 4a; real store wired in Phase 7, spec §2 Flow E,
 * §5, F8).
 *
 * The one-time subscription decision point. Rules it lives by:
 *  - Value recap, 3 bullets max (spec's exact three).
 *  - Price toggle: Monthly / Yearly with "Best value". Prices are the STORE's
 *    own localized strings when the store answered, otherwise the configured
 *    ones ($9.99 / $59.99 ≈ $5/mo) — never a made-up number either way.
 *  - Primary CTA "Start 7-day free trial"; secondary "Continue free forever" is
 *    EQUALLY visible — same size, one tap, no guilt copy, no dark patterns.
 *  - NO scarcity, NO countdown, NO "limited offer", no fake urgency.
 *  - The trial begins ONLY on an explicit tap of the primary CTA, and only a
 *    VERIFIED store entitlement may ever flip tier to 'paid' (F8 guard). Every
 *    other ending — cancelled, pending, store unreachable, no store at all —
 *    says exactly what happened and charges nothing.
 *
 * Grace is untouched by any of this: the modal still appears once after the 3rd
 * completed loop, "Continue free forever" still suppresses it for 7 days, and a
 * first quest is never blocked (see src/subscription/paywall.ts).
 *
 * Route source: 'auto' = the one-time post-3rd-loop modal; 'growth' = the
 * small header re-surface after day 7. Same screen either way.
 *
 * Visual-Richness wave 3 (§3.5): richness that is TRUTHFUL — the five-theme
 * swatch row is the hero and it shows the real names and real tints, filled for
 * the themes this user actually holds and tint-at-55%-plus-gold-hairline for the
 * rest (the same grammar Home uses for gated themes). Value card gets goldBright
 * ✦ marks and hairline dividers, the free-forever note becomes an "already
 * yours" sand strip, plan cards take the selected/unselected pair from the
 * spec, and the honest-state boxes keep `paperDeep` plus a neutral status dot —
 * never red, because nothing was charged.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { analytics } from '../analytics';
import { THEME_LABELS } from '../content';
import type { AppRouteParamList } from '../navigation/types';
import { loadState, markPaywallSeen } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  authService,
  runTrialFlow,
  SUBSCRIPTION_PLANS,
  subscriptionService,
  THEME_ORDER,
  TRIAL_DAYS,
  visibleThemes,
  type PlanId,
  type PlanInfo,
  type TrialStatus,
} from '../subscription';
import {
  badges,
  buttons,
  cards,
  colors,
  page,
  radii,
  shadows,
  spacing,
  typeScale,
  ThemeSwatchRow,
  useScreenInsets,
} from '../theme';
import type { ThemeSwatchItem } from '../theme';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Paywall'>;

/**
 * The spec's three-bullet value recap (Flow E step 2 — three, not more).
 *
 * Build 14 (two-paths §3): bullet 1 is the proposal's exact proposed rewrite —
 * with three programs in the app, "all five themes, on demand" understated what
 * is held. Bullets 2 and 3 stay VERBATIM and become more true (the library is
 * per program now, and the archive behind bullet 3 exists since build 13).
 */
const VALUE_BULLETS: readonly string[] = [
  'All three programs, and every theme in each, on demand',
  'The full quest library, with repeats when a theme helps twice',
  'Unlimited Gratitude Glimpses, plus your whole archive',
];

/**
 * The free strip (build 14, proposal §3 optional edit): the honest free promise
 * now names the program rule too, because that is what the paywall is really
 * selling — holding all three at once, not access to a single one.
 */
const FREE_STRIP =
  'Free, and staying free: the daily quest, Affirmation of the Day, one Glimpse a day, grace streaks, levels 1–5, and one program at a time — yours to choose.';

/** The label above the program marks (build 14). The gold ✦ carries no words. */
const PROGRAMS_LABEL = 'PROGRAMS';
const ORNAMENT = '✦';

/**
 * Honest copy per ending. Every one of these means "nothing was charged unless
 * the store said so" — and only 'granted' ever unlocks anything.
 */
const OUTCOME_COPY: Record<Exclude<TrialStatus, 'granted'>, { title: string; copy: string }> = {
  stub: {
    title: 'Store setup coming soon',
    copy:
      'This build has no App Store connection, so no trial can start and nothing was charged. Your progress keeps accruing either way.',
  },
  store_unavailable: {
    title: 'The store isn\u2019t reachable right now',
    copy:
      'Subscribing needs the App Store build (TestFlight or the App Store). No trial started and nothing was charged — the daily loop stays free.',
  },
  user_cancelled: {
    title: 'No charge — nothing changed',
    copy:
      'You closed the App Store sheet, so no subscription started and nothing was charged. Your daily loop stays free, forever.',
  },
  pending: {
    title: 'Waiting on the store',
    copy:
      'The App Store hasn\u2019t confirmed that yet — this happens with Ask to Buy or a slow connection. If it goes through, Calm Quest+ unlocks on its own and you\u2019ll see it here; until the store confirms, nothing is unlocked. You were not charged twice.',
  },
  failed: {
    title: 'The store couldn\u2019t finish that',
    copy:
      'Something went wrong on the App Store side and nothing was charged. Try again whenever you like — or keep going free; everything you\u2019ve earned stays yours.',
  },
};

export default function PaywallScreen({
  route,
}: {
  route: { params: { source: 'auto' | 'growth' } } | { params?: undefined };
}) {
  const navigation = useNavigation<Nav>();
  const source = route.params?.source ?? 'auto';

  // Safe-area fix: additive device insets on top of the design padding — the
  // header clears the cutout, and the bottom inset keeps the CTA rows (still
  // inside the scroll body) clear of the home indicator.
  const screenInsets = useScreenInsets(spacing.xl, spacing.xl);

  const [state, setState] = useState<AppState | null>(null);
  const [plan, setPlan] = useState<PlanId>('yearly'); // "Best value" preselected
  // Price rows: the store's localized prices once it answers, configured ones
  // until then (and forever, in a build with no store).
  const [plans, setPlans] = useState<readonly PlanInfo[]>(SUBSCRIPTION_PLANS);
  // 'asking' covers the store sheet being up; 'granted' is reachable ONLY from
  // a verified store entitlement. `note` carries every other honest ending
  // ('granted' is impossible here by type — a grant is a success, not a note).
  const [storeState, setStoreState] = useState<'idle' | 'asking' | 'granted'>('idle');
  const [note, setNote] = useState<Exclude<TrialStatus, 'granted'> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadState().then((s) => {
      if (active) setState(s);
    });
    // Ask the store for real prices. A failure is not shown as an error here:
    // the configured prices stand and the CTA still reports the truth on tap.
    subscriptionService
      .getPlans()
      .then((result) => {
        if (active && result.ok && result.value && result.value.length > 0) setPlans(result.value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Phase 5 (S5): the paywall was SHOWN (auto or growth surface). Fired once
  // per screen mount — exactly the moment the user sees the decision point.
  useEffect(() => {
    analytics.track('paywall_seen', { source });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "Continue free forever": stamp the FIRST decline date, close, no guilt. */
  async function continueFree() {
    if (!state) return;
    try {
      const next = await markPaywallSeen(state, today());
      setState(next);
    } catch {
      // Stamp failure must never trap the user on the paywall.
    }
    navigation.goBack();
  }

  /**
   * "Start 7-day free trial": the typed F10 + F8 sequence, orchestrated by
   * `runTrialFlow` (best-effort account merge → store purchase → verified
   * entitlement applied through the single store-side writer). Analytics fires
   * only on real events: 'trial_started' once the store is genuinely reachable,
   * 'trial_converted' only when a verified entitlement landed.
   */
  async function startTrial() {
    if (busyRef.current || storeState === 'granted') return;
    busyRef.current = true;
    setStoreState('asking');
    setNote(null);
    try {
      const available = await subscriptionService.isAvailable();
      // Phase 5 (S5): the trial flow truly STARTED (store reachable). Never
      // fires for a build with no store — there is no trial to start.
      if (available) analytics.track('trial_started', { plan });

      const guest = state ?? (await loadState());
      const outcome = await runTrialFlow({
        service: subscriptionService,
        auth: authService,
        guest,
        plan,
      });
      setState(outcome.state);

      if (outcome.status === 'granted') {
        // Fires ONLY on a VERIFIED entitlement landing (tier 'paid' persisted).
        analytics.track('trial_converted', {
          plan,
          expiry: outcome.entitlement?.expiry ?? null,
        });
        setStoreState('granted');
      } else {
        setStoreState('idle');
        setNote(outcome.status);
      }
    } catch {
      setStoreState('idle');
      setNote('failed');
    } finally {
      busyRef.current = false;
    }
  }

  const asking = storeState === 'asking';
  const granted = storeState === 'granted';
  const yearly = plans.find((p) => p.id === 'yearly');
  const selected = plans.find((p) => p.id === plan);

  // The swatch row's availability comes from the app's REAL gate derivation —
  // never a guess about what this user holds. Until the first load resolves the
  // honest baseline claims NOTHING: a paid user cannot reach this screen at all
  // (`paywallSurface` returns null for a paid tier), and a free user's held
  // theme is decided by the program their profile holds, which is not known
  // until the state lands. Under-claiming for one frame, never a guess.
  const day = today();
  const available = state ? visibleThemes(state, day) : [];
  const swatchItems: ThemeSwatchItem[] = THEME_ORDER.map((t) => ({
    theme: t,
    name: THEME_LABELS[t],
    available: available.includes(t),
  }));

  return (
    <ScrollView style={page.screen} contentContainerStyle={[page.content, styles.container, screenInsets]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[badges.chip, badges.gold]}>
          <Text style={[badges.chipText, badges.goldText]}>CALM QUEST+</Text>
        </View>
        {source === 'growth' ? (
          <Text style={styles.sourceNote}>A quiet reminder of what's here — no pressure.</Text>
        ) : null}
      </View>
      <Text style={[typeScale.display, styles.title]}>More ways to grow, whenever you want them</Text>
      <Text style={styles.subtitle}>
        The daily loop you're using stays free, forever. Calm Quest+ adds more
        of it, on your schedule.
      </Text>

      {/* The hero: five tinted marks with their REAL names — filled for the
          themes this user holds, tint at ~55% + a gold hairline for the rest.
          §3.5.1's picture of bullet #1, drawn from real data only. */}
      <View style={[cards.card, styles.swatchCard]}>
        <ThemeSwatchRow items={swatchItems} />
      </View>

      {/* Value recap — exactly three bullets (Flow E step 2), on goldBright ✦
          marks with a hairline rule between them. */}
      <View style={[cards.card, styles.valueCard]}>
        {VALUE_BULLETS.map((b, i) => (
          <View key={b}>
            {i > 0 ? <View style={styles.bulletRule} /> : null}
            <View style={styles.bulletRow}>
              <Text style={styles.bulletDot}>✦</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          </View>
        ))}
        {/* "Already yours" — the free-forever note, copy verbatim, on sand. */}
        <View style={styles.freeStrip}>
          <Text style={styles.freeStripText}>
            Free, and staying free: the daily quest, Affirmation of the Day, one
            Glimpse a day, grace streaks, and levels 1–5.
          </Text>
        </View>
      </View>

      {/* Price toggle — descriptive badge only, never urgency */}
      <View style={styles.planRow}>
        {plans.map((p) => {
          const isSelected = plan === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setPlan(p.id)}
              style={({ pressed }) => [
                styles.planCard,
                isSelected && styles.planCardSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.planTop}>
                <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                  {p.id === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {p.badge ? (
                  <View style={[badges.chip, badges.gold, styles.planBadge]}>
                    <Text style={[badges.chipText, badges.goldText]}>{p.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planPrice}>{p.price}</Text>
              <Text style={styles.planPer}>{p.perMonth ?? 'per month'}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Primary CTA — trial starts ONLY here, only on a verified grant */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: asking || granted }}
        disabled={asking || granted}
        onPress={() => void startTrial()}
        style={({ pressed }) => [
          buttons.primary,
          (asking || granted) && buttons.disabled,
          pressed && styles.pressed,
          styles.cta,
        ]}
      >
        <Text
          style={[buttons.primaryText, (asking || granted) && buttons.disabledText]}
        >
          {granted
            ? 'You\u2019re in — welcome to Calm Quest+'
            : `Start ${TRIAL_DAYS}-day free trial`}
        </Text>
      </Pressable>

      {/* Honest state per ending: says exactly what is (and isn't) happening. */}
      {asking ? (
        <Text style={styles.askingNote}>
          {subscriptionService.source === 'store'
            ? 'Opening the App Store…'
            : 'Checking the store…'}
        </Text>
      ) : note ? (
        <View style={styles.honestBox}>
          {/* A neutral status dot: pending/failed are information, never an
              error — nothing was charged, so nothing here is red (§3.5.4).
              Decoration: hidden from assistive tech (the title + copy beside it
              carry the whole meaning). */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.honestDot}
          />
          <View style={styles.honestBody}>
            <Text style={styles.honestTitle}>{OUTCOME_COPY[note].title}</Text>
            <Text style={styles.honestCopy}>{OUTCOME_COPY[note].copy}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.trialNote}>
          {TRIAL_DAYS} days free, then{' '}
          {plan === 'yearly'
            ? `${yearly?.price ?? '$59.99'}/year`
            : `${selected?.price ?? '$9.99'}/month`}{' '}
          — cancel anytime, in the store, in two taps. You keep everything you
          earned, always.
        </Text>
      )}

      {/* Secondary CTA — equally visible, one tap, zero guilt (Flow E rule) */}
      <Pressable
        accessibilityRole="button"
        onPress={() => void continueFree()}
        style={({ pressed }) => [buttons.ghost, styles.continueBtn, pressed && styles.pressed]}
      >
        <Text style={buttons.ghostText}>Continue free forever</Text>
      </Pressable>
      <Text style={styles.footNote}>
        Either way, your quest is ready tomorrow — no reminders from us about
        this screen.
      </Text>
    </ScrollView>
  );
}

/** Local date; same helper the rest of the app stamps days with. */
function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  sourceNote: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.inkSoft,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  swatchCard: {
    // The paywall hero (§2.2: `raised` is reserved for today's quest card, the
    // level-up overlay and this one).
    ...shadows.raised,
    marginBottom: spacing.md,
  },
  valueCard: {
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
    marginVertical: spacing.sm,
  },
  bulletDot: {
    color: colors.goldBright,
    fontSize: 14,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    fontWeight: '600',
  },
  freeStrip: {
    // The free-forever note as an "already yours" strip — copy verbatim.
    marginTop: spacing.md,
    backgroundColor: colors.sand,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  freeStripText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planCard: {
    flex: 1,
    // Unselected: paper surface, 2px sand border. Same border WIDTH in both
    // states, so selecting a plan never shifts the layout.
    borderWidth: 2,
    borderColor: colors.sand,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
  },
  planCardSelected: {
    // Selected: card surface + 2px teal border.
    borderColor: colors.teal,
    backgroundColor: colors.card,
    ...shadows.flat,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  planNameSelected: {
    color: colors.tealDeep,
  },
  planBadge: {
    alignSelf: 'flex-start',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  planPer: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  cta: {
    marginTop: spacing.xs,
  },
  trialNote: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  askingNote: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  honestBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.paperDeep,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  honestDot: {
    // Neutral inkFaint (≈3.3:1 on paperDeep — a ≥3:1 meaningful graphic that
    // reads as "here is what happened", never as a warning).
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inkFaint,
    marginTop: 5,
    flexShrink: 0,
  },
  honestBody: {
    flex: 1,
  },
  honestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  honestCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  continueBtn: {
    marginTop: spacing.md,
  },
  footNote: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
});
