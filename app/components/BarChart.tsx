import React from 'react';
import { View, Text } from 'react-native';
import { colors, radius } from '../lib/theme';

export function BarChart({
  data,
  height = 140,
  color = colors.primary,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (height - 20));
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ color: colors.subtleForeground, fontSize: 9, marginBottom: 4 }}>
                {d.value > 0 ? d.value : ''}
              </Text>
              <View
                style={{
                  width: '78%',
                  height: h,
                  backgroundColor: d.value > 0 ? color : colors.surface2,
                  borderRadius: radius.sm,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6, gap: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.subtleForeground, fontSize: 9 }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function HBar({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>{d.label}</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{d.value}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${(d.value / max) * 100}%`, height: 8, backgroundColor: d.color, borderRadius: 999 }} />
          </View>
        </View>
      ))}
    </View>
  );
}
