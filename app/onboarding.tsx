import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from './lib/theme';
import { Card, Button } from './components/ui';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';
import { Level, setBodyWeight } from './lib/store';

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'beginner', label: 'Beginner', desc: 'New to training. 30s on / 30s off.' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Train sometimes. 40s on / 20s off.' },
  { key: 'advanced', label: 'Advanced', desc: 'Train often. 45s on / 15s off.' },
];

export default function Onboarding() {
  const { userId, refreshProfile } = useAuth();
  const [level, setLevel] = useState<Level>('intermediate');
  const [weight, setWeight] = useState('75');
  const [goal, setGoal] = useState(3);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!userId) return router.replace('/welcome');
    setSaving(true);
    const bw = parseFloat(weight) || 75;
    await setBodyWeight(bw);
    await supabase
      .from('profiles')
      .update({
        fitness_level: level,
        body_weight_kg: bw,
        weekly_goal: goal,
        onboarding_completed: true,
      })
      .eq('id', userId);
    await refreshProfile();
    setSaving(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1, fontSize: 12, marginTop: 12 }}>
          LET'S SET YOU UP
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700', marginTop: 8 }}>
          Your starting point
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 6 }}>
          We use this to build circuits that fit you.
        </Text>

        {/* Level */}
        <Text style={sectionLabel}>Fitness level</Text>
        <View style={{ gap: 10 }}>
          {LEVELS.map((l) => {
            const selected = level === l.key;
            return (
              <Pressable key={l.key} onPress={() => setLevel(l.key)}>
                <Card style={{ borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
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

        {/* Weight */}
        <Text style={sectionLabel}>Body weight (kg)</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder="75"
          placeholderTextColor={colors.subtleForeground}
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, color: colors.foreground, fontSize: 16 }}
        />
        <Text style={{ color: colors.subtleForeground, fontSize: 12, marginTop: 6 }}>
          Used to estimate calories burned.
        </Text>

        {/* Weekly goal */}
        <Text style={sectionLabel}>Weekly goal</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[2, 3, 4, 5].map((g) => {
            const active = goal === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGoal(g)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: radius.md, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontWeight: '700', fontSize: 18 }}>{g}</Text>
                <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontSize: 11 }}>/ week</Text>
              </Pressable>
            );
          })}
        </View>

        <Button label="Start training" loading={saving} onPress={finish} style={{ marginTop: spacing.xl }} icon={<Ionicons name="flash" size={18} color={colors.primaryForeground} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel = {
  color: colors.mutedForeground,
  fontSize: 13,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  marginTop: spacing.xl,
  marginBottom: 10,
};
