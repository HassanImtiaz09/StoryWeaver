import React, { useMemo } from "react";
import { View, TouchableOpacity, Text, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSelStore } from "@/lib/sel-store";
import { cn } from "@/lib/utils";

interface SelCompetencyWheelProps {
  progress: {
    competency: string;
    name: string;
    storiesRead: number;
    emoji: string;
    color: string;
  }[];
  maxStoriesRead?: number;
  onCompetencySelect?: (competency: string | null) => void;
}

export default function SelCompetencyWheel({
  progress,
  maxStoriesRead = 10,
  onCompetencySelect,
}: SelCompetencyWheelProps) {
  const colors = useColors();
  const selectedCompetency = useSelStore(
    (state) => state.selectedCompetency
  );

  const sortedProgress = useMemo(() => {
    // Arrange in circle: self-awareness, self-management, social-awareness, relationship-skills, responsible-decision-making
    const order = [
      "self_awareness",
      "self_management",
      "social_awareness",
      "relationship_skills",
      "responsible_decision_making",
    ];
    return order.map((comp) => progress.find((p) => p.competency === comp)).filter(Boolean) as typeof progress;
  }, [progress]);

  const centerX = 140;
  const centerY = 140;
  const outerRadius = 100;
  const innerRadius = 40;

  const segments = sortedProgress.map((item, index) => {
    const totalItems = sortedProgress.length;
    const angleSlice = (360 / totalItems) * (Math.PI / 180);
    const startAngle = (index * 360) / totalItems;
    const midAngle = startAngle + 180 / totalItems;

    // Position for label
    const labelRadius = 65;
    const labelX =
      centerX + labelRadius * Math.cos(((midAngle - 90) * Math.PI) / 180);
    const labelY =
      centerY + labelRadius * Math.sin(((midAngle - 90) * Math.PI) / 180);

    // Progress arc
    const progressPercent = Math.min(
      item.storiesRead / maxStoriesRead,
      1
    );
    const progressRadius = innerRadius + (outerRadius - innerRadius) * progressPercent;

    const isSelected = selectedCompetency === item.competency;
    const bgColorMap: Record<string, string> = {
      emerald: "bg-emerald-100",
      blue: "bg-blue-100",
      purple: "bg-purple-100",
      pink: "bg-pink-100",
      amber: "bg-amber-100",
    };

    const textColorMap: Record<string, string> = {
      emerald: "text-emerald-700",
      blue: "text-blue-700",
      purple: "text-purple-700",
      pink: "text-pink-700",
      amber: "text-amber-700",
    };

    const ringColorMap: Record<string, string> = {
      emerald: "border-emerald-400",
      blue: "border-blue-400",
      purple: "border-purple-400",
      pink: "border-pink-400",
      amber: "border-amber-400",
    };

    return (
      <TouchableOpacity
        key={item.competency}
        onPress={() => {
          onCompetencySelect?.(
            isSelected ? null : item.competency
          );
        }}
        activeOpacity={0.7}
        style={{
          position: "absolute",
          left: labelX - 35,
          top: labelY - 35,
        }}
      >
        <View
          className={cn(
            "w-20 h-20 rounded-full items-center justify-center",
            bgColorMap[item.color] || "bg-gray-100",
            "border-4",
            isSelected
              ? ringColorMap[item.color] || "border-gray-400"
              : "border-transparent",
            isSelected && "shadow-lg"
          )}
        >
          <Text className="text-2xl mb-1">{item.emoji}</Text>
          <Text
            className={cn(
              "text-xs font-bold text-center",
              textColorMap[item.color] || "text-gray-700"
            )}
            numberOfLines={2}
          >
            {item.storiesRead}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  return (
    <View className="items-center py-6">
      <View className="w-80 h-80 items-center justify-center relative">
        {/* Center circle */}
        <View
          className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-gray-200 items-center justify-center"
        >
          <Text className="text-4xl">🎯</Text>
          <Text className="text-xs text-gray-600 mt-2 font-semibold">
            SEL Journey
          </Text>
        </View>

        {/* Competency segments */}
        {segments}
      </View>

      {/* Legend */}
      <View className="mt-8 px-4 w-full">
        <Text className="text-sm font-semibold text-gray-700 mb-3">
          Click a competency to filter stories
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {sortedProgress.map((item) => (
            <View
              key={item.competency}
              className="flex-row items-center bg-gray-50 px-3 py-2 rounded-full"
            >
              <Text className="text-sm">{item.emoji}</Text>
              <Text className="text-xs text-gray-700 ml-1 font-medium">
                {item.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
