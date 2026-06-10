import React, { useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Staggered fade + slide-up entrance. Pass an incrementing `delay` for a cascade.
export function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(460)} style={style}>
      {children}
    </Animated.View>
  );
}

// Pressable that springs down a touch when pressed — tactile, playful feel.
export function PressableScale({
  children,
  style,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(0.955, { damping: 15, stiffness: 260 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        rest.onPressOut?.(e);
      }}
      style={[aStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Gentle continuous vertical float (a slow "wave"). Returns an animated style.
export function useFloat(amount = 6, duration = 2600) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [v, duration]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: -amount * v.value }] }));
}

// Slow Ken-Burns drift for hero/feature images — scale + pan so the image "flows".
export function useKenBurns(from = 1, to = 1.14, duration = 9000) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [v, duration]);
  return useAnimatedStyle(() => ({
    transform: [{ scale: from + (to - from) * v.value }, { translateX: 12 * v.value }, { translateY: -8 * v.value }],
  }));
}

export { Animated };
