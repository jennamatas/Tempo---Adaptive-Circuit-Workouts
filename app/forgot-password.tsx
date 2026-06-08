import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from './lib/theme';
import { Logo } from './components/Logo';
import { Button } from './components/ui';
import { useAuth } from './lib/auth';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email.');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Could not send the reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24 }}>
            <Ionicons name="chevron-back" size={28} color={colors.mutedForeground} />
          </Pressable>

          <Logo size={28} />

          {sent ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail-open" size={36} color={colors.primary} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>
                Check your inbox
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                If an account exists for {email}, a password reset link is on its way.
              </Text>
              <Button label="Back to sign in" onPress={() => router.replace('/auth?mode=login')} style={{ marginTop: 28, alignSelf: 'stretch' }} />
            </View>
          ) : (
            <>
              <Text style={{ color: colors.foreground, fontSize: 30, fontWeight: '700', marginTop: 28 }}>
                Reset password
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 6 }}>
                Enter your email and we will send you a reset link.
              </Text>

              <View style={{ marginTop: 28 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.subtleForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    color: colors.foreground,
                    fontSize: 15,
                  }}
                />
              </View>

              {error ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              <Button label="Send reset link" onPress={submit} loading={loading} style={{ marginTop: 24 }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
