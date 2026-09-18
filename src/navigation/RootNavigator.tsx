/**
 * Calm Quest — root navigator (Phase 2b, extended Phase 3).
 *
 * Flow A: first launch shows Onboarding; once the profile's `onboarded` flag
 * is persisted, launch goes straight to Home. `initialRouteName` is computed
 * from persisted state before the navigator mounts (one AsyncStorage read).
 * Home → Quest is the daily completion flow; Home → Glimpse is the entry
 * point for the Gratitude Glimpse mini-game; Home → Settings (Phase 3)
 * carries the reminder toggle + time picker.
 */

import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { loadState } from '../storage/store';
import { colors } from '../theme';
import GlimpseScreen from '../screens/GlimpseScreen';
import HomeScreen from '../screens/HomeScreen';
import KeptScreen from '../screens/KeptScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import PrivacyTermsScreen from '../screens/PrivacyTermsScreen';
import ProgramsScreen from '../screens/ProgramsScreen';
import QuestScreen from '../screens/QuestScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SitWithVerseScreen from '../screens/SitWithVerseScreen';
import type { AppRouteParamList } from './types';

const Stack = createNativeStackNavigator<AppRouteParamList>();

/** Calm navigation theme: no dark headers, cream background. */
const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.teal,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.paperEdge,
    notification: colors.gold,
  },
  fonts: {
    regular: { fontWeight: '400', fontFamily: 'System' },
    medium: { fontWeight: '500', fontFamily: 'System' },
    bold: { fontWeight: '700', fontFamily: 'System' },
    heavy: { fontWeight: '800', fontFamily: 'System' },
  },
};

export default function RootNavigator() {
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState<'Onboarding' | 'Home'>('Onboarding');

  useEffect(() => {
    let active = true;
    loadState()
      .then((s) => {
        if (!active) return;
        setStarted(s.profile.onboarded ? 'Home' : 'Onboarding');
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setStarted('Onboarding');
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName={started} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Quest" component={QuestScreen} />
        <Stack.Screen name="Glimpse" component={GlimpseScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        {/* Phase 5 (F9): in-app Privacy/Terms mirroring the site pages. */}
        <Stack.Screen name="PrivacyTerms" component={PrivacyTermsScreen} />
        {/* Phase 4a (Flow E): one-time paywall + its day-7 header re-surface. */}
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        {/* Build 13 (proposal §2 A/D/I): the "stay a while" layer — the kept
            archive + saved affirmations, and the zero-XP verse reader. Both are
            read-only surfaces: no XP, no notifications, no new persistence. */}
        <Stack.Screen name="Kept" component={KeptScreen} />
        <Stack.Screen name="Verse" component={SitWithVerseScreen} />
        {/* Build 14 (two-paths §2): the program picker. Three rows, the held one
            marked; a tap switches programs and resets nothing. */}
        <Stack.Screen name="Programs" component={ProgramsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}