import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./lib/theme";
import { AuthProvider } from "./lib/auth";

if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = fetch;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" options={{ presentation: 'card' }} />
          <Stack.Screen name="forgot-password" options={{ presentation: 'card' }} />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="exercise/[slug]" options={{ presentation: 'card' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
