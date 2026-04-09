import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from "react-native";
import { WeeklyReport } from "@/server/_core/analyticsService";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

interface WeeklyDigestCardProps {
  report: WeeklyReport | null;
  isLoading: boolean;
  onShare?: () => void;
}

export function WeeklyDigestCard({
  report,
  isLoading,
  onShare,
}: WeeklyDigestCardProps) {
  const handleShare = async () => {
    if (!report) return;

    try {
      const message = `This week's reading summary:
• ${report.totalReadingTime} minutes of reading
• ${report.storiesRead} stories completed
• ${report.newWords.length} new words learned
• Current streak: Keep it going!

Check out the StoryWeaver app for more details!`;

      await Share.share({
        message,
        title: "Weekly Reading Summary",
      });

      if (onShare) {
        onShare();
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (isLoading || !report) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  const hours = Math.floor(report.totalReadingTime / 60);
  const minutes = report.totalReadingTime % 60;
  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <Animated.View
      style={styles.container}
      entering={FadeInUp.duration(500).delay(200)}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>This Week's Summary</Text>
            <Text style={styles.dateRange}>
              {report.weekStart} to {report.weekEnd}
            </Text>
          </View>
          <Text style={styles.headerEmoji}>📊</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Animated.View
            style={styles.statCard}
            entering={ZoomIn.duration(400).delay(100)}
          >
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{timeString}</Text>
            <Text style={styles.statLabel}>Total Reading</Text>
          </Animated.View>

          <Animated.View
            style={styles.statCard}
            entering={ZoomIn.duration(400).delay(200)}
          >
            <Text style={styles.statEmoji}>📖</Text>
            <Text style={styles.statValue}>{report.storiesRead}</Text>
            <Text style={styles.statLabel}>Stories</Text>
          </Animated.View>

          <Animated.View
            style={styles.statCard}
            entering={ZoomIn.duration(400).delay(300)}
          >
            <Text style={styles.statEmoji}>📚</Text>
            <Text style={styles.statValue}>{report.newWords.length}</Text>
            <Text style={styles.statLabel}>New Words</Text>
          </Animated.View>

          <Animated.View
            style={styles.statCard}
            entering={ZoomIn.duration(400).delay(400)}
          >
            <Text style={styles.statEmoji}>🎯</Text>
            // @ts-expect-error - overload mismatch
            <Text style={styles.statValue}>{typeof report.bestDay === 'object' ? report.bestDay.day : String(report.bestDay)}</Text>
            <Text style={styles.statLabel}>Best Day</Text>
          </Animated.View>
        </View>

        {/* Highlights Section */}
        <View style={styles.highlightsSection}>
          <Text style={styles.sectionTitle}>Highlights</Text>

          {report.mostReadTheme && (
            <View style={styles.highlightItem}>
              <Text style={styles.highlightEmoji}>🎨</Text>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>Favorite Theme</Text>
                <Text style={styles.highlightValue}>
                  {report.mostReadTheme}
                </Text>
              </View>
            </View>
          )}

          {report.newWords.length > 0 && (
            <View style={styles.highlightItem}>
              <Text style={styles.highlightEmoji}>✨</Text>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>New Vocabulary</Text>
                <Text style={styles.highlightValue}>
                  {report.newWords.slice(0, 3).join(", ")}
                  {report.newWords.length > 3 ? "..." : ""}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Suggestion for Next Week</Text>
            <Text style={styles.recommendationText}>
              💡 {report.recommendations[0]}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            accessible={true}
            accessibilityLabel="Share weekly summary"
          >
            <Text style={styles.shareButtonText}>Share with Family</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  card: {
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
    height: 320,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 11,
    color: "#808080",
  },
  headerEmoji: {
    fontSize: 32,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#808080",
    textAlign: "center",
  },
  highlightsSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 10,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 10,
  },
  highlightEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  highlightText: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 11,
    color: "#808080",
    fontWeight: "500",
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  recommendationsSection: {
    backgroundColor: "#FFF8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#FFB703",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  recommendationText: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: "#9D4EDD",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
