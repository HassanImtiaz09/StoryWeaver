import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedPressableRN = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  /** Scale target on press (default 0.96) */
  pressScale?: number;
  /** Spring config override */
  springConfig?: { damping?: number; stiffness?: number; mass?: number };
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AnimatedPressable({
  pressScale = 0.96,
  springConfig,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const config = {
    damping: springConfig?.damping ?? 15,
    stiffness: springConfig?.stiffness ?? 200,
    mass: springConfig?.mass ?? 0.8,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!reduceMotion) {
      scale.value = withSpring(pressScale, config);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!reduceMotion) {
      scale.value = withSpring(1, config);
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableRN
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressableRN>
  );
}

// Preset variants for common use cases
export function BounceButton(props: AnimatedPressableProps) {
  return <AnimatedPressable pressScale={0.92} springConfig={{ damping: 12, stiffness: 250 }} {...props} />;
}

export function GentleButton(props: AnimatedPressableProps) {
  return <AnimatedPressable pressScale={0.98} springConfig={{ damping: 20, stiffness: 150 }} {...props} />;
}
