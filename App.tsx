import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { configureNotifications, ensureAndroidChannel, syncScheduledReminder } from './src/notifications/reminders';
import RootNavigator from './src/navigation/RootNavigator';
import { loadState } from './src/storage/store';

/**
 * Calm Quest — app root.
 *
 * Phase 2a: a typed native-stack root (Onboarding → Home) replaces the
 * Phase 1 content-counts proof line. Onboarding persists `path` +
 * `onboarded` via the AsyncStorage store; the navigator routes accordingly
 * on every launch. Home shows today's quest, Affirmation of the Day, and a
 * grace-toned streak chip (Flow B start; completion is Phase 2b).
 *
 * Phase 3: on launch we configure the notification system once (handler for
 * foreground quiet delivery + Android channel) and sync the single daily
 * reminder to the persisted prefs — so the toggle, the time, and the OS
 * schedule never drift, and a reminder enabled across a restart just works.
 * The sync is best-effort: it never blocks the UI or crashes on failure.
 */
export default function App() {
  useEffect(() => {
    configureNotifications();
    void ensureAndroidChannel().catch(() => {});
    void loadState()
      .then((s) => syncScheduledReminder(s.profile.reminderEnabled, s.profile.reminderTime))
      .catch(() => {});
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="dark" />
    </>
  );
}