import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, centeredForm } from './lib/theme';
import { Logo } from './components/Logo';
import { Button } from './components/ui';
import { useAuth } from './lib/auth';
import { usePostHog } from 'posthog-react-native';

export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>(params.mode === 'signup' ? 'signup' : 'login');
  const { signIn, signUp, userId } = useAuth();
  const posthog = usePostHog();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (mode === 'signup' && !name.trim()) return setError('Tell us your name.');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, name.trim());
        posthog.capture('signed_up', { method: 'email', name: name.trim() });
        router.replace('/onboarding');
      } else {
        await signIn(email, password);
        posthog.capture('signed_in', { method: 'email' });
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      posthog.captureException(e instanceof Error ? e : new Error(e?.message || 'Auth error'), {
        mode,
      });
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[{ padding: spacing.lg, flexGrow: 1 }, centeredForm]} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24 }}>
            <Ionicons name="chevron-back" size={28} color={colors.mutedForeground} />
          </Pressable>

          <Logo size={28} />
          <Text style={{ color: colors.foreground, fontSize: 30, fontWeight: '700', marginTop: 28 }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 6 }}>
            {mode === 'signup' ? 'Start training in rhythm.' : 'Sign in to keep the rhythm.'}
          </Text>

          <View style={{ marginTop: 28, gap: 14 }}>
            {mode === 'signup' && (
              <Field label="Name" value={name} onChange={setName} placeholder="Alex Rivera" />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" secureTextEntry />
          </View>

          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={loading}
            style={{ marginTop: 24 }}
          />

          {mode === 'login' && (
            <Pressable onPress={() => router.push('/forgot-password')} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Forgot your password?</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setError(null);
              setMode((m) => (m === 'signup' ? 'login' : 'signup'));
            }}
            style={{ marginTop: 18, alignItems: 'center' }}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.subtleForeground}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
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
  );
}
