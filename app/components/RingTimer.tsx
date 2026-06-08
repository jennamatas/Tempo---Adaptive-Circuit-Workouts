import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../lib/theme';

export function RingTimer({
  size = 260,
  stroke = 14,
  progress, // 0..1 remaining
  color = colors.primary,
  seconds,
  label,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  seconds: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.foreground, fontSize: size * 0.3, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {seconds}
        </Text>
        {label ? (
          <Text style={{ color, fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 }}>
            {label}
          </Text>
        ) : null}
      </View>
      {/* Progress bar */}
      <View style={{ width: size * 0.7, height: 8, backgroundColor: colors.surface2, borderRadius: 999, marginTop: 20, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: color, borderRadius: 999 }} />
      </View>
    </View>
  );
}
