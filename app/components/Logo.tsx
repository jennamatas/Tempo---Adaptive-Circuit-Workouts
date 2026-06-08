import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../lib/theme';

export function RingMark({ size = 32 }: { size?: number }) {
  const stroke = Math.max(3, size * 0.16);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: colors.primary,
        borderRightColor: colors.surface2,
        transform: [{ rotate: '-45deg' }],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: size * 0.18, height: size * 0.18, borderRadius: size, backgroundColor: colors.primary, transform: [{ rotate: '45deg' }] }} />
    </View>
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
