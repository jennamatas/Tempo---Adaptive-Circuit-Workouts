import React from 'react';
import { View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { colors, desktopBreakpoint } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { NavBar } from '../components/NavBar';

export default function TabLayout() {
  const { userId, isGuest, profile, loading } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= desktopBreakpoint;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!userId && !isGuest) return <Redirect href="/welcome" />;
  if (profile && !profile.onboarding_completed) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Sidebar on the left for desktop/tablet, bottom bar on phones.
        tabBarPosition: desktop ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
