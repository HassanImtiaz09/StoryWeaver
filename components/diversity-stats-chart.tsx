import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { BarChart3, PieChart, TrendingUp } from "lucide-react-native";
import { useColors } from "@/hooks/use-colors";
import type { RepresentationStats } from "@/server/_core/diversityService";

interface DiversityStatsChartProps {
  stats: RepresentationStats | null;
}

const StatBarChart = ({
  label,
  data,
  colors,
}: {
  label: string;
  data: Record<string, number>;
  colors: any;
}) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map((e) => e[1]), 1);

  return (
    <View className="mb-6">
      <Text
        className="text-sm font-semibold text-gray-900 mb-3"
        style={{ color: colors.text }}
      >
        {label}
      </Text>
      <View className="gap-3">
        {entries.slice(0, 5).map(([name, value]) => (
          <View key={name}>
            <View className="flex-row justify-between items-center mb-1">
              <Text
                className="text-xs font-medium text-gray-700"
                style={{ color: colors.text }}
              >
                {name}
              </Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.primary }}
              >
                {value}
              </Text>
            </View>
            <View
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.border }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${(value / maxValue) * 100}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          </View>
        ))}
        {entries.length === 0 && (
          <Text
            className="text-xs text-gray-500 italic"
            style={{ color: colors.textSecondary }}
          >
            No data yet
          </Text>
        )}
      </View>
    </View>
  );
};

export default function DiversityStatsChart({
  stats,
}: DiversityStatsChartProps) {
  const colors = useColors();

  const representationScore = useMemo(() => {
    if (!stats) return 0;
    const categories = [
      Object.keys(stats.ethnicityDistribution).length,
      Object.keys(stats.familyStructureDistribution).length,
      Object.keys(stats.abilitiesIncluded).length,
      Object.keys(stats.culturalsRepresented).length,
    ];
    const avgCategories = categories.reduce((a, b) => a + b, 0) / 4;
    return Math.round(avgCategories * 20);
  }, [stats]);

  const hasData = stats && stats.totalStories > 0;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Header */}
        <View>
          <Text
            className="text-lg font-bold text-gray-900"
            style={{ color: colors.text }}
          >
            Representation Dashboard
          </Text>
          <Text
            className="text-xs text-gray-600 mt-1"
            style={{ color: colors.textSecondary }}
          >
            How diverse are your stories?
          </Text>
        </View>

        {hasData ? (
          <>
            {/* Representation Score Card */}
            <View
              className="p-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${colors.success}15` }}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <TrendingUp size={20} color={colors.success} />
                <Text
                  className="font-semibold text-gray-700"
                  style={{ color: colors.text }}
                >
                  Representation Score
                </Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text
                  className="text-5xl font-bold"
                  style={{ color: colors.success }}
                >
                  {representationScore}
                </Text>
                <Text
                  className="text-lg text-gray-600"
                  style={{ color: colors.textSecondary }}
                >
                  / 100
                </Text>
              </View>
              <Text
                className="text-xs text-gray-600 mt-2 text-center"
                style={{ color: colors.textSecondary }}
              >
                Based on diversity of {stats?.totalStories} stories
              </Text>
            </View>

            {/* Total Stories */}
            <View
              className="p-4 rounded-xl flex-row items-center gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View
                className="w-12 h-12 rounded-lg items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <BarChart3 size={24} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs text-gray-600"
                  style={{ color: colors.textSecondary }}
                >
                  Total Stories Generated
                </Text>
                <Text
                  className="text-2xl font-bold text-gray-900"
                  style={{ color: colors.text }}
                >
                  {stats?.totalStories}
                </Text>
              </View>
            </View>

            {/* Ethnicity Distribution */}
            {Object.keys(stats?.ethnicityDistribution || {}).length > 0 && (
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <StatBarChart
                  label="Character Ethnicities"
                  data={stats?.ethnicityDistribution || {}}
                  colors={colors}
                />
              </View>
            )}

            {/* Family Structure Distribution */}
            {Object.keys(stats?.familyStructureDistribution || {}).length > 0 && (
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <StatBarChart
                  label="Family Structure Representation"
                  data={stats?.familyStructureDistribution || {}}
                  colors={colors}
                />
              </View>
            )}

            {/* Abilities Included */}
            {Object.keys(stats?.abilitiesIncluded || {}).length > 0 && (
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <StatBarChart
                  label="Abilities & Accessibility"
                  data={stats?.abilitiesIncluded || {}}
                  colors={colors}
                />
              </View>
            )}

            {/* Cultural Representation */}
            {Object.keys(stats?.culturalsRepresented || {}).length > 0 && (
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <StatBarChart
                  label="Cultural Representation"
                  data={stats?.culturalsRepresented || {}}
                  colors={colors}
                />
              </View>
            )}
          </>
        ) : (
          <View
            className="p-6 rounded-xl items-center justify-center gap-3"
            style={{ backgroundColor: colors.surface }}
          >
            <PieChart size={32} color={colors.textSecondary} />
            <View className="items-center">
              <Text
                className="font-semibold text-gray-900"
                style={{ color: colors.text }}
              >
                No Stories Yet
              </Text>
              <Text
                className="text-xs text-gray-600 mt-1 text-center"
                style={{ color: colors.textSecondary }}
              >
                Generate some stories to see your representation statistics
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
