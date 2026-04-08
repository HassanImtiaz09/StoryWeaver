/**
 * Student Progress Row Component
 * Displays individual student progress with reading level and activity metrics
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

interface StudentProgressRowProps {
  id: number;
  name: string;
  readingLevel: string;
  storiesCompleted: number;
  storiesAssigned: number;
  currentStreak: number;
  lastActive?: Date;
  completionPercentage: number;
  onPress: () => void;
}

export const StudentProgressRow: React.FC<StudentProgressRowProps> = ({
  id,
  name,
  readingLevel,
  storiesCompleted,
  storiesAssigned,
  currentStreak,
  lastActive,
  completionPercentage,
  onPress,
}) => {
  const getReadingLevelColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      K: "#FFB6C1",
      "1st": "#87CEEB",
      "2nd": "#90EE90",
      "3rd": "#FFD700",
      "4th": "#FFA500",
      "5th": "#DDA0DD",
      "6th": "#FF6347",
      "Advanced": "#FFD700",
      "Developing": "#87CEEB",
      "Beginning": "#FFB6C1",
    };

    return colorMap[level] || "#B0C4DE";
  };

  const getLastActiveText = (date?: Date): string => {
    if (!date) return "No activity";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) return "Active now";
    if (diffMins < 1440) return "Today";
    if (diffMins < 10080) return `${Math.round(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const levelColor = getReadingLevelColor(readingLevel);
  const progressPercent = Math.round(completionPercentage);
  const streakDisplay = currentStreak > 0 ? `🔥 ${currentStreak}d` : "-";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.container}
    >
      <View style={styles.contentRow}>
        {/* Student Avatar */}
        <View style={[styles.avatar, { backgroundColor: levelColor }]}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Student Info */}
        <View style={styles.infoSection}>
          <Text style={styles.studentName}>{name}</Text>
          <View style={styles.levelAndProgress}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelText}>{readingLevel}</Text>
            </View>
            <View style={styles.completionBadge}>
              <Text style={styles.completionText}>
                {progressPercent}%
              </Text>
            </View>
          </View>
        </View>

        {/* Stories Progress */}
        <View style={styles.storiesSection}>
          <Text style={styles.storiesNumber}>
            {storiesCompleted}/{storiesAssigned}
          </Text>
          <Text style={styles.storiesLabel}>Stories</Text>
        </View>

        {/* Streak */}
        <View style={styles.streakSection}>
          <Text style={styles.streakText}>{streakDisplay}</Text>
        </View>

        {/* Last Active */}
        <View style={styles.activeSection}>
          <Text style={styles.activeText}>{getLastActiveText(lastActive)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: levelColor,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  infoSection: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  levelAndProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  completionBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  completionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  storiesSection: {
    alignItems: "center",
    marginRight: 12,
  },
  storiesNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  storiesLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  streakSection: {
    alignItems: "center",
    minWidth: 40,
    marginRight: 8,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B6B",
  },
  activeSection: {
    alignItems: "flex-end",
    minWidth: 50,
  },
  activeText: {
    fontSize: 11,
    color: "#999",
  },
  progressBarContainer: {
    marginLeft: 52, // Account for avatar + margin
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
