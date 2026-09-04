/**
 * Calm Quest — root navigator (Phase 2b).
 *
 * Flow A: first launch shows Onboarding; once the profile's `onboarded` flag
 * is persisted, launch goes straight to Home. `initialRouteName` is computed
 * from persisted state before the navigator mounts (one AsyncStorage read).
 * Home → Quest is the daily completion flow; Home → Glimpse is the entry
 * point for the Gratitude Glimpse mini-game (Phase 2c completes that screen).
 */

import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { loadState } from '../storage/store';
import { colors } from '../theme';
import GlimpseScreen from '../screens/GlimpseScreen';
import HomeScreen from '../screens/HomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import QuestScreen from '../screens/QuestScreen';
import type { AppRouteParamList } from './types';

const Stack = createNativeStackNavigator<AppRouteParamList>();

/** Calm navigation theme: no dark headers, cream background. */
const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.teal,
    background: colors.cream,
    card: colors.cream,
    text: colors.ink,
    border: colors.border,
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
      <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}