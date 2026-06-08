import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, phaseColor } from '../lib/theme';
import { brand } from '../lib/brand';
import { Logo } from '../components/Logo';
import { Card, StatCard, PhaseBadge, Button, SectionTitle } from '../components/ui';
import { BarChart, HBar } from '../components/BarChart';
import { fetchSessions, computeStats, computePersonalRecords, DashboardStats, PersonalRecord } from '../lib/queries';
import { SessionRow } from '../lib/types';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const { userId, profile } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await fetchSessions(userId);
    setSessions(s);
    setStats(computeStats(s));
    setPrs(computePersonalRecords(s));
  }, [userId]);


  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const empty = stats && stats.totalWorkouts === 0;

  const bpData = stats
    ? Object.entries(stats.bodyPartBalance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v], i) => ({
          label: k,
          value: v,
          color: [colors.primary, colors.blue, colors.coral, colors.violet, colors.success, colors.warning][i % 6],
        }))
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Logo size={26} />
        </View>

        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>
          {profile?.full_name ? `Hey, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}
        </Text>

        {stats && stats.streak > 0 ? (
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 4 }}>
            {brand.copy.streakNudge(stats.streak)}
          </Text>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 4 }}>{brand.oneLiner}</Text>
        )}

        {empty ? (
          <Card style={{ marginTop: spacing.xl, alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="barbell-outline" size={48} color={colors.subtleForeground} />
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 16, marginBottom: 20, paddingHorizontal: 20 }}>
              {brand.copy.emptyDashboard}
            </Text>
            <Button label="Generate your first circuit" onPress={() => router.push('/workout')} />
          </Card>
        ) : (
          <>
            {/* Stat cards */}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <StatCard
                label="This week"
                value={stats?.thisWeek ?? 0}
                unit={`/ ${profile?.weekly_goal ?? 3} goal`}
                accent={colors.primary}
              />
              <StatCard label="Streak" value={stats?.streak ?? 0} unit="days" accent={colors.coral} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <StatCard label="Workouts" value={stats?.totalWorkouts ?? 0} />
              <StatCard label="Minutes" value={stats?.totalMinutes ?? 0} />
            </View>

            {/* CTA */}
            <Button
              label="Start today's circuit"
              icon={<Ionicons name="flash" size={18} color={colors.primaryForeground} />}
              onPress={() => router.push('/workout')}
              style={{ marginTop: spacing.lg }}
            />

            {/* Weekly volume */}
            <Card style={{ marginTop: spacing.xl }}>
              <SectionTitle>Weekly volume</SectionTitle>
              {stats && <BarChart data={stats.weekly.map((w) => ({ label: w.label, value: w.workouts }))} />}
            </Card>

            {/* Reps over time */}
            <Card style={{ marginTop: spacing.lg }}>
              <SectionTitle>Reps over time</SectionTitle>
              {stats && (
                <BarChart
                  data={stats.weekly.map((w) => ({ label: w.label, value: w.reps }))}
                  color={colors.blue}
                />
              )}
            </Card>

            {/* Body part balance */}
            {bpData.length > 0 && (
              <Card style={{ marginTop: spacing.lg }}>
                <SectionTitle>Body-part balance</SectionTitle>
                <HBar data={bpData} />
              </Card>
            )}

            {/* Personal records */}
            {prs.length > 0 && (
              <Card style={{ marginTop: spacing.lg }}>
                <SectionTitle>Personal records</SectionTitle>
                <View style={{ gap: 12 }}>
                  {prs.map((pr) => (
                    <View key={pr.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {pr.imageUrl ? (
                        <Image source={{ uri: pr.imageUrl }} style={{ width: 40, height: 40, borderRadius: radius.sm }} />
                      ) : (
                        <View style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="trophy" size={18} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                          {pr.name}
                        </Text>
                        <Text style={{ color: colors.subtleForeground, fontSize: 12, marginTop: 2 }}>
                          {pr.bodyPart} · {new Date(pr.achievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }}>
                        {pr.reps} reps
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Recent */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Recent sessions</Text>
              <Pressable onPress={() => router.push('/history')}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>See all</Text>
              </Pressable>
            </View>
            {sessions.slice(0, 4).map((s) => (
              <Pressable key={s.id} onPress={() => router.push('/history')}>
                <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (phaseColor[s.phase] || colors.primary) + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={22} color={phaseColor[s.phase] || colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>
                      {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
                      {Math.round((s.duration_seconds || 0) / 60)} min · {s.total_reps} reps · {Math.round(s.calories_estimate || 0)} kcal
                    </Text>
                  </View>
                  <PhaseBadge phase={s.phase} small />
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
