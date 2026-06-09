import React from 'react';
import { View, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, phaseColor } from '../lib/theme';
import { PHASES, PhaseKey } from '../lib/brand';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <Card style={{ flex: 1, padding: spacing.lg }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <Text style={{ color: accent || colors.foreground, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        {unit ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600', marginLeft: 4, marginBottom: 5 }}>
            {unit}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function PhaseBadge({ phase, small }: { phase: string; small?: boolean }) {
  const c = phaseColor[phase] || colors.primary;
  const name = PHASES[phase as PhaseKey]?.name || phase;
  return (
    <View
      style={{
        backgroundColor: c + '22',
        borderColor: c + '55',
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: small ? 8 : 10,
        paddingVertical: small ? 2 : 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: c, fontSize: small ? 10 : 12, fontWeight: '700' }}>{name}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'danger'
      ? '#fff'
      : colors.foreground;
  const borderColor = variant === 'outline' ? colors.border : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radius.md,
          paddingVertical: 15,
          paddingHorizontal: spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Text style={[{ color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 12 }, style]}>
      {children}
    </Text>
  );
}
