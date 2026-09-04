/**
 * Calm Quest — Paywall (Phase 4a, feature spec §2 Flow E, §5, F8).
 *
 * The one-time subscription decision point. Rules it lives by:
 *  - Value recap, 3 bullets max (spec's exact three).
 *  - Price toggle: Monthly $9.99 / Yearly $59.99 ≈ $5/mo · "Best value".
 *  - Primary CTA "Start 7-day free trial"; secondary "Continue free forever"
 *    is EQUALLY visible — same size, one tap, no guilt copy, no dark patterns.
 *  - NO scarcity, NO countdown, NO "limited offer", no fake urgency.
 *  - The trial begins ONLY on an explicit tap of the primary CTA, and only a
 *    VERIFIED entitlement from the SubscriptionService may ever flip tier to
 *    'paid' (F8 guard). While the store seam is stubbed, the CTA shows the
 *    honest state: "Store setup coming soon — this builds the moment you're
 *    ready." Nothing claims a trial started when none did, and nothing is
 *    charged (there is no store to charge).
 *
 * Phase 4b (F10 continuation): the trial path is now typed end to end — the
 * AuthService seam runs FIRST (create-or-sign-in), and on a real account the
 * guest's local state is merged with `mergeGuestState` (higher streak wins,
 * XP never drops, glimpses union) before the entitlement is applied. With
 * the stub, auth answers reason 'stub' and the flow stops at the same honest
 * "coming soon" state as before — no fake signup UI, no fabricated accounts,
 * no "account created" moments.
 *
 * Route source: 'auto' = the one-time post-3rd-loop modal; 'growth' = the
 * small header re-surface after day 7. Same screen either way.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import { loadState, markPaywallSeen } from '../storage/store';
import type { AppState } from '../storage/store';
import {
  isStubUnavailable,
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
  type PlanId,
  type SubscriptionService,
} from '../subscription';
import { authService } from '../subscription/authStub';
import { mergeGuestState } from '../subscription/merge';
import { subscriptionService } from '../subscription/stub';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Paywall'>;

/** The spec's three-bullet value recap (Flow E step 2 — three, not more). */
const VALUE_BULLETS: readonly string[] = [
  'All five themes, on demand — not just today\u2019s quest',
  'The full quest library, with repeats when a theme helps twice',
  'Unlimited Gratitude Glimpses, plus your whole archive',
];

export default function PaywallScreen({
  route,
}: {
  route: { params: { source: 'auto' | 'growth' } } | { params?: undefined };
}) {
  const navigation = useNavigation<Nav>();
  const source = route.params?.source ?? 'auto';

  const [state, setState] = useState<AppState | null>(null);
  const [plan, setPlan] = useState<PlanId>('yearly'); // "Best value" preselected
  // Honest store state: 'idle' → 'asking' → 'unavailable' (stub) or 'granted'
  // (real service + verified entitlement only). 'granted' is unreachable in
  // the stub by construction.
  const [storeState, setStoreState] = useState<'idle' | 'asking' | 'unavailable' | 'granted'>(
    'idle',
  );
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadState().then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
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
   * "Start 7-day free trial": the typed F10 sequence. (1) AuthService seam —
   * create-or-sign-in; with the stub this answers reason 'stub' and the flow
   * stops at the honest "coming soon" state, exactly as before. (2) On a real
   * account, merge the guest's local state with `mergeGuestState` (higher
   * streak wins, XP never drops, glimpses union) and persist the merged
   * state. (3) Only then the SubscriptionService purchase; only a VERIFIED
   * entitlement snapshot may flip tier to 'paid' (F8 guard). No fake signup
   * UI, no fabricated accounts, no "account created" moments anywhere.
   */
  async function startTrial(service: SubscriptionService) {
    if (busyRef.current || storeState === 'granted') return;
    busyRef.current = true;
    setStoreState('asking');
    try {
      // Step 1 — auth (F10). Stub → reason 'stub', stop honestly.
      const authAvailable = await authService.isAvailable();
      if (!authAvailable) {
        setStoreState('unavailable');
        return;
      }
      const auth = await authService.createOrSignIn();
      if (!auth.ok || !auth.account) {
        setStoreState('unavailable');
        return;
      }
      // Step 2 — guest → account merge (F10) and persist. `state` is the
      // guest's local snapshot; the account's remote snapshot came from the
      // real auth provider.
      const guest = state ?? (await loadState());
      const merged = mergeGuestState(guest, auth.account);
      const { saveState } = await import('../storage/store');
      await saveState(merged);
      setState(merged);
      // Step 3 — the store. Same rules as Phase 4a: only a verified snapshot.
      const available = await service.isAvailable();
      if (!available) {
        setStoreState('unavailable');
        return;
      }
      const result = await service.purchase(plan);
      if (!result.ok || !result.value) {
        setStoreState('unavailable');
        return;
      }
      const { applyEntitlement } = await import('../storage/store');
      const next = await applyEntitlement(merged, result.value);
      setState(next);
      setStoreState('granted');
    } catch {
      setStoreState('unavailable');
    } finally {
      busyRef.current = false;
    }
  }

  const yearly = SUBSCRIPTION_PLANS.find((p) => p.id === 'yearly');

  return (
    <ScrollView style={page.screen} contentContainerStyle={[page.content, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[badges.chip, badges.gold]}>
          <Text style={[badges.chipText, badges.goldText]}>CALM QUEST+</Text>
        </View>
        {source === 'growth' ? (
          <Text style={styles.sourceNote}>A quiet reminder of what's here — no pressure.</Text>
        ) : null}
      </View>
      <Text style={styles.title}>More ways to grow, whenever you want them</Text>
      <Text style={styles.subtitle}>
        The daily loop you're using stays free, forever. Calm Quest+ adds more
        of it, on your schedule.
      </Text>

      {/* Value recap — exactly three bullets (Flow E step 2) */}
      <View style={[cards.card, styles.valueCard]}>
        {VALUE_BULLETS.map((b) => (
          <View key={b} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>✦</Text>
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
        <Text style={styles.freeNote}>
          Free, and staying free: the daily quest, Affirmation of the Day, one
          Glimpse a day, grace streaks, and levels 1–5.
        </Text>
      </View>

      {/* Price toggle — descriptive badge only, never urgency */}
      <View style={styles.planRow}>
        {SUBSCRIPTION_PLANS.map((p) => {
          const selected = plan === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPlan(p.id)}
              style={({ pressed }) => [
                styles.planCard,
                selected && styles.planCardSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.planTop}>
                <Text style={[styles.planName, selected && styles.planNameSelected]}>
                  {p.id === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {p.badge ? (
                  <View style={[badges.chip, badges.sage, styles.planBadge]}>
                    <Text style={[badges.chipText, badges.sageText]}>{p.badge}</Text>
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
        accessibilityState={{ disabled: storeState === 'asking' || storeState === 'granted' }}
        disabled={storeState === 'asking' || storeState === 'granted'}
        onPress={() => void startTrial(subscriptionService)}
        style={({ pressed }) => [
          buttons.primary,
          (storeState === 'asking' || storeState === 'granted') && buttons.disabled,
          pressed && styles.pressed,
          styles.cta,
        ]}
      >
        <Text
          style={[
            buttons.primaryText,
            (storeState === 'asking' || storeState === 'granted') && buttons.disabledText,
          ]}
        >
          {storeState === 'granted'
            ? 'You\u2019re in — welcome to Calm Quest+'
            : `Start ${TRIAL_DAYS}-day free trial`}
        </Text>
      </Pressable>

      {/* Honest stub state: says exactly what is (and isn't) happening. */}
      {storeState === 'unavailable' ? (
        <View style={styles.honestBox}>
          <Text style={styles.honestTitle}>Store setup coming soon</Text>
          <Text style={styles.honestCopy}>
            This builds the moment you're ready — the App Store connection isn't
            set up yet, so no trial can start and nothing was charged. Your
            progress keeps accruing either way.
          </Text>
        </View>
      ) : storeState === 'asking' ? (
        <Text style={styles.askingNote}>Checking the store…</Text>
      ) : (
        <Text style={styles.trialNote}>
          {TRIAL_DAYS} days free, then{' '}
          {plan === 'yearly' ? `${yearly?.price ?? '$59.99'}/year` : '$9.99/month'} — cancel
          anytime, in the store, in two taps. You keep everything you earned,
          always.
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
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  valueCard: {
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    color: colors.gold,
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
  freeNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  planCardSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
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
    backgroundColor: colors.creamDeep,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
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
