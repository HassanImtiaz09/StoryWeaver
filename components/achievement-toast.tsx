import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
  FadeOutDown,
} from "react-native-reanimated";
import { TIER_COLORS } from "../constants/gamification";

interface AchievementToastProps {
  visible: boolean;
  name: string;
  icon: string;
  pointsReward: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  onHide?: () => void;
  autoHideDuration?: number;
}

export function AchievementToast({
  visible,
  name,
  icon,
  pointsReward,
  tier,
  onHide,
  autoHideDuration = 3000,
}: AchievementToastProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const bgColor = TIER_COLORS[tier];

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(0.8, { duration: 0 }),
        withTiming(1.1, {
          duration: 400,
          easing: Easing.out(Easing.back(2)),
        }),
        withTiming(1, {
          duration: 200,
          easing: Easing.ease,
        }),
        withDelay(
          autoHideDuration - 400,
          withTiming(0.8, {
            duration: 400,
            easing: Easing.in(Easing.ease),
          })
        )
      );

      opacity.value = withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(
          autoHideDuration - 400,
          withTiming(0, { duration: 400 })
        )
      );

      const timer = setTimeout(() => {
        onHide?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={animatedStyle}
      className="absolute inset-0 items-center justify-center pointer-events-none"
    >
      <View
        className="rounded-3xl px-8 py-6 gap-2 items-center justify-center"
        style={{ backgroundColor: bgColor, minWidth: 280 }}
      >
        {/* Stars/confetti effect */}
        <View className="absolute inset-0 overflow-hidden rounded-3xl">
          {[...Array(6)].map((_, i) => (
            <Animated.Text
              key={i}
              className="absolute text-xl"
              entering={FadeInUp.delay(100 + i * 50)}
              exiting={FadeOutDown}
              style={{
                left: `${15 + (i % 3) * 30}%`,
                top: `${10 + Math.floor(i / 3) * 40}%`,
              }}
            >
              ✨
            </Animated.Text>
          ))}
        </View>

        {/* Content */}
        <View className="items-center gap-2 z-10">
          <Text className="text-5xl">{icon}</Text>
          <Text className="text-xl font-bold text-white text-center">
            {name}
          </Text>
          <Text className="text-lg font-semibold text-white">
            +{pointsReward} points
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
