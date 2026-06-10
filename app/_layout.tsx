import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { PostHogProvider } from "posthog-react-native";
import { colors } from "./lib/theme";
import { AuthProvider } from "./lib/auth";
import { posthog } from "./lib/posthog";
import { AnalyticsProvider } from "./components/AnalyticsProvider";

if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = fetch;
}

export default function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return (
    <SafeAreaProvider>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
          maxElementsCaptured: 20,
        }}
      >
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
      </PostHogProvider>
      {/* Vercel Web Analytics + Speed Insights (web-only; no-op on native). */}
      <AnalyticsProvider />
    </SafeAreaProvider>
  );
}
