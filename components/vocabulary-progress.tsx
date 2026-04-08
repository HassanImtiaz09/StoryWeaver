import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { VocabularyGrowthData } from "@/server/_core/analyticsService";
import Animated, { FadeInRight } from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface VocabularyProgressProps {
  data: VocabularyGrowthData[];
  isLoading: boolean;
}

export function VocabularyProgress({
  data,
  isLoading,
}: VocabularyProgressProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContent} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No vocabulary data yet</Text>
          <Text style={styles.emptySubtext}>
            New words will appear here as your child reads!
          </Text>
        </View>
      </View>
    );
  }

  const latestData = data[data.length - 1];
  const thisWeekNew =
    data.length > 7
      ? latestData.totalWords -
        (data[Math.max(0, data.length - 7)].totalWords || 0)
      : latestData.totalWords;

  const totalWords = latestData.totalWords;
  const newWordsThisSession = latestData.wordsLearned;

  // Get complexity trend
  const complexityTrend =
    data.length > 1
      ? data[data.length - 1].complexity - data[0].complexity
      : 0;

  const complexityLabels = [
    "Very Basic",
    "Basic",
    "Intermediate",
    "Advanced",
    "Expert",
  ];

  return (
    <Animated.View style={styles.container} entering={FadeInRight.duration(500)}>
      <View style={styles.header}>
        <Text style={styles.title}>Vocabulary Growth</Text>
        <Text style={styles.subtitle}>Language Development</Text>
      </View>

      {/* Main Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainValue}>{totalWords}</Text>
          <Text style={styles.mainLabel}>Total Words</Text>
        </View>

        <View style={styles.statSeparator} />

        <View style={styles.secondaryStat}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{thisWeekNew}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {latestData.complexity}/5
            </Text>
            <Text style={styles.statLabel}>Complexity</Text>
          </View>
        </View>
      </View>

      {/* Growth Chart - Simple Line */}
      <View style={styles.chartSection}>
        <Text style={styles.chartLabel}>Growth Over Time</Text>
        <View style={styles.chart}>
          {data.map((point, idx) => {
            const maxWords = Math.max(...data.map((d) => d.totalWords));
            const height = (point.totalWords / maxWords) * 100;
            const isLast = idx === data.length - 1;

            return (
              <View
                key={point.date}
                style={[
                  styles.chartPoint,
                  {
                    height: `${Math.max(height, 10)}%`,
                    backgroundColor: isLast ? "#9D4EDD" : "#06D6A0",
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Complexity Level Indicator */}
      <View style={styles.complexitySection}>
        <Text style={styles.sectionTitle}>Current Level</Text>
        <View style={styles.complexityBar}>
          {[1, 2, 3, 4, 5].map((level) => (
            <View
              key={level}
              style={[
                styles.complexityStep,
                {
                  backgroundColor:
                    level <= latestData.complexity
                      ? "#9D4EDD"
                      : "#E0E0E0",
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.complexityLabel}>
          {
            complexityLabels[Math.min(latestData.complexity - 1, 4)]
          }
        </Text>
      </View>

      {/* Trend Indicator */}
      <View style={styles.trendSection}>
        <View style={styles.trendItem}>
          <Text style={styles.trendLabel}>Complexity Trend</Text>
          <View style={styles.trendValue}>
            <Text style={styles.trendEmoji}>
              {complexityTrend > 0 ? "📈" : complexityTrend < 0 ? "📉" : "→"}
            </Text>
            <Text style={styles.trendText}>
              {complexityTrend > 0
                ? "Increasing difficulty"
                : complexityTrend < 0
                  ? "Decreasing difficulty"
                  : "Stable"}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Words */}
      {newWordsThisSession > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Learning Session</Text>
          <Text style={styles.recentSubtext}>
            {newWordsThisSession} new word{
              newWordsThisSession !== 1 ? "s" : ""
            }{" "}
            encountered
          </Text>
          <View style={styles.recentBadge}>
            <Text style={styles.recentBadgeText}>
              +{newWordsThisSession} new
            </Text>
          </View>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>Learning Tips</Text>
        <Text style={styles.tipsText}>
          Encourage your child to review new words daily. Repetition helps
          build long-term vocabulary retention and understanding.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  skeletonContent: {
    backgroundColor: "#F0F0F0",
    height: 300,
    borderRadius: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#808080",
  },
  statsContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  mainStat: {
    flex: 1,
    alignItems: "center",
  },
  mainValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  mainLabel: {
    fontSize: 12,
    color: "#808080",
    fontWeight: "500",
  },
  statSeparator: {
    width: 1,
    height: 60,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  secondaryStat: {
    flex: 1,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#808080",
  },
  chartSection: {
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  chart: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  chartPoint: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  complexitySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  complexityBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  complexityStep: {
    flex: 1,
    height: 12,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  complexityLabel: {
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
  },
  trendSection: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  trendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendLabel: {
    fontSize: 12,
    color: "#808080",
    fontWeight: "500",
  },
  trendValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  recentSection: {
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  recentSubtext: {
    fontSize: 12,
    color: "#808080",
    marginBottom: 8,
  },
  recentBadge: {
    backgroundColor: "#06D6A0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  recentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tipsSection: {
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FFB703",
  },
  tipsText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
  emptyState: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
  },
});
