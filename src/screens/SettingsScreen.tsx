/**
 * Calm Quest — Settings (Phase 3, feature spec §3 F9; reminder per F7).
 *
 * MVP Settings = the gentle daily reminder: a toggle (default ON) + a time
 * picker (default 08:00), persisted in the profile and synced to exactly ONE
 * scheduled local notification. Copy is soft and honest — "One nudge a day,
 * whenever you choose — never more." Grace is never purchasable: there is no
 * upgrade UI here (and none anywhere in the app).
 *
 * Permission handling (kind, no nagging):
 *  - Reminder defaults ON; the first time this screen opens we ask the OS
 *    permission once (iOS allows a single prompt).
 *  - Denied: the toggle shows its persisted value ON (honest — the user's
 *    choice was to allow the nudge) with a gentle locked note that explains
 *    delivery is off until allowed in device Settings, and no reminder is
 *    scheduled. No retry loop, no pressure.
 *  - Re-enabled later via device Settings: next app open syncs it.
 *
 * Phase 4b (§5): a Calm Quest+ section — the current tier (from the persisted
 * entitlement snapshot, which only applyEntitlement can set), a Restore
 * purchases button that calls the SubscriptionService seam, and a Manage
 * subscription entry. Both are HONESTLY STUBBED: the stub service answers
 * reason 'stub', so restore says exactly "store not connected yet — nothing
 * to restore" (never fake success) and manage says the store setup is
 * coming soon. Same one-file-swap seam as the paywall.
 */

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import type { AppRouteParamList } from '../navigation/types';
import {
  canDeliverReminders,
  formatReminderTime,
  parseReminderTime,
  requestReminderPermission,
  syncScheduledReminder,
} from '../notifications/reminders';
import { loadState, saveState } from '../storage/store';
import type { AppState } from '../storage/store';
import { subscriptionService } from '../subscription/stub';
import { badges, buttons, cards, colors, page, radii, spacing } from '../theme';

const COPY = {
  title: 'Settings',
  section: 'DAILY GENTLE REMINDER',
  blurb:
    'One nudge a day, whenever you choose — never more. You can change or switch it off any time.',
  on: 'On — one gentle nudge a day',
  off: 'Off — no reminders',
  timeLabel: 'Reminder time',
  locked:
    'Notifications are off in your device Settings, so no reminder can be delivered right now — that\u2019s okay. You can allow them there any time, and this will pick up on your next open.',
  lockHint: 'Device settings → Notifications → allow Calm Quest.',
  saved: 'Saved',
  saveError:
    'Could not save your reminder settings. They are stored on this device — please try again.',
  permError:
    'We could not ask for notification permission right now. You can switch the reminder on again any time.',
  // Phase 4b — Calm Quest+ section.
  plusSection: 'CALM QUEST+',
  tierFree: 'Free — the daily loop, forever',
  tierPaid: 'Calm Quest+ — everything unlocked',
  tierNote:
    'Your tier is saved on this device and only changes with a verified purchase or restore.',
  restore: 'Restore purchases',
  manage: 'Manage subscription',
  restoring: 'Checking the store…',
  // The stub service answers reason 'stub': say exactly what is (not) wired.
  restoreStubTitle: 'Store not connected yet',
  restoreStubCopy:
    'Purchases aren\u2019t set up yet, so there\u2019s nothing to restore — and nothing was charged. When the App Store connection is live, this restores any Calm Quest+ you\u2019ve bought.',
  manageStubTitle: 'Store setup coming soon',
  manageStubCopy:
    'Subscriptions will be managed in the App Store once the store connection is live. Nothing is billed today — there is no store to bill.',
};

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Settings'>;

/** Reads the persisted reminder prefs + current OS permission (on focus). */
async function readPrefs(): Promise<{
  enabled: boolean;
  time: string | null;
  canDeliver: boolean;
}> {
  const [state, permission] = await Promise.all([loadState(), canDeliverReminders()]);
  return {
    enabled: state.profile.reminderEnabled,
    time: state.profile.reminderTime,
    canDeliver: permission,
  };
}

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  // Prefs are loaded on focus so the screen always starts from persisted truth.
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('08:00');
  const [canDeliver, setCanDeliver] = useState(false);
  // True only for the brief window while the OS permission dialog is up.
  const [perturbed, setPerturbed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // Permission is requested at most once per app lifetime (iOS only allows
  // one prompt); later focus events only read the current grant.
  const askedPermissionRef = useRef(false);

  // Phase 4b — Calm Quest+ section state.
  const [tier, setTier] = useState<'free' | 'paid'>('free');
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState<null | { title: string; copy: string }>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, s] = await Promise.all([readPrefs(), loadState()]);
        if (!active) return;
        setLoaded(true);
        setEnabled(p.enabled);
        setTime(p.time ?? '08:00');
        setCanDeliver(p.canDeliver);
        // Phase 4b: the tier shown is the persisted snapshot — the only
        // writer is applyEntitlement (verified entitlements), so display is
        // always honest.
        setTier(s.entitlements.tier);
        // Reminder defaults ON (F7) — the first time the screen opens we ask
        // the OS once. Denial is handled kindly below; no retry loop.
        if (p.enabled && !p.canDeliver && !askedPermissionRef.current) {
          askedPermissionRef.current = true;
          const granted = await requestReminderPermission();
          if (!active) return;
          setCanDeliver(granted);
          if (granted) void syncScheduledReminder(p.enabled, p.time ?? '08:00');
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const effectiveOn = loaded && enabled && canDeliver;
  const t = parseReminderTime(time);
  const timeLabel = formatReminderTime(t);

  /** Persist prefs, then sync the single OS schedule. */
  async function applyPrefs(nextEnabled: boolean, nextTime: string) {
    setSaving(true);
    try {
      const state = await loadState();
      const next: AppState = {
        ...state,
        profile: {
          ...state.profile,
          reminderEnabled: nextEnabled,
          reminderTime: nextTime,
        },
      };
      await saveState(next);
      await syncScheduledReminder(nextEnabled, nextTime);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      Alert.alert('Could not save your reminder settings', COPY.saveError);
    } finally {
      setSaving(false);
    }
  }

  /** Toggle handler, per the kind permission flow above. */
  async function onToggle(nextValue: boolean) {
    setPerturbed(true);
    let allowed = canDeliver;
    try {
      if (nextValue && !canDeliver) {
        // First enable → ask the OS once; delivery only if granted.
        allowed = await requestReminderPermission();
        setCanDeliver(allowed);
      }
      setEnabled(nextValue);
      await applyPrefs(nextValue, time);
    } catch {
      Alert.alert('Reminder permission', COPY.permError);
    } finally {
      setPerturbed(false);
    }
  }

  /** iOS inline spinner → persist instantly; Android dialog (operator flow). */
  function onTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (!date) return;
    const next = formatReminderTime({ hour: date.getHours(), minute: date.getMinutes() });
    setTime(next);
    if (Platform.OS === 'ios') {
      // Persist + resync on every spin — the schedule never lags the UI.
      void applyPrefs(enabled, next);
    } else {
      setShowPicker(false);
      void applyPrefs(enabled, next);
    }
  }

  function openPicker() {
    if (perturbed || saving) return;
    setShowPicker((v) => !v);
  }

  /**
   * Phase 4b — Restore purchases, via the SubscriptionService seam. The stub
   * answers reason 'stub', so the note says exactly what is true: the store
   * isn't connected, nothing to restore, nothing charged. When the real
   * service answers with a verified snapshot, applyEntitlement is the one
   * honest write path. Never fake success, never invent an entitlement.
   */
  async function onRestore() {
    if (restoring) return;
    setRestoring(true);
    setRestoreNote(null);
    try {
      const result = await subscriptionService.restore();
      if (result.ok && result.value) {
        // Real-service path: a VERIFIED snapshot → the one honest store write.
        const s = await loadState();
        const { applyEntitlement } = await import('../storage/store');
        await applyEntitlement(s, result.value);
        setTier(result.value.tier);
        setRestoreNote(null);
      } else {
        setRestoreNote({ title: COPY.restoreStubTitle, copy: COPY.restoreStubCopy });
      }
    } catch {
      setRestoreNote({ title: COPY.restoreStubTitle, copy: COPY.restoreStubCopy });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView
      style={page.screen}
      contentContainerStyle={[page.content, styles.container]}
    >
      {/* Header row: back + title (the Home gear row navigates here). */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{COPY.title}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Gentle reminder */}
      <Text style={cards.label}>{COPY.section}</Text>
      <Text style={styles.blurb}>{COPY.blurb}</Text>

      <View style={[cards.card, styles.reminderCard]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{effectiveOn ? COPY.on : COPY.off}</Text>
            <Text style={styles.rowSub}>
              {enabled && !canDeliver
                ? 'Waiting on device permission'
                : `${timeLabel} — your time, your pace`}
            </Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Daily gentle reminder"
            accessibilityHint="One nudge a day at your chosen time. You can change or switch it off any time."
            value={enabled && !perturbed}
            onValueChange={(v) => void onToggle(v)}
            trackColor={{ false: colors.sand, true: colors.teal }}
            thumbColor={colors.white}
          />
        </View>

        {enabled && canDeliver ? (
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{COPY.timeLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Reminder time, currently ${timeLabel}`}
              disabled={perturbed || saving}
              onPress={openPicker}
              style={({ pressed }) => [
                styles.timePick,
                (perturbed || saving) && buttons.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.timeValue}>{timeLabel}</Text>
              <Text style={styles.timeChevron}>Change</Text>
            </Pressable>
          </View>
        ) : null}

        {enabled && !canDeliver ? (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedText}>{COPY.locked}</Text>
            <Text style={styles.lockHint}>{COPY.lockHint}</Text>
          </View>
        ) : null}
      </View>

      {Platform.OS === 'ios' && showPicker && enabled && canDeliver ? (
        <View style={[cards.card, styles.pickerCard]}>
          <DateTimePicker
            value={new Date(2000, 0, 1, t.hour, t.minute)}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={onTimeChange}
          />
          <Text style={styles.pickerHint}>
            Every change saves instantly — the nudge moves with you.
          </Text>
        </View>
      ) : null}

      {Platform.OS === 'android' && showPicker && enabled && canDeliver ? (
        <DateTimePicker
          value={new Date(2000, 0, 1, t.hour, t.minute)}
          mode="time"
          is24Hour={false}
          onChange={onTimeChange}
        />
      ) : null}

      <Text style={styles.gentleNote}>
        One quiet nudge a day — no urgency, no streak-guilt, ever. If you miss
        a day, grace holds your streak for you.
      </Text>

      {/* No upgrade, no purchases — grace is always free (F5/F7 guardrail). */}
      <View style={styles.finePrint}>
        <Text style={styles.finePrintText}>
          Reminders are free and can never be sold or gated. There is no paid
          reminder tier — only this one.
        </Text>
      </View>

      {/* Phase 4b — Calm Quest+ section (§5). Honest tier display; restore +
          manage are honestly stubbed at the seam. No upgrade pressure here —
          this section informs; it never sells. */}
      <Text style={cards.label}>{COPY.plusSection}</Text>
      <View style={[cards.card, styles.plusCard]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tier === 'paid' ? COPY.tierPaid : COPY.tierFree}</Text>
            <Text style={styles.rowSub}>{COPY.tierNote}</Text>
          </View>
          <View style={[badges.chip, tier === 'paid' ? badges.sage : badges.sand]}>
            <Text style={[badges.chipText, tier === 'paid' ? badges.sageText : badges.sandText]}>
              {tier === 'paid' ? 'PLUS' : 'FREE'}
              </Text>
          </View>
        </View>

        <View style={styles.plusActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: restoring }}
            disabled={restoring}
            onPress={() => void onRestore()}
            style={({ pressed }) => [buttons.ghost, styles.plusBtn, pressed && styles.pressed]}
          >
            <Text style={buttons.ghostText}>{restoring ? COPY.restoring : COPY.restore}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: manageOpen }}
            onPress={() => setManageOpen((v) => !v)}
            style={({ pressed }) => [buttons.ghost, styles.plusBtn, pressed && styles.pressed]}
          >
            <Text style={buttons.ghostText}>{COPY.manage}</Text>
          </Pressable>
        </View>

        {restoreNote ? (
          <View style={styles.plusNoteBox}>
            <Text style={styles.plusNoteTitle}>{restoreNote.title}</Text>
            <Text style={styles.plusNoteCopy}>{restoreNote.copy}</Text>
          </View>
        ) : null}

        {manageOpen ? (
          <View style={styles.plusNoteBox}>
            <Text style={styles.plusNoteTitle}>{COPY.manageStubTitle}</Text>
            <Text style={styles.plusNoteCopy}>{COPY.manageStubCopy}</Text>
          </View>
        ) : null}
      </View>

      {saved ? (
        <View style={[badges.chip, badges.sage, styles.savedChip]}>
          <Text style={[badges.chipText, badges.sageText]}>{COPY.saved}</Text>
        </View>
      ) : null}
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  blurb: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  reminderCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  timeBlock: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tealDeep,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  timePick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  timeValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  timeChevron: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tealDeep,
  },
  lockedBox: {
    marginTop: spacing.md,
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  lockedText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  lockHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
  pickerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pickerHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  gentleNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  finePrint: {
    marginTop: spacing.md,
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  finePrintText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  savedChip: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  plusCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  plusActions: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  plusBtn: {
    alignSelf: 'stretch',
  },
  plusNoteBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  plusNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  plusNoteCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.88,
  },
});