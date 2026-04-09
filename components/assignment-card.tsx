/**
 * Assignment Card Component
 * Shows story assignment details with completion progress and actions
 */
// @ts-nocheck


import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { format } from "date-fns";

interface AssignmentCardProps {
  id: number;
  storyTitle: string;
  storyTheme: string;
  dueDate?: Date;
  completionCount: number;
  totalStudents: number;
  instructions?: string;
  onViewDetails: () => void;
  onExtendDeadline: () => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  id,
  storyTitle,
  storyTheme,
  dueDate,
  completionCount,
  totalStudents,
  instructions,
  onViewDetails,
  onExtendDeadline,
}) => {
  const completionPercent = Math.round(
    (completionCount / totalStudents) * 100
  );
  const isOverdue = dueDate && dueDate < new Date();
  const dueDateText = dueDate
    ? format(new Date(dueDate), "MMM d, yyyy")
    : "No due date";

  const getThemeColor = (theme: string): string => {
    const colors: Record<string, string> = {
      adventure: "#FF6B6B",
      fantasy: "#9D4EDD",
      mystery: "#3A86FF",
      science: "#00D9FF",
      nature: "#06D6A0",
      history: "#F8C500",
      mythology: "#FF006E",
      comedy: "#FFB703",
      space: "#023E8A",
      animals: "#8ECAE6",
    };
    return colors[theme.toLowerCase()] || "#B0C4DE";
  };

  const themeColor = getThemeColor(storyTheme);
  const statusBadgeColor = isOverdue
    ? "#FF6B6B"
    : completionPercent === 100
      ? "#06D6A0"
      : "#FFD700";

  const statusText = isOverdue
    ? "Overdue"
    : completionPercent === 100
      ? "Complete"
      : "Active";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View
            style={[styles.themeDot, { backgroundColor: themeColor }]}
          />
          <View style={styles.titleContent}>
            <Text style={styles.storyTitle}>{storyTitle}</Text>
            <Text style={styles.storyTheme}>{storyTheme}</Text>
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}
        >
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Due Date */}
        <View style={styles.dueDateRow}>
          <Text style={styles.label}>Due: </Text>
          <Text
            style={[styles.dueDate, isOverdue && styles.overdue]}
          >
            {dueDateText}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Completion Progress</Text>
            <Text style={styles.progressPercent}>
              {completionCount}/{totalStudents} ({completionPercent}%)
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(completionPercent, 100)}%`,
                  backgroundColor: themeColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Instructions Preview */}
        {instructions && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsLabel}>Instructions</Text>
            <Text style={styles.instructionsText} numberOfLines={2}>
              {instructions}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onViewDetails}
          activeOpacity={0.6}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        {dueDate && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={onExtendDeadline}
            activeOpacity={0.6}
          >
            <Text style={styles.secondaryButtonText}>Extend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  titleSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  titleContent: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  storyTheme: {
    fontSize: 12,
    color: "#999",
    textTransform: "capitalize",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    padding: 14,
  },
  dueDateRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  dueDate: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  overdue: {
    color: "#FF6B6B",
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  instructionsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  instructionsLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  instructionsText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#3A86FF",
    borderRadius: 6,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#f5f5f5",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
});
