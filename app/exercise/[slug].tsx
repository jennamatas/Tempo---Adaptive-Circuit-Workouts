import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../lib/theme';
import { PhaseBadge } from '../components/ui';
import { supabase } from '../lib/supabase';
import { Exercise } from '../lib/types';

export default function ExerciseDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [ex, setEx] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('exercises')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => setEx(data as Exercise));
  }, [slug]);

  if (!ex) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ position: 'relative' }}>
          {ex.image_url ? <Image source={{ uri: ex.image_url }} style={{ width: '100%', height: 280 }} /> : null}
          <Pressable
            onPress={() => router.back()}
            style={{ position: 'absolute', top: 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PhaseBadge phase={ex.phase} />
            <View style={{ backgroundColor: colors.surface2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>{ex.body_part}</Text>
            </View>
          </View>

          <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700', marginTop: 12 }}>{ex.name}</Text>
          {ex.description ? <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 8, lineHeight: 22 }}>{ex.description}</Text> : null}

          {/* Quick stats */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.lg }}>
            <Info label="Target" value={ex.default_reps ? `${ex.default_reps} reps` : `${ex.default_duration_seconds}s`} />
            <Info label="Equipment" value={ex.equipment} />
            <Info label="Pattern" value={ex.movement_pattern || '—'} />
          </View>

          {/* Instructions */}
          {ex.instructions ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>How to do it</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 24 }}>{ex.instructions}</Text>
            </View>
          ) : null}

          {/* Muscles */}
          {ex.muscle_groups && ex.muscle_groups.length > 0 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: 10 }}>Muscles worked</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ex.muscle_groups.map((m) => (
                  <View key={m} style={{ backgroundColor: colors.primary + '18', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
      <Text style={{ color: colors.subtleForeground, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
