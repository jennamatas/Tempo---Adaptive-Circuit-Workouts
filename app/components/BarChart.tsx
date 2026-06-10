import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius } from '../lib/theme';

function VBar({ height, color, delay, active }: { height: number; color: string; delay: number; active: boolean }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(height, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [height, delay, h]);
  const aStyle = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View
      style={[{ width: '78%', backgroundColor: active ? color : colors.surface2, borderRadius: radius.sm }, aStyle]}
    />
  );
}

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
              <VBar height={h} color={color} delay={i * 55} active={d.value > 0} />
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

function HBarRow({ label, value, color, pct, delay }: { label: string; value: number; color: string; pct: number; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay, w]);
  const aStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{value}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 999, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 8, backgroundColor: color, borderRadius: 999 }, aStyle]} />
      </View>
    </View>
  );
}

export function HBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => (
        <HBarRow key={i} label={d.label} value={d.value} color={d.color} pct={(d.value / max) * 100} delay={i * 70} />
      ))}
    </View>
  );
}
