import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";

interface StreakCounterProps {
  currentStreak: number;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_CONFIG = {
  sm: { box: 44, emoji: 20, count: 13, glow: 52 },
  md: { box: 60, emoji: 28, count: 18, glow: 72 },
  lg: { box: 76, emoji: 36, count: 22, glow: 90 },
};

export function StreakCounter({
  currentStreak,
  isActive = true,
  size = "md",
}: StreakCounterProps) {
  const config = SIZE_CONFIG[size];

  // Main pulse
  const scale = useSharedValue(1);
  // Flame flicker (two layers for organic feel)
  const flame1Y = useSharedValue(0);
  const flame1Scale = useSharedValue(1);
  const flame2Y = useSharedValue(0);
  const flame2Opacity = useSharedValue(0.7);
  // Outer glow pulse
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isActive && currentStreak > 0) {
      // Main bounce pulse
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Flame flicker layer 1 — fast
      flame1Y.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 250, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      flame1Scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 300 }),
          withTiming(0.95, { duration: 250 })
        ),
        -1,
        true
      );

      // Flame flicker layer 2 — offset
      flame2Y.value = withDelay(
        150,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 300, easing: Easing.out(Easing.ease) }),
            withTiming(2, { duration: 250, easing: Easing.in(Easing.ease) })
          ),
          -1,
          true
        )
      );
      flame2Opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 350 }),
          withTiming(0.5, { duration: 300 })
        ),
        -1,
        true
      );

      // Outer glow
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(0.15, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
      glowOpacity.value = 0;
    }
  }, [isActive, currentStreak]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flame1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: flame1Y.value },
      { scale: flame1Scale.value },
    ],
  }));

  const flame2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: flame2Y.value }],
    opacity: flame2Opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  if (currentStreak === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { width: config.box, height: config.box },
        ]}
      >
        <Text style={[styles.emptyText, { fontSize: config.count }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width: config.glow, height: config.glow }]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: config.glow,
            height: config.glow,
            borderRadius: config.glow / 2,
          },
          glowStyle,
        ]}
      />

      {/* Main circle */}
      <Animated.View
        style={[
          styles.container,
          {
            width: config.box,
            height: config.box,
            borderRadius: config.box / 2,
          },
          containerStyle,
        ]}
      >
        {/* Flame layer 1 (primary) */}
        <Animated.View style={flame1Style}>
          <Text style={{ fontSize: config.emoji, lineHeight: config.emoji + 4 }}>
            🔥
          </Text>
        </Animated.View>

        {/* Flame layer 2 (flicker overlay — slightly offset) */}
        <Animated.View style={[styles.flameOverlay, flame2Style]}>
          <Text style={{ fontSize: config.emoji * 0.7, lineHeight: config.emoji }}>
            🔥
          </Text>
        </Animated.View>

        {/* Count */}
        <Text
          style={[styles.count, { fontSize: config.count }]}
          accessibilityLabel={`${currentStreak} day streak`}
        >
          {currentStreak}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(255, 140, 0, 0.3)",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B1A",
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  flameOverlay: {
    position: "absolute",
    top: 2,
    right: -2,
  },
  count: {
    color: "#FFFFFF",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: -4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(150,150,150,0.15)",
    borderRadius: 999,
  },
  emptyText: {
    color: "#9CA3AF",
    fontWeight: "600",
  },
});
