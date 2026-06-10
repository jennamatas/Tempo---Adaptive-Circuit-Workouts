import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './lib/theme';
import { brand } from './lib/brand';
import { Logo } from './components/Logo';
import { Seo } from './components/Seo';
import { Button } from './components/ui';
import { Animated, FadeUp, useKenBurns } from './components/Motion';
import { useAuth } from './lib/auth';
import { usePostHog } from 'posthog-react-native';

const HERO = 'https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg';
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function Welcome() {
  const { userId, isGuest, profile, loading, continueAsGuest } = useAuth();
  const posthog = usePostHog();
  const kenBurns = useKenBurns(1.08, 1.24, 12000);

  if (!loading && (userId || isGuest)) {
    return <Redirect href={profile && !profile.onboarding_completed ? '/onboarding' : '/(tabs)'} />;
  }

  const guest = async () => {
    await continueAsGuest();
    posthog.capture('guest_mode_started');
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Seo
        title="Tempo: Adaptive Circuit Workouts"
        exact
        path="/welcome"
        description="Adaptive circuit workouts that adjust to your pace. Build, run, and track HIIT and strength circuits with smart rest timers and progress history."
      />
      {/* Flowing Ken-Burns hero */}
      <AnimatedImage source={{ uri: HERO }} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.55 }, kenBurns]} />
      {/* Dark gradient-ish veil for legibility */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: 0.35 }]} />

      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: spacing.lg }}>
        <FadeUp delay={80} style={{ paddingTop: 8 }}>
          <Logo size={30} />
        </FadeUp>

        <View style={{ marginBottom: 40 }}>
          <FadeUp delay={160}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="flash" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12 }}>
                {brand.tagline.toUpperCase()}
              </Text>
            </View>
          </FadeUp>
          <FadeUp delay={240}>
            <Text style={{ color: colors.foreground, fontSize: 44, fontWeight: '800', lineHeight: 46 }}>
              {brand.copy.heroHeadline}
            </Text>
          </FadeUp>
          <FadeUp delay={320}>
            <Text style={{ color: colors.mutedForeground, fontSize: 16, marginTop: 16, lineHeight: 24 }}>
              {brand.copy.heroSub}
            </Text>
          </FadeUp>

          <FadeUp delay={420}>
            <Button
              label={brand.copy.primaryCta}
              icon={<Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
              onPress={() => router.push('/auth?mode=signup')}
              style={{ marginTop: 28 }}
            />
            <Button
              label="I already have an account"
              variant="ghost"
              onPress={() => router.push('/auth?mode=login')}
              style={{ marginTop: 6 }}
            />
            <Button
              label="Explore as guest"
              variant="ghost"
              icon={<Ionicons name="eye-outline" size={18} color={colors.foreground} />}
              onPress={guest}
              style={{ marginTop: 2 }}
            />
            <Text style={{ color: colors.subtleForeground, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
              No account needed. Your progress stays on this device.
            </Text>
          </FadeUp>
        </View>
      </SafeAreaView>
    </View>
  );
}
