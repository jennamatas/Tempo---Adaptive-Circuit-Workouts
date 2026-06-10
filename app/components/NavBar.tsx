import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius, desktopBreakpoint } from '../lib/theme';
import { Logo } from './Logo';

type Meta = { icon: keyof typeof Ionicons.glyphMap; label: string };

const META: Record<string, Meta> = {
  index: { icon: 'home', label: 'Home' },
  workout: { icon: 'flash', label: 'Workout' },
  history: { icon: 'time', label: 'History' },
  library: { icon: 'grid', label: 'Library' },
  profile: { icon: 'person', label: 'Profile' },
};

// Adaptive navigation: a left sidebar on desktop/tablet, a bottom tab bar on
// phones. Rendered as the Tabs `tabBar`; the navigator positions it left vs
// bottom via `tabBarPosition` (see (tabs)/_layout.tsx).
export function NavBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= desktopBreakpoint;

  const items = state.routes
    .map((route, index) => {
      const meta = META[route.name];
      if (!meta) return null;
      const focused = state.index === index;
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      };
      return { key: route.key, meta, focused, onPress };
    })
    .filter((x): x is { key: string; meta: Meta; focused: boolean; onPress: () => void } => x !== null);

  if (desktop) {
    return (
      <View
        style={{
          width: 232,
          backgroundColor: colors.surface,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          paddingTop: insets.top + 22,
          paddingHorizontal: 14,
          paddingBottom: insets.bottom + 20,
          gap: 4,
        }}
      >
        <View style={{ paddingHorizontal: 10, marginBottom: 24 }}>
          <Logo size={26} />
        </View>
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={it.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              backgroundColor: it.focused ? colors.surface2 : 'transparent',
            }}
          >
            <Ionicons name={it.meta.icon} size={22} color={it.focused ? colors.primary : colors.subtleForeground} />
            <Text style={{ color: it.focused ? colors.foreground : colors.mutedForeground, fontSize: 15, fontWeight: it.focused ? '700' : '600' }}>
              {it.meta.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {items.map((it) => (
        <Pressable key={it.key} onPress={it.onPress} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }}>
          <Ionicons name={it.meta.icon} size={24} color={it.focused ? colors.primary : colors.subtleForeground} />
          <Text style={{ color: it.focused ? colors.primary : colors.subtleForeground, fontSize: 11, fontWeight: '600' }}>
            {it.meta.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
