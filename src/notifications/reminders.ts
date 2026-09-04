/**
 * Calm Quest — one gentle daily reminder (Phase 3, feature spec §3 F7/F9).
 *
 * Exactly ONE scheduled local notification, repeating daily at the user's
 * picked time. It is muted (no sound) and badge-free: a quiet nudge, never an
 * alarm, never streak-guilt (guardrail 5: max one daily reminder, no
 * loss-aversion copy). Local notifications are sufficient for the MVP — no
 * FCM/APNs push here.
 *
 * Scheduling is a pure function of the persisted prefs (enabled + "HH:mm"),
 * so the Settings screen and app-open sync both call `syncScheduledReminder`
 * and the same single notification identifier is reused — there is never more
 * than one.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Single schedule + Android channel id — keeps the "never more than one" promise. */
export const REMINDER_ID = 'calmquest-daily-reminder';
export const REMINDER_CHANNEL_ID = 'calmquest-daily-reminder';

/** Gentle, honest copy. No urgency, no streak-guilt (guardrail 5). */
export const REMINDER_TITLE = 'Calm Quest';
export const REMINDER_BODY =
  "A quiet nudge for today's quest — no pressure, whenever you're ready.";

export interface ReminderTime {
  hour: number;
  minute: number;
}

/** "HH:mm" → { hour, minute }. Foreign/partial values fall back to 08:00. */
export function parseReminderTime(hhmm: string): ReminderTime {
  const [h, m] = hhmm.split(':').map(Number);
  if (
    !Number.isFinite(h) ||
    !Number.isFinite(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return { hour: 8, minute: 0 };
  }
  return { hour: h, minute: m };
}

/** { hour, minute } → "HH:mm" (zero-padded, local wall-clock only). */
export function formatReminderTime(t: ReminderTime): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/**
 * Tells the OS how to present a notification while the app is foregrounded:
 * show it quietly (banner + list), no sound, no badge pressure.
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** True when the OS allows this app to deliver notifications. */
export async function canDeliverReminders(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

/**
 * Request iOS/Android permission once (the OS owns the dialog; a first-time
 * denial cannot be re-prompted from the app — the user must use device
 * Settings, which the Settings screen explains kindly).
 */
export async function requestReminderPermission(): Promise<boolean> {
  // iOS-only granular request: alerts are all we need (no badge/sound).
  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return status.granted;
}

/** Android 8+: a quiet default-importance channel for the daily reminder. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Daily gentle reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

/** Cancel the single daily reminder (no-op when nothing is scheduled). */
export async function cancelReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

/**
 * Keep the OS schedule in sync with the persisted prefs. Call from Settings
 * after any pref change, and once on app open.
 *
 * Returns the effective state so callers can reconcile the UI honestly:
 *  - 'on'          reminder is scheduled
 *  - 'off'         prefs say off (or OS permission is missing) — nothing scheduled
 */
export async function syncScheduledReminder(
  enabled: boolean,
  time: string | null,
): Promise<'on' | 'off'> {
  // Always cancel first: scheduling is idempotent from the user's perspective
  // and the "never more than one" rule holds even if a previous call raced.
  await cancelReminder();

  if (!enabled) return 'off';
  if (!(await canDeliverReminders())) return 'off';

  const t = parseReminderTime(time ?? '08:00');
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
      sound: undefined,
      data: { kind: 'daily-gentle-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: REMINDER_CHANNEL_ID,
      hour: t.hour,
      minute: t.minute,
    },
  });
  return 'on';
}