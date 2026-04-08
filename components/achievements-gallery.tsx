import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { AchievementBadge } from "./achievement-badge";
import type { Achievement } from "../lib/gamification-store";

interface AchievementsGalleryProps {
  achievements: Achievement[];
  isLoading?: boolean;
  onAchievementPress?: (achievement: Achievement) => void;
}

type CategoryType = "reading" | "streak" | "exploration" | "bedtime" | "collection";

const CATEGORY_LABELS: Record<CategoryType, string> = {
  reading: "Reading",
  streak: "Streaks",
  exploration: "Exploration",
  bedtime: "Bedtime",
  collection: "Collection",
};

const CATEGORY_ICONS: Record<CategoryType, string> = {
  reading: "📖",
  streak: "🔥",
  exploration: "🧭",
  bedtime: "🌙",
  collection: "📚",
};

export function AchievementsGallery({
  achievements,
  isLoading = false,
  onAchievementPress,
}: AchievementsGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(
    null
  );

  const categories = Array.from(
    new Set(achievements.map((a) => a.category))
  ) as CategoryType[];

  const filteredAchievements = selectedCategory
    ? achievements.filter((a) => a.category === selectedCategory)
    : achievements;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Category filter */}
      <View className="px-4 py-4 gap-2">
        <Text className="text-lg font-semibold text-gray-800">Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="gap-2"
        >
          <Pressable
            onPress={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === null
                ? "bg-orange-500"
                : "bg-gray-200"
            }`}
          >
            <Text
              className={`font-semibold ${
                selectedCategory === null ? "text-white" : "text-gray-700"
              }`}
            >
              All
            </Text>
          </Pressable>

          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full flex-row items-center gap-1 ${
                selectedCategory === category
                  ? "bg-orange-500"
                  : "bg-gray-200"
              }`}
            >
              <Text className="text-lg">
                {CATEGORY_ICONS[category]}
              </Text>
              <Text
                className={`font-semibold ${
                  selectedCategory === category ? "text-white" : "text-gray-700"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Achievements grid */}
      <View className="px-4 pb-8">
        <View className="flex-row flex-wrap justify-between gap-4">
          {filteredAchievements.map((achievement) => (
            <View
              key={achievement.key}
              className="w-[48%]"
            >
              <AchievementBadge
                name={achievement.name}
                icon={achievement.icon}
                description={achievement.description}
                pointsReward={achievement.pointsReward}
                tier={achievement.tier}
                unlocked={achievement.unlocked}
                onPress={() => onAchievementPress?.(achievement)}
                size="md"
              />
            </View>
          ))}
        </View>
      </View>

      {/* Stats footer */}
      <View className="px-4 py-4 bg-gray-50 rounded-lg mx-4 mb-8">
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-700">Total Achievements</Text>
            <Text className="text-lg font-bold text-orange-500">
              {achievements.filter((a) => a.unlocked).length}/{achievements.length}
            </Text>
          </View>
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-orange-500"
              style={{
                width: `${
                  (achievements.filter((a) => a.unlocked).length /
                    achievements.length) *
                  100
                }%`,
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
