import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '../lib/theme';

export function RingMark({ size = 32, spin = true }: { size?: number; spin?: boolean }) {
  const stroke = Math.max(3, size * 0.16);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (spin) rot.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1, false);
  }, [spin, rot]);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-45 + rot.value}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: colors.primary,
          borderRightColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        aStyle,
      ]}
    >
      <View style={{ width: size * 0.18, height: size * 0.18, borderRadius: size, backgroundColor: colors.primary }} />
    </Animated.View>
  );
}

export function Logo({ variant = 'full', size = 28 }: { variant?: 'full' | 'mark'; size?: number }) {
  if (variant === 'mark') return <RingMark size={size} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: size, fontWeight: '700', color: colors.foreground, letterSpacing: -0.5 }}>
        temp
      </Text>
      <RingMark size={size * 0.9} />
    </View>
  );
}
