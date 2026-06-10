import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, centeredContent } from '../lib/theme';
import { Card, Button, StatCard } from '../components/ui';
import { useAuth } from '../lib/auth';
import { usePostHog } from 'posthog-react-native';
import { supabase } from '../lib/supabase';
import { fetchSessions } from '../lib/queries';
import { saveLocalProfile } from '../lib/local';
import { setBodyWeight, Level } from '../lib/store';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default function Profile() {
  const { profile, userId, isGuest, signOut, refreshProfile } = useAuth();
  const posthog = usePostHog();
  const [totals, setTotals] = useState({ workouts: 0, reps: 0, minutes: 0 });
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(profile?.body_weight_kg ?? 75));
  const [level, setLevel] = useState<Level>((profile?.fitness_level as Level) || 'intermediate');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSessions(userId, { guest: isGuest }).then((s) => {
        setTotals({
          workouts: s.length,
          reps: s.reduce((a, b) => a + (b.total_reps || 0), 0),
          minutes: Math.round(s.reduce((a, b) => a + (b.duration_seconds || 0), 0) / 60),
        });
      });
      if (profile) {
        setWeight(String(profile.body_weight_kg));
        setLevel(profile.fitness_level as Level);
      }
    }, [userId, isGuest, profile])
  );

  const save = async () => {
    setSaving(true);
    const bw = parseFloat(weight) || 75;
    await setBodyWeight(bw);
    if (isGuest) {
      await saveLocalProfile({ body_weight_kg: bw, fitness_level: level });
    } else if (userId) {
      await supabase.from('profiles').update({ body_weight_kg: bw, fitness_level: level }).eq('id', userId);
    }
    await refreshProfile();
    posthog.capture('profile_updated', { fitness_level: level, is_guest: isGuest });
    setSaving(false);
    setEditing(false);
  };

  const confirmSignOut = () => {
    Alert.alert(
      isGuest ? 'Exit guest mode?' : 'Sign out?',
      isGuest ? 'Your guest workouts on this device will be cleared.' : 'You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isGuest ? 'Exit' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            posthog.capture('signed_out', { was_guest: isGuest });
            await signOut();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={[{ padding: spacing.lg, paddingBottom: 40 }, centeredContent]}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>Profile</Text>

        {/* Identity */}
        <Card style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primaryForeground, fontSize: 24, fontWeight: '700' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 18 }}>{profile?.full_name || 'Athlete'}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 2 }}>{profile?.email}</Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' }}>
              {profile?.fitness_level} · {profile?.weekly_goal}x / week
            </Text>
          </View>
        </Card>

        {/* Lifetime totals */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
          <StatCard label="Workouts" value={totals.workouts} />
          <StatCard label="Reps" value={totals.reps} />
          <StatCard label="Minutes" value={totals.minutes} />
        </View>

        {/* Settings */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? 16 : 0 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>Settings</Text>
            <Pressable onPress={() => setEditing((e) => !e)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{editing ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          </View>

          {!editing ? (
            <View style={{ marginTop: 14, gap: 12 }}>
              <Row label="Fitness level" value={profile?.fitness_level || '—'} />
              <Row label="Body weight" value={`${profile?.body_weight_kg ?? 75} kg`} />
              <Row label="Weekly goal" value={`${profile?.weekly_goal ?? 3} workouts`} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={fieldLabel}>Fitness level</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {LEVELS.map((l) => {
                    const active = level === l;
                    return (
                      <Pressable
                        key={l}
                        onPress={() => setLevel(l)}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: active ? colors.primary : colors.surface2, borderWidth: 1, borderColor: active ? colors.primary : colors.border, alignItems: 'center' }}
                      >
                        <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{l}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View>
                <Text style={fieldLabel}>Body weight (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  style={{ backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.foreground, fontSize: 15 }}
                />
              </View>
              <Button label="Save changes" loading={saving} onPress={save} />
            </View>
          )}
        </Card>

        {isGuest && (
          <Card style={{ marginTop: spacing.lg, gap: 10 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16 }}>
              You&apos;re exploring as a guest
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
              Create a free account to sync your workouts across devices and keep your history safe.
            </Text>
            <Button label="Create free account" onPress={() => {
              posthog.capture('guest_upgrade_tapped');
              router.push('/auth?mode=signup');
            }} />
          </Card>
        )}

        <Button
          label={isGuest ? 'Exit guest mode' : 'Sign out'}
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={18} color={colors.foreground} />}
          onPress={confirmSignOut}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>{value}</Text>
    </View>
  );
}

const fieldLabel = { color: colors.mutedForeground, fontSize: 13, fontWeight: '700' as const, marginBottom: 6 };
