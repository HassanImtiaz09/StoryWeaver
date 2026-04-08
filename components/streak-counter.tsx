import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface StreakCounterProps {
  currentStreak: number;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StreakCounter({
  currentStreak,
  isActive = true,
  size = "md",
}: StreakCounterProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive && currentStreak > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, {
            duration: 400,
            easing: Easing.ease,
          }),
          withTiming(1, {
            duration: 400,
            easing: Easing.ease,
          })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [isActive, currentStreak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeConfig = {
    sm: { container: "w-12 h-12", text: "text-lg", emoji: "text-2xl" },
    md: { container: "w-16 h-16", text: "text-2xl", emoji: "text-4xl" },
    lg: { container: "w-20 h-20", text: "text-3xl", emoji: "text-5xl" },
  };

  const config = sizeConfig[size];

  if (currentStreak === 0) {
    return (
      <View className={`${config.container} items-center justify-center`}>
        <Text className="text-gray-400">-</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={animatedStyle}
      className={`${config.container} rounded-full bg-gradient-to-br from-orange-400 to-red-500 items-center justify-center`}
    >
      <View className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 opacity-30" />
      <View className="items-center justify-center">
        <Text className={`${config.emoji} font-bold`}>🔥</Text>
        <Text className={`${config.text} font-bold text-white`}>
          {currentStreak}
        </Text>
      </View>
    </Animated.View>
  );
}
