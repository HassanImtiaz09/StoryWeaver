import React from "react";
import { View, Text } from "react-native";
import {
  calculateLevel,
  getCurrentLevelThreshold,
  getNextLevelThreshold,
} from "../constants/gamification";
import { FunText, BodyText, BodyTextSmall } from "./styled-text";

interface PointsDisplayProps {
  totalPoints: number;
  compact?: boolean;
}

const LEVEL_COLORS = [
  "#93C5FD", // Blue (Level 1)
  "#86EFAC", // Green (Level 2)
  "#FBBF24", // Amber (Level 3)
  "#FB923C", // Orange (Level 4)
  "#F87171", // Red (Level 5)
  "#D8B4FE", // Purple (Level 6)
  "#67E8F9", // Cyan (Level 7)
  "#FDBA74", // Light Orange (Level 8)
  "#F0ABFC", // Pink (Level 9)
  "#FCD34D", // Yellow (Level 10+)
];

export function PointsDisplay({
  totalPoints,
  compact = false,
}: PointsDisplayProps) {
  const level = calculateLevel(totalPoints);
  const currentThreshold = getCurrentLevelThreshold(totalPoints);
  const nextThreshold = getNextLevelThreshold(totalPoints);
  const pointsInCurrentLevel = totalPoints - currentThreshold;
  const pointsNeededForLevel = nextThreshold - currentThreshold;
  const progressPercent = (pointsInCurrentLevel / pointsNeededForLevel) * 100;

  const levelColor = LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)];

  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: levelColor }}
        >
          <FunText style={{ fontSize: 11, color: "white" }}>{level}</FunText>
        </View>
        <View>
          <FunText style={{ fontSize: 14 }}>
            {totalPoints.toLocaleString()} pts
          </FunText>
          <BodyTextSmall style={{ color: "#999" }}>Level {level}</BodyTextSmall>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-3 bg-white rounded-lg p-4">
      {/* Level circle */}
      <View className="flex-row items-center gap-4">
        <View
          className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
          style={{
            backgroundColor: levelColor,
            shadowColor: levelColor,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <View className="items-center">
            <FunText style={{ fontSize: 24, color: "white" }}>{level}</FunText>
            <BodyTextSmall style={{ color: "rgba(255,255,255,0.8)" }}>LEVEL</BodyTextSmall>
          </View>
        </View>

        <View className="flex-1 gap-1">
          <FunText style={{ fontSize: 18 }}>
            {totalPoints.toLocaleString()} Points
          </FunText>
          <BodyText style={{ color: "#666" }}>
            {nextThreshold - totalPoints} pts to next level
          </BodyText>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
            <View
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: levelColor,
              }}
            />
          </View>
        </View>
      </View>

      {/* Level info */}
      <View className="bg-gray-50 rounded-lg p-3 gap-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-semibold text-gray-600 uppercase">
            Level {level} Progress
          </Text>
          <Text className="text-sm font-bold text-gray-800">
            {Math.round(progressPercent)}%
          </Text>
        </View>
        <View className="flex-row justify-between text-xs text-gray-500">
          <Text>{currentThreshold.toLocaleString()}</Text>
          <Text>{nextThreshold.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}
