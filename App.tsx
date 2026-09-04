import { StatusBar } from 'expo-status-bar';

import RootNavigator from './src/navigation/RootNavigator';

/**
 * Calm Quest — app root.
 *
 * Phase 2a: a typed native-stack root (Onboarding → Home) replaces the
 * Phase 1 content-counts proof line. Onboarding persists `path` +
 * `onboarded` via the AsyncStorage store; the navigator routes accordingly
 * on every launch. Home shows today's quest, Affirmation of the Day, and a
 * grace-toned streak chip (Flow B start; completion is Phase 2b).
 */
export default function App() {
  return (
    <>
      <RootNavigator />
      <StatusBar style="dark" />
    </>
  );
}