import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, phaseColor } from './lib/theme';
import { RingTimer } from './components/RingTimer';
import { Button } from './components/ui';
import { getActiveWorkout } from './lib/activeWorkout';
import { estimateCalories } from './lib/generate';
import { getBodyWeight } from './lib/store';
import { supabase } from './lib/supabase';
import { brand } from './lib/brand';
import { GeneratedWorkout } from './lib/types';
import { useAuth } from './lib/auth';

type Phase = 'ready' | 'work' | 'rest' | 'done';

function buzz(kind: 'tick' | 'transition' | 'finish') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'tick') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'transition') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* haptics unsupported on this device */
  }
}

export default function Session() {
  const { userId } = useAuth();
  const workout = getActiveWorkout();

  // Keep the screen awake for the duration of the circuit.
  useKeepAwake();

  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(1);
  const [exIndex, setExIndex] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [paused, setPaused] = useState(false);
  const [repInput, setRepInput] = useState(0);
  const [saving, setSaving] = useState(false);

  const repInputRef = useRef(0);
  useEffect(() => { repInputRef.current = repInput; }, [repInput]);

  // rep log entries
  const repLog = useRef<{ round: number; exIndex: number; reps: number; name: string; bodyPart: string; image: string | null }[]>([]);
  const endRef = useRef<number>(0);
  const lastSecRef = useRef<number>(0);
  const startedAt = useRef<string>(new Date().toISOString());

  const total = workout ? workout.exercises.length : 0;


  const setupInterval = useCallback((dur: number) => {
    endRef.current = Date.now() + dur * 1000;
    setRemaining(dur);
  }, []);

  // start ready countdown
  useEffect(() => {
    if (!workout) return;
    setupInterval(5);
  }, [workout, setupInterval]);

  // ticking loop
  useEffect(() => {
    if (phase === 'done' || paused || !workout) return;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setRemaining(secs);
      if (secs !== lastSecRef.current) {
        lastSecRef.current = secs;
        if (secs > 0 && secs <= 3) buzz('tick');
      }
      if (secs <= 0) {
        advance();
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, workout, round, exIndex]);

  const currentEx = workout?.exercises[exIndex];

  const advance = useCallback(() => {
    if (!workout) return;
    if (phase === 'ready') {
      buzz('transition');
      setPhase('work');
      setupInterval(workout.work);
      return;
    }
    if (phase === 'work') {
      // entering rest: prefill rep logger
      buzz('transition');
      const ex = workout.exercises[exIndex];
      setRepInput(ex?.target_reps ?? Math.round((ex?.target_duration_seconds || 30) / 2));
      setPhase('rest');
      setupInterval(workout.rest);
      return;
    }
    if (phase === 'rest') {
      // commit rep log for the exercise just finished
      const ex = workout.exercises[exIndex];
      if (ex) {
        repLog.current.push({
          round,
          exIndex,
          reps: repInputRef.current,

          name: ex.exercise.name,
          bodyPart: ex.exercise.body_part,
          image: ex.exercise.image_url,
        });
      }
      // advance index / round
      let nextIndex = exIndex + 1;
      let nextRound = round;
      if (nextIndex >= total) {
        nextIndex = 0;
        nextRound = round + 1;
      }
      if (nextRound > workout.rounds) {
        finish();
        return;
      }
      buzz('transition');
      setExIndex(nextIndex);
      setRound(nextRound);
      setPhase('work');
      setupInterval(workout.work);
    }
  }, [phase, workout, exIndex, round, total, repInput, setupInterval]);

  const finish = useCallback(async () => {
    if (!workout) return;
    buzz('finish');
    setPhase('done');
    setSaving(true);
    const bw = await getBodyWeight();
    const totalReps = repLog.current.reduce((a, b) => a + (b.reps || 0), 0);
    const durationSeconds = (workout.work + workout.rest) * total * workout.rounds;
    const calories = workout.exercises.reduce(
      (a, we) => a + estimateCalories(we.exercise.met_value, bw, workout.work) * workout.rounds,
      0
    );
    // aggregate exercises summary
    const exSummary = workout.exercises.map((we) => ({
      name: we.exercise.name,
      body_part: we.exercise.body_part,
      reps: repLog.current.filter((r) => r.name === we.exercise.name).reduce((a, b) => a + b.reps, 0),
      image_url: we.exercise.image_url,
    }));
    try {
      if (userId) {
        await supabase.from('workout_sessions').insert({
          user_id: userId,
          phase: workout.phase,
          started_at: startedAt.current,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          total_reps: totalReps,
          rounds_completed: workout.rounds,
          calories_estimate: Math.round(calories * 10) / 10,
          status: 'completed',
          exercises: exSummary,
        });
      }
    } catch (e) {
      // ignore network error, still show summary
    }
    setSaving(false);
  }, [workout, total, userId]);


  const quit = () => {
    Alert.alert('Quit workout?', 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Quit', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const skip = () => {
    advance();
  };

  if (!workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.foreground }}>No active workout.</Text>
        <Button label="Back" variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const pc = phaseColor[workout.phase] || colors.primary;

  // DONE screen
  if (phase === 'done') {
    const totalReps = repLog.current.reduce((a, b) => a + b.reps, 0);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={52} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: '700', marginTop: 20 }}>Circuit complete</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 6, textAlign: 'center' }}>{brand.copy.postWorkout}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          <SummaryStat label="Minutes" value={Math.round(((workout.work + workout.rest) * total * workout.rounds) / 60)} />
          <SummaryStat label="Rounds" value={workout.rounds} />
          <SummaryStat label="Reps" value={totalReps} />
        </View>
        <Button label={saving ? 'Saving...' : 'Done'} loading={saving} onPress={() => router.replace('/(tabs)')} style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  const dur = phase === 'ready' ? 5 : phase === 'work' ? workout.work : workout.rest;
  const progress = remaining / dur;
  const ringColor = phase === 'rest' ? colors.blue : pc;
  const nextEx = workout.exercises[(exIndex + 1) % total];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <Pressable onPress={quit} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.mutedForeground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>
          Round {round} of {workout.rounds}
        </Text>
        <Pressable onPress={skip} hitSlop={12}>
          <Ionicons name="play-skip-forward" size={24} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        {phase === 'ready' ? (
          <>
            <Text style={{ color: colors.mutedForeground, fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Get ready</Text>
            <RingTimer progress={progress} seconds={remaining} color={pc} label="start" />
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', marginTop: 24 }}>
              First up: {currentEx?.exercise.name}
            </Text>
          </>
        ) : phase === 'work' ? (
          <>
            {currentEx?.exercise.image_url ? (
              <Image source={{ uri: currentEx.exercise.image_url }} style={{ width: 120, height: 120, borderRadius: radius.lg, marginBottom: 16 }} />
            ) : null}
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '700', marginBottom: 4, textAlign: 'center' }}>
              {currentEx?.exercise.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginBottom: 20 }}>
              Target: {currentEx?.target_reps ? `${currentEx.target_reps} reps` : `${currentEx?.target_duration_seconds}s`} · Move {exIndex + 1} of {total}
            </Text>
            <RingTimer progress={progress} seconds={remaining} color={pc} label="work" />
          </>
        ) : (
          // REST + rep logger
          <>
            <Text style={{ color: colors.blue, fontSize: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Rest</Text>
            <RingTimer size={200} progress={progress} seconds={remaining} color={colors.blue} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 20 }}>Log reps for {currentEx?.exercise.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 12 }}>
              <Pressable onPress={() => setRepInput((r) => Math.max(0, r - 1))} style={stepBtn}>
                <Ionicons name="remove" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={{ color: colors.foreground, fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 80, textAlign: 'center' }}>{repInput}</Text>
              <Pressable onPress={() => setRepInput((r) => r + 1)} style={stepBtn}>
                <Ionicons name="add" size={28} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={{ color: colors.subtleForeground, fontSize: 13, marginTop: 18 }}>Next up: {nextEx?.exercise.name}</Text>
          </>
        )}
      </View>

      {/* Bottom controls */}
      <View style={{ flexDirection: 'row', gap: 12, padding: spacing.lg }}>
        <Button
          label={paused ? 'Resume' : 'Pause'}
          variant="outline"
          icon={<Ionicons name={paused ? 'play' : 'pause'} size={18} color={colors.foreground} />}
          onPress={() => {
            if (paused) {
              // recompute end based on remaining
              endRef.current = Date.now() + remaining * 1000;
            }
            setPaused((p) => !p);
          }}
          style={{ flex: 1 }}
        />
        <Button
          label="Skip"
          variant="outline"
          icon={<Ionicons name="play-skip-forward" size={18} color={colors.foreground} />}
          onPress={skip}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const stepBtn = {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.surface2,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}
