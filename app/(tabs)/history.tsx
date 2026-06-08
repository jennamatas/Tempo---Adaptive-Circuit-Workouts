import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, phaseColor } from '../lib/theme';
import { Card, PhaseBadge } from '../components/ui';
import { fetchSessions } from '../lib/queries';
import { SessionRow } from '../lib/types';
import { useAuth } from '../lib/auth';


const FILTERS = ['all', 'foundation', 'build', 'peak'];

export default function History() {
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setSessions(await fetchSessions(userId));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = sessions.filter((s) => filter === 'all' || s.phase === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>History</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 4 }}>
          {sessions.length} sessions logged
        </Text>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {filtered.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 40, marginTop: 12 }}>
            <Ionicons name="time-outline" size={44} color={colors.subtleForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 14, textAlign: 'center' }}>No sessions yet.</Text>
          </Card>
        ) : (
          filtered.map((s) => {
            const open = expanded === s.id;
            return (
              <Pressable key={s.id} onPress={() => setExpanded(open ? null : s.id)}>
                <Card style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: (phaseColor[s.phase] || colors.primary) + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="barbell" size={22} color={phaseColor[s.phase] || colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>
                        {new Date(s.started_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                        {Math.round((s.duration_seconds || 0) / 60)} min · {s.total_reps} reps · {Math.round(s.calories_estimate || 0)} kcal
                      </Text>
                    </View>
                    <PhaseBadge phase={s.phase} small />
                  </View>

                  {open && s.exercises && s.exercises.length > 0 && (
                    <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 }}>
                      {s.exercises.map((e, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {e.image_url ? <Image source={{ uri: e.image_url }} style={{ width: 36, height: 36, borderRadius: 8 }} /> : null}
                          <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1 }}>{e.name}</Text>
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>{e.reps ?? 0} reps</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
