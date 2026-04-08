import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import { ReadingSummary } from "@/server/_core/analyticsService";
import Animated, {
  FadeInDown,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface ReadingStatsCardProps {
  summary: ReadingSummary | null;
  isLoading: boolean;
}

export function ReadingStatsCard({ summary, isLoading }: ReadingStatsCardProps) {
  if (isLoading || !summary) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  const hours = Math.floor(summary.totalReadingTime / 60);
  const minutes = summary.totalReadingTime % 60;
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const engagementLevel =
    summary.engagementScore > 75
      ? "Excellent"
      : summary.engagementScore > 50
        ? "Good"
        : summary.engagementScore > 25
          ? "Fair"
          : "Getting Started";

  const engagementColor =
    summary.engagementScore > 75
      ? "#06D6A0"
      : summary.engagementScore > 50
        ? "#FFB703"
        : summary.engagementScore > 25
          ? "#FF006E"
          : "#808080";

  return (
    <Animated.View
      style={styles.container}
      entering={FadeInDown.duration(500)}
      accessible={true}
      accessibilityLabel={`Reading stats: ${timeString} total reading time, ${summary.storiesCompleted} stories completed`}
    >
      <View style={styles.mainCard}>
        {/* Top Section - Reading Time */}
        <View style={styles.topSection}>
          <View style={styles.timeBlock}>
            <Text style={styles.label}>Total Reading Time</Text>
            <Text style={styles.largeValue}>{timeString}</Text>
            <Text style={styles.sublabel}>this {summary.periodLabel.split(" ")[1]}</Text>
          </View>

          {/* Engagement Score Circle */}
          <View style={styles.engagementCircle}>
            <View
              style={[
                styles.circle,
                { borderColor: engagementColor },
              ]}
            >
              <Text style={[styles.circleText, { color: engagementColor }]}>
                {summary.engagementScore}
              </Text>
              <Text style={styles.circleLabel}>Score</Text>
            </View>
            <Text style={[styles.engagementLevel, { color: engagementColor }]}>
              {engagementLevel}
            </Text>
          </View>
        </View>

        {/* Middle Section - Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.storiesCompleted}</Text>
            <Text style={styles.metricLabel}>Stories</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.pagesRead}</Text>
            <Text style={styles.metricLabel}>Pages</Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.currentStreak}</Text>
            <Text style={styles.metricLabel}>
              Streak {summary.currentStreak > 0 ? "🔥" : ""}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{summary.averageSessionDuration}</Text>
            <Text style={styles.metricLabel}>Avg Min</Text>
          </View>
        </View>

        {/* Bottom Section - Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Favorite Theme</Text>
            <Text style={styles.detailValue}>
              {summary.favoriteTheme || "Exploring..."}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Best Streak</Text>
            <Text style={styles.detailValue}>{summary.longestStreak} days</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reading Level</Text>
            <Text style={styles.detailValue}>
              {summary.readingLevelProgress.current || "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonCard: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    height: 280,
    elevation: 2,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timeBlock: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#808080",
    fontWeight: "500",
    marginBottom: 4,
  },
  largeValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: "#B0B0B0",
  },
  engagementCircle: {
    alignItems: "center",
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  circleText: {
    fontSize: 28,
    fontWeight: "700",
  },
  circleLabel: {
    fontSize: 10,
    color: "#808080",
    marginTop: 2,
  },
  engagementLevel: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "#808080",
    textAlign: "center",
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: "#808080",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#1F1F1F",
    fontWeight: "600",
  },
});
