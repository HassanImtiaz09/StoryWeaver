import React from "react";
import { View, Text, Pressable } from "react-native";
import { TIER_COLORS } from "../constants/gamification";

interface AchievementBadgeProps {
  name: string;
  icon: string;
  description: string;
  pointsReward: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  unlocked: boolean;
  onPress?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({
  name,
  icon,
  description,
  pointsReward,
  tier,
  unlocked,
  onPress,
  size = "md",
}: AchievementBadgeProps) {
  const sizeConfig = {
    sm: { container: "w-20 h-20", icon: "text-3xl" },
    md: { container: "w-24 h-24", icon: "text-4xl" },
    lg: { container: "w-32 h-32", icon: "text-6xl" },
  };

  const config = sizeConfig[size];
  const bgColor = TIER_COLORS[tier];

  return (
    <Pressable onPress={onPress} className="items-center gap-2">
      <View
        className={`${config.container} rounded-2xl items-center justify-center relative`}
        style={{
          backgroundColor: unlocked ? bgColor : "#E5E7EB",
          borderWidth: 2,
          borderColor: unlocked ? bgColor : "#D1D5DB",
          opacity: unlocked ? 1 : 0.5,
        }}
      >
        {/* Locked overlay */}
        {!unlocked && (
          <View className="absolute inset-0 rounded-2xl bg-gray-600 opacity-40 items-center justify-center">
            <Text className="text-2xl">🔒</Text>
          </View>
        )}

        {/* Badge content */}
        <Text className={`${config.icon}`}>{icon}</Text>

        {/* Glow effect for unlocked */}
        {unlocked && (
          <View
            className="absolute inset-0 rounded-2xl border border-white"
            style={{ opacity: 0.3 }}
          />
        )}
      </View>

      <View className="items-center gap-1 w-24">
        <Text
          className="text-sm font-semibold text-gray-800 text-center"
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text className="text-xs text-gray-500 text-center" numberOfLines={2}>
          +{pointsReward} pts
        </Text>
      </View>
    </Pressable>
  );
}
