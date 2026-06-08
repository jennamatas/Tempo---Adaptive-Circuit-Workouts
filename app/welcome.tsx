import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './lib/theme';
import { brand } from './lib/brand';
import { Logo } from './components/Logo';
import { Button } from './components/ui';
import { useAuth } from './lib/auth';

const HERO = 'https://d64gsuwffb70l.cloudfront.net/6a27155c018980ba304cb21b_1780946381703_0626b81c.jpg';

export default function Welcome() {
  const { userId, profile, loading } = useAuth();

  if (!loading && userId) {
    return <Redirect href={profile && !profile.onboarding_completed ? '/onboarding' : '/(tabs)'} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ImageBackground source={{ uri: HERO }} style={{ flex: 1 }} imageStyle={{ opacity: 0.55 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: spacing.lg }}>
          <View style={{ paddingTop: 8 }}>
            <Logo size={30} />
          </View>

          <View style={{ marginBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="flash" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12 }}>
                {brand.tagline.toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontSize: 44, fontWeight: '800', lineHeight: 46 }}>
              {brand.copy.heroHeadline}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 16, marginTop: 16, lineHeight: 24 }}>
              {brand.copy.heroSub}
            </Text>

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
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}
