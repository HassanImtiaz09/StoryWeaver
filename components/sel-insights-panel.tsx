import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface SelInsights {
  childId: number;
  totalStoriesRead: number;
  emotionFrequency: Record<string, number>;
  averageEmotionalIntensity: number;
  weeklyActivityCount: number;
  progressByCompetency: Array<{
    competency: string;
    name: string;
    storiesRead: number;
    emoji: string;
    color: string;
  }>;
  areasOfGrowth: string[];
  areasToExplore: string[];
  recentResponses: Array<{
    id: number;
    emotionFelt: string;
    emotionIntensity: number;
    reflection?: string;
    createdAt: Date;
  }>;
}

interface SelInsightsPanelProps {
  insights: SelInsights;
  onExportPdf?: () => void;
  isLoading?: boolean;
}

const emotionEmojis: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  worried: "😟",
  brave: "💪",
  calm: "😌",
};

export default function SelInsightsPanel({
  insights,
  onExportPdf,
  isLoading = false,
}: SelInsightsPanelProps) {
  const colors = useColors();

  const topEmotion = useMemo(() => {
    const sorted = Object.entries(insights.emotionFrequency).sort(
      (a, b) => b[1] - a[1]
    );
    return sorted[0];
  }, [insights.emotionFrequency]);

  const emotionTrend = useMemo(() => {
    if (insights.recentResponses.length === 0) return "No data yet";
    const avgIntensity = insights.averageEmotionalIntensity;
    if (avgIntensity >= 4) return "Very strong emotions";
    if (avgIntensity >= 3) return "Moderate emotions";
    return "Mild emotions";
  }, [insights.recentResponses, insights.averageEmotionalIntensity]);

  const compColorMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    pink: "bg-pink-50 border-pink-200",
    amber: "bg-amber-50 border-amber-200",
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            📊 Your SEL Insights
          </Text>
          <Text className="text-sm text-gray-600">
            Understanding your emotional growth and learning patterns
          </Text>
        </View>

        {/* Key Metrics */}
        <View className="mb-6 flex-row gap-3">
          {/* Stories Read */}
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-3xl font-bold text-blue-600">
              {insights.totalStoriesRead}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">Stories Read</Text>
          </View>

          {/* Weekly Activity */}
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-3xl font-bold text-purple-600">
              {insights.weeklyActivityCount}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">This Week</Text>
          </View>

          {/* Avg Intensity */}
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-3xl font-bold text-orange-600">
              {insights.averageEmotionalIntensity.toFixed(1)}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">Avg Intensity</Text>
          </View>
        </View>

        {/* Top Emotion */}
        {topEmotion && (
          <View className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Most Frequent Emotion:
            </Text>
            <View className="flex-row items-center">
              <Text className="text-4xl mr-3">
                {emotionEmojis[topEmotion[0]] || "😊"}
              </Text>
              <View>
                <Text className="text-lg font-bold text-gray-800">
                  {topEmotion[0].charAt(0).toUpperCase() +
                    topEmotion[0].slice(1)}
                </Text>
                <Text className="text-sm text-gray-600">
                  Felt {topEmotion[1]} times
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Emotional Trend */}
        <View className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Emotional Pattern:
          </Text>
          <Text className="text-base font-semibold text-blue-900">
            {emotionTrend}
          </Text>
        </View>

        {/* Areas of Growth */}
        {insights.areasOfGrowth.length > 0 && (
          <View className="mb-6 p-4 bg-green-50 rounded-xl border-2 border-green-200">
            <Text className="text-sm font-semibold text-green-900 mb-3">
              🌱 Areas of Growth:
            </Text>
            <View className="gap-2">
              {insights.areasOfGrowth.map((competency, index) => {
                const comp = insights.progressByCompetency.find(
                  (p) => p.competency === competency
                );
                return (
                  <View
                    key={index}
                    className="flex-row items-center p-2 bg-white rounded-lg"
                  >
                    <Text className="text-xl mr-2">{comp?.emoji}</Text>
                    <Text className="text-sm font-medium text-gray-800">
                      {comp?.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Areas to Explore */}
        {insights.areasToExplore.length > 0 && (
          <View className="mb-6 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
            <Text className="text-sm font-semibold text-purple-900 mb-3">
              🔍 Skills to Explore:
            </Text>
            <View className="gap-2">
              {insights.areasToExplore.map((competency, index) => {
                const comp = insights.progressByCompetency.find(
                  (p) => p.competency === competency
                );
                return (
                  <View
                    key={index}
                    className="flex-row items-center p-2 bg-white rounded-lg"
                  >
                    <Text className="text-xl mr-2">{comp?.emoji}</Text>
                    <Text className="text-sm font-medium text-gray-800">
                      {comp?.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Emotional Responses */}
        {insights.recentResponses.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              📝 Recent Feelings:
            </Text>
            <View className="gap-2">
              {insights.recentResponses.slice(0, 5).map((response) => (
                <View
                  key={response.id}
                  className="p-3 bg-white rounded-lg border border-gray-200"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1">
                      <Text className="text-2xl mr-2">
                        {emotionEmojis[response.emotionFelt] || "😊"}
                      </Text>
                      <Text className="text-sm font-semibold text-gray-800">
                        {response.emotionFelt.charAt(0).toUpperCase() +
                          response.emotionFelt.slice(1)}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {formatDate(response.createdAt)}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-xs text-gray-600">
                      Intensity: {response.emotionIntensity}/5
                    </Text>
                  </View>
                  {response.reflection && (
                    <Text
                      className="text-xs text-gray-700 mt-2 italic"
                      numberOfLines={2}
                    >
                      "{response.reflection}"
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {insights.totalStoriesRead === 0 && (
          <View className="py-12 items-center">
            <Text className="text-5xl mb-4">📚</Text>
            <Text className="text-gray-700 font-semibold text-center mb-2">
              No Stories Read Yet
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              Start reading SEL stories to see insights about your emotional growth
            </Text>
          </View>
        )}

        {/* Therapist Notes */}
        <View className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            📋 Therapist Notes:
          </Text>
          <Text className="text-xs text-gray-600">
            Share observations with your therapist or counselor
          </Text>
        </View>

        {/* Export Button */}
        {onExportPdf && (
          <TouchableOpacity
            onPress={onExportPdf}
            disabled={isLoading}
            className={cn(
              "py-3 px-6 rounded-xl items-center mb-6",
              isLoading
                ? "bg-gray-300"
                : "bg-blue-500"
            )}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">
              {isLoading ? "Generating PDF..." : "📄 Export as PDF"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
