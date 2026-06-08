import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../lib/theme';
import { PhaseBadge } from '../components/ui';
import { supabase } from '../lib/supabase';
import { Exercise } from '../lib/types';

const BODY_PARTS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Cardio'];

export default function Library() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [bp, setBp] = useState('All');

  useEffect(() => {
    supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('body_part')
      .then(({ data }) => setExercises((data || []) as Exercise[]));
  }, []);

  const filtered = exercises.filter((e) => {
    const matchBp = bp === 'All' || e.body_part === bp;
    const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase());
    return matchBp && matchQ;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>Exercise library</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 4 }}>{exercises.length} moves</Text>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginTop: spacing.lg }}>
          <Ionicons name="search" size={18} color={colors.subtleForeground} />
          <TextInput
            placeholder="Search exercises"
            placeholderTextColor={colors.subtleForeground}
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, color: colors.foreground, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15 }}
          />
        </View>

        {/* Body part filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {BODY_PARTS.map((b) => {
              const active = bp === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBp(b)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontWeight: '700', fontSize: 13 }}>{b}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.lg }}>
          {filtered.map((e) => (
            <Pressable key={e.id} onPress={() => router.push(`/exercise/${e.slug}`)} style={{ width: '48.5%', marginBottom: 14 }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                {e.image_url ? (
                  <Image source={{ uri: e.image_url }} style={{ width: '100%', height: 110 }} />
                ) : (
                  <View style={{ width: '100%', height: 110, backgroundColor: colors.surface2 }} />
                )}
                <View style={{ padding: 10 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>{e.body_part}</Text>
                  <View style={{ marginTop: 8 }}>
                    <PhaseBadge phase={e.phase} small />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
