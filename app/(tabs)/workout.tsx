import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, centeredContent } from '../lib/theme';
import { Card, Button, PhaseBadge } from '../components/ui';
import { useLevel, Level } from '../lib/store';
import { levelToPhase, PHASES } from '../lib/brand';
import { generateWorkout } from '../lib/generate';
import { fetchSessions } from '../lib/queries';
import { setActiveWorkout } from '../lib/activeWorkout';
import { GeneratedWorkout } from '../lib/types';
import { useAuth } from '../lib/auth';

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'beginner', label: 'Beginner', desc: 'Foundation · 30s on / 30s off' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Build · 40s on / 20s off' },
  { key: 'advanced', label: 'Advanced', desc: 'Peak · 45s on / 15s off' },
];

export default function WorkoutScreen() {
  const { userId, isGuest, profile } = useAuth();
  const [level, setLevel] = useLevel();
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [loading, setLoading] = useState(false);

  // Default the selector to the user's profile level
  useEffect(() => {
    if (profile?.fitness_level) setLevel(profile.fitness_level as Level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.fitness_level]);

  const generate = async (lv: Level) => {
    setLoading(true);
    const phase = levelToPhase[lv];
    let exclude: string[] = [];
    try {
      const recent = await fetchSessions(userId, { guest: isGuest, limit: 2 });
      exclude = recent.flatMap((s) => (s.exercises || []).map((e) => e.name));
    } catch {}
    const w = await generateWorkout(phase, Date.now(), exclude);
    setWorkout(w);
    setLoading(false);
  };


  const start = () => {
    if (!workout) return;
    setActiveWorkout(workout);
    router.push('/session');
  };

  const phaseInfo = PHASES[levelToPhase[level]];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={[{ padding: spacing.lg, paddingBottom: 40 }, centeredContent]}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>Build a circuit</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 4 }}>
          20 minutes. 5 moves. 4 rounds.
        </Text>

        {/* Level selector */}
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: 10 }}>
          Your level
        </Text>
        <View style={{ gap: 10 }}>
          {LEVELS.map((l) => {
            const selected = level === l.key;
            return (
              <Pressable key={l.key} onPress={() => setLevel(l.key)}>
                <Card
                  style={{
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16 }}>{l.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>{l.desc}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {!workout ? (
          <Button
            label="Generate today's circuit"
            icon={<Ionicons name="flash" size={18} color={colors.primaryForeground} />}
            onPress={() => generate(level)}
            loading={loading}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Your circuit</Text>
              <PhaseBadge phase={workout.phase} />
            </View>

            <Card style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md }}>
              <Stat label="Work" value={`${workout.work}s`} />
              <Stat label="Rest" value={`${workout.rest}s`} />
              <Stat label="Rounds" value={`${workout.rounds}`} />
              <Stat label="Total" value={`${Math.round(workout.totalSeconds / 60)}m`} />
            </Card>

            {workout.exercises.map((we, i) => (
              <Pressable key={we.exercise.id} onPress={() => router.push(`/exercise/${we.exercise.slug}`)}>
                <Card style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
                  <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700', width: 22 }}>{i + 1}</Text>
                  {we.exercise.image_url ? (
                    <Image source={{ uri: we.exercise.image_url }} style={{ width: 54, height: 54, borderRadius: radius.md }} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>{we.exercise.name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                      {we.exercise.body_part} · {we.target_reps ? `${we.target_reps} reps` : `${we.target_duration_seconds}s`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtleForeground} />
                </Card>
              </Pressable>
            ))}

            <Button
              label="Start circuit"
              icon={<Ionicons name="play" size={18} color={colors.primaryForeground} />}
              onPress={start}
              style={{ marginTop: spacing.md }}
            />
            <Button
              label="Regenerate"
              variant="outline"
              icon={<Ionicons name="refresh" size={18} color={colors.foreground} />}
              onPress={() => generate(level)}
              loading={loading}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}
