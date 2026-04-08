import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface ProgressItem {
  competency: string;
  name: string;
  storiesRead: number;
  emoji: string;
  color: string;
}

interface SelProgressChartProps {
  progress: ProgressItem[];
  maxStoriesRead?: number;
  showBadges?: boolean;
}

const BADGES = [
  { storiesRead: 1, emoji: "🌱", label: "Seed" },
  { storiesRead: 3, emoji: "🌿", label: "Sprout" },
  { storiesRead: 5, emoji: "🌾", label: "Growing" },
  { storiesRead: 8, emoji: "🌳", label: "Tree" },
  { storiesRead: 10, emoji: "🏆", label: "Master" },
];

export default function SelProgressChart({
  progress,
  maxStoriesRead = 10,
  showBadges = true,
}: SelProgressChartProps) {
  const colors = useColors();

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-400",
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    pink: "bg-pink-400",
    amber: "bg-amber-400",
  };

  const totalStories = useMemo(
    () => progress.reduce((sum, p) => sum + p.storiesRead, 0),
    [progress]
  );

  const earnedBadges = useMemo(() => {
    const badges: Array<{
      storiesRead: number;
      emoji: string;
      label: string;
    }> = [];
    for (const badge of BADGES) {
      if (totalStories >= badge.storiesRead) {
        badges.push(badge);
      }
    }
    return badges;
  }, [totalStories]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            Your Growth Journey
          </Text>
          <Text className="text-lg font-semibold text-blue-600">
            {totalStories} stories read
          </Text>
        </View>

        {/* Progress bars by competency */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Progress by Skill:
          </Text>
          {progress.map((item) => (
            <View key={item.competency} className="mb-4">
              {/* Competency name and count */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <Text className="text-lg">{item.emoji}</Text>
                  <Text className="text-sm font-semibold text-gray-800 ml-2">
                    {item.name}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-gray-700">
                  {item.storiesRead}/{maxStoriesRead}
                </Text>
              </View>

              {/* Progress bar */}
              <View className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className={cn(
                    "h-full rounded-full items-center justify-center transition-all",
                    colorMap[item.color] || "bg-gray-400"
                  )}
                  style={{
                    width: `${
                      (item.storiesRead / maxStoriesRead) * 100
                    }%`,
                  }}
                >
                  {item.storiesRead > 0 && (
                    <Text className="text-xs font-bold text-white">
                      {Math.round(
                        (item.storiesRead / maxStoriesRead) * 100
                      )}%
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Badges section */}
        {showBadges && earnedBadges.length > 0 && (
          <View className="mb-8 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              🎖️ Badges Earned:
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {earnedBadges.map((badge, index) => (
                <View key={index} className="items-center">
                  <Text className="text-4xl mb-1">{badge.emoji}</Text>
                  <Text className="text-xs font-semibold text-gray-700">
                    {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Next milestone */}
        {totalStories < 10 && (
          <View className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
            <Text className="text-sm font-semibold text-blue-900 mb-2">
              🎯 Next Milestone:
            </Text>
            <Text className="text-sm text-blue-800">
              Read {Math.max(1, 10 - totalStories)} more{" "}
              {Math.max(1, 10 - totalStories) === 1 ? "story" : "stories"} to
              become a SEL Master! 🏆
            </Text>
          </View>
        )}

        {/* Completion celebration */}
        {totalStories >= 10 && (
          <View className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-300 items-center">
            <Text className="text-5xl mb-3">🌟</Text>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Amazing Growth!
            </Text>
            <Text className="text-sm text-gray-700 text-center">
              You've explored all five social-emotional skills. Keep learning and
              growing!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
