import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface SelTemplateCardProps {
  template: {
    id: number;
    title: string;
    description: string;
    competency: string;
    ageRangeMin: number;
    ageRangeMax: number;
    difficulty: "gentle" | "moderate" | "challenging";
    emotionalGoals: string[];
    iconEmoji: string;
  };
  onPress: () => void;
  isSelected?: boolean;
}

export default function SelTemplateCard({
  template,
  onPress,
  isSelected = false,
}: SelTemplateCardProps) {
  const colors = useColors();

  const competencyNameMap: Record<string, string> = {
    self_awareness: "Self-Awareness",
    self_management: "Self-Management",
    social_awareness: "Social Awareness",
    relationship_skills: "Relationship Skills",
    responsible_decision_making: "Decision-Making",
  };

  const competencyColorMap: Record<string, string> = {
    self_awareness: "bg-emerald-50 border-emerald-200",
    self_management: "bg-blue-50 border-blue-200",
    social_awareness: "bg-purple-50 border-purple-200",
    relationship_skills: "bg-pink-50 border-pink-200",
    responsible_decision_making: "bg-amber-50 border-amber-200",
  };

  const competencyBadgeMap: Record<string, string> = {
    self_awareness: "bg-emerald-100 text-emerald-700",
    self_management: "bg-blue-100 text-blue-700",
    social_awareness: "bg-purple-100 text-purple-700",
    relationship_skills: "bg-pink-100 text-pink-700",
    responsible_decision_making: "bg-amber-100 text-amber-700",
  };

  const difficultyMap = {
    gentle: { label: "Gentle", emoji: "🌱" },
    moderate: { label: "Moderate", emoji: "🌿" },
    challenging: { label: "Challenging", emoji: "🌳" },
  };

  const ageLabel = `${template.ageRangeMin}-${template.ageRangeMax} years`;
  const difficulty = difficultyMap[template.difficulty];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={cn(
        "rounded-2xl p-4 mb-3 border-2 transition-all",
        competencyColorMap[template.competency] || "bg-gray-50 border-gray-200",
        isSelected && "border-blue-400 shadow-md"
      )}
    >
      {/* Header with icon and title */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-3xl mr-3">{template.iconEmoji}</Text>
          <Text
            className="text-lg font-bold text-gray-800 flex-1"
            numberOfLines={2}
          >
            {template.title}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text
        className="text-sm text-gray-700 mb-3 leading-5"
        numberOfLines={2}
      >
        {template.description}
      </Text>

      {/* Badges row */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        {/* Competency badge */}
        <View
          className={cn(
            "px-3 py-1 rounded-full",
            competencyBadgeMap[template.competency] ||
              "bg-gray-200 text-gray-700"
          )}
        >
          <Text className="text-xs font-semibold">
            {competencyNameMap[template.competency] ||
              template.competency.replace(/_/g, " ")}
          </Text>
        </View>

        {/* Age range badge */}
        <View className="px-3 py-1 rounded-full bg-blue-100">
          <Text className="text-xs font-semibold text-blue-700">
            👶 {ageLabel}
          </Text>
        </View>

        {/* Difficulty badge */}
        <View className="px-3 py-1 rounded-full bg-orange-100">
          <Text className="text-xs font-semibold text-orange-700">
            {difficulty.emoji} {difficulty.label}
          </Text>
        </View>
      </View>

      {/* Emotional goals */}
      {template.emotionalGoals.length > 0 && (
        <View className="mb-3 pb-3 border-t border-gray-300 border-opacity-30">
          <Text className="text-xs font-semibold text-gray-600 mt-2 mb-2">
            Emotional Skills:
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {template.emotionalGoals.map((goal, index) => (
              <View
                key={index}
                className="bg-white bg-opacity-60 px-2 py-1 rounded"
              >
                <Text className="text-xs text-gray-700">{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Generate Story Button */}
      <TouchableOpacity
        onPress={onPress}
        className="bg-blue-500 rounded-lg py-3 items-center"
      >
        <Text className="text-white font-bold text-sm">
          ✨ Generate Story
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
