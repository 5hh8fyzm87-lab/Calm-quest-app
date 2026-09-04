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
 *
 * Phase 5 (§3 F9): sound on/off (persisted intent — no bundled audio plays in
 * this MVP yet; the pref is ready to wire), Log out (only ever enabled when
 * the AuthService seam isAvailable() — the stub keeps it an honest "coming
 * soon" note, never a fake logout), Delete my data (REAL local wipe → fresh
 * install → Onboarding; the GDPR-relevant in-app data note is honest about
 * backend deletion arriving later), and in-app Privacy & Terms mirroring the
 * site pages (/privacy, /terms).
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

import { analytics } from '../analytics';
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
import { authService } from '../subscription/authStub';
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
  // Phase 5 — sound, account, data, legal.
  soundSection: 'SOUND',
  soundOn: 'Sound on — gentle chimes',
  soundOff: 'Sound off — quiet mode',
  soundSub:
    'A sound preference for the gentle chime in the pause quest and the reminder. No bundled sound plays in this MVP yet — this setting is saved and ready to wire the moment audio lands.',
  accountSection: 'ACCOUNT & DATA',
  signInNote:
    'Sign-in comes with Calm Quest+ accounts — arriving with the real backend. Until then you travel anonymously; everything stays on this device.',
  logoutRow: 'Log out',
  loggedOutNote: 'No signed-in account to log out of — sign-in is coming soon.',
  deleteDataRow: 'Delete my data',
  deleteDataSub:
    'Erases everything the app has stored on this device: quests, affirmations, glimpses, streak, progress, and all settings. Server-side deletion arrives with the real backend — until then, this covers all in-app data.',
  deleteConfirmTitle: 'Delete all your data?',
  deleteConfirmCopy:
    'This is irreversible. Every quest, glimpse, streak, and point of progress on this device will be erased, and Calm Quest will start fresh at onboarding. Nothing is sent anywhere — this only clears your device.',
  deleteConfirmCancel: 'Keep my data',
  deleteConfirmConfirm: 'Delete everything',
  deleteDoneTitle: 'Your data is deleted',
  deleteDoneCopy:
    'Everything this app stored on the device is gone. You\u2019ll start fresh at onboarding whenever you\u2019re ready. Server-side data deletion arrives with the real backend.',
  legalSection: 'LEGAL',
  privacyRow: 'Privacy',
  termsRow: 'Terms of Use',
};

type Nav = NativeStackNavigationProp<AppRouteParamList, 'Settings'>;

/** Reads the persisted reminder prefs + OS permission + sound (on focus). */
async function readPrefs(): Promise<{
  enabled: boolean;
  time: string | null;
  canDeliver: boolean;
  soundEnabled: boolean;
}> {
  const [state, permission] = await Promise.all([loadState(), canDeliverReminders()]);
  return {
    enabled: state.profile.reminderEnabled,
    time: state.profile.reminderTime,
    canDeliver: permission,
    soundEnabled: state.profile.soundEnabled,
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

  // Phase 5 — sound pref + honest account state (the auth seam's truth).
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Auth is a stub: isAvailable() is false, so the Log out row is shown only
  // as an honest "coming with the real backend" note — NEVER a fake logout.
  const [authAvailable, setAuthAvailable] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setSoundEnabled(p.soundEnabled);
        // Phase 4b: the tier shown is the persisted snapshot — the only
        // writer is applyEntitlement (verified entitlements), so display is
        // always honest.
        setTier(s.entitlements.tier);
        // Phase 5: ask the auth service — the stub answers false forever, so
        // the Log out row can never fake a signed-out state.
        void authService.isAvailable().then((avail) => {
          if (active) setAuthAvailable(avail);
        });
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
    // Phase 5 (S5): instrument the restore attempt — the seam stays honest
    // (the stub answers 'stub'), this only records that the user asked.
    analytics.track('restore_requested', {});
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

  /**
   * Phase 5 — sound on/off (F9). Persisted with the same store path as the
   * reminder. MVP intent note: no bundled audio asset exists yet (the
   * reminder is deliberately muted, the Pause chime is a Phase 6 sound-design
   * item) — the preference is saved truthfully and ready to wire.
   */
  async function onSoundChange(value: boolean) {
    setSoundEnabled(value);
    try {
      const state = await loadState();
      const { setSoundPref } = await import('../storage/store');
      const next = await setSoundPref(state, value);
      setSoundEnabled(next.profile.soundEnabled);
    } catch {
      Alert.alert('Could not save your sound setting', COPY.saveError);
    }
  }

  /**
   * Phase 5 — Delete my data (F9, GDPR / App Store). REAL deletion: wipes the
   * persisted app state (quests, affirmations, glimpses, streak, XP/level,
   * prefs incl. reminder + sound, entitlements snapshot) so the app returns to
   * a true fresh-install state, cancels the scheduled OS reminder, and the
   * navigator routes to Onboarding as a new user. Honest: no server-side
   * deletion is claimed — it arrives with the real backend.
   */
  function confirmDelete() {
    if (deleting) return;
    Alert.alert(COPY.deleteConfirmTitle, COPY.deleteConfirmCopy, [
      { text: COPY.deleteConfirmCancel, style: 'cancel' },
      { text: COPY.deleteConfirmConfirm, style: 'destructive', onPress: () => void runDelete() },
    ]);
  }

  async function runDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { deleteAllData } = await import('../storage/store');
      const fresh = await deleteAllData();
      setDeleting(false);
      Alert.alert(COPY.deleteDoneTitle, COPY.deleteDoneCopy, [
        {
          text: 'OK',
          onPress: () => {
            // Fresh-install state is persisted (profile.onboarded === false);
            // reset the navigation stack so the very next screen IS
            // Onboarding, exactly like a first launch.
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
          },
        },
      ]);
      // Keep the component honest if the user dismisses the alert: reflect
      // the fresh (deleted) state so no stale progress shows anywhere.
      setTier(fresh.entitlements.tier);
      setSoundEnabled(fresh.profile.soundEnabled);
      setEnabled(fresh.profile.reminderEnabled);
      setTime(fresh.profile.reminderTime ?? '08:00');
    } catch {
      setDeleting(false);
      Alert.alert(
        'Could not delete your data',
        'Nothing was deleted — please try again. It is stored on this device.',
      );
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

      {/* Phase 5 (F9): sound on/off. Persisted intent — honestly labeled: no
          bundled audio plays yet (the MVP pause quest is silent and the
          reminder is muted), so this pref is saved and ready to wire. */}
      <Text style={cards.label}>{COPY.soundSection}</Text>
      <View style={[cards.card, styles.reminderCard]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              {soundEnabled ? COPY.soundOn : COPY.soundOff}
            </Text>
            <Text style={styles.rowSub}>{COPY.soundSub}</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Sound on or off"
            accessibilityHint="Saved on this device. No bundled sound plays in this MVP yet."
            value={soundEnabled}
            onValueChange={(v) => void onSoundChange(v)}
            trackColor={{ false: colors.sand, true: colors.teal }}
            thumbColor={colors.white}
          />
        </View>
      </View>

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

      {/* Phase 5 (F9): Account & Data — Log out only when a REAL auth service
          exists (stub isAvailable() = false, so today this is the honest
          "coming soon" note; NEVER a fabricated signed-out state). Delete my
          data is REAL and local: it wipes every persisted byte and the app
          starts fresh at Onboarding. */}
      <Text style={cards.label}>{COPY.accountSection}</Text>
      <Text style={styles.blurb}>{COPY.signInNote}</Text>
      <View style={[cards.card, styles.reminderCard]}>
        {authAvailable ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              // Real sign-out arrives with the real auth backend (Phase 6);
              // the honest seam means this row only ever exists when there is
              // an actual account to sign out of.
            }}
            style={({ pressed }) => [buttons.ghost, styles.plusBtn, pressed && styles.pressed]}
          >
            <Text style={buttons.ghostText}>{COPY.logoutRow}</Text>
          </Pressable>
        ) : (
          <View style={styles.logoutNoteBox}>
            <Text style={styles.logoutNoteTitle}>{COPY.logoutRow}</Text>
            <Text style={styles.logoutNoteCopy}>{COPY.loggedOutNote}</Text>
          </View>
        )}

        <View style={styles.accountDivider} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={confirmDelete}
          style={({ pressed }) => [buttons.ghost, styles.deleteBtn, pressed && styles.pressed]}
        >
          <Text style={[buttons.ghostText, styles.deleteBtnText]}>
            {deleting ? 'Deleting…' : COPY.deleteDataRow}
          </Text>
        </Pressable>
        <Text style={styles.deleteSub}>{COPY.deleteDataSub}</Text>
      </View>

      {/* Phase 5 (F9): in-app Privacy & Terms — mirror of the site pages. */}
      <Text style={cards.label}>{COPY.legalSection}</Text>
      <View style={[cards.card, styles.reminderCard]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('PrivacyTerms', { doc: 'privacy' })}
          style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
        >
          <Text style={styles.legalRowText}>{COPY.privacyRow}</Text>
          <Text style={styles.legalChevron}>›</Text>
        </Pressable>
        <View style={styles.accountDivider} />
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('PrivacyTerms', { doc: 'terms' })}
          style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}
        >
          <Text style={styles.legalRowText}>{COPY.termsRow}</Text>
          <Text style={styles.legalChevron}>›</Text>
        </Pressable>
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
  logoutNoteBox: {
    backgroundColor: colors.creamDeep,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  logoutNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  logoutNoteCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  accountDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  deleteBtn: {
    alignSelf: 'stretch',
  },
  deleteBtnText: {
    color: colors.softCoral,
  },
  deleteSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  legalRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  legalChevron: {
    fontSize: 18,
    color: colors.inkSoft,
  },
  pressed: {
    opacity: 0.88,
  },
});