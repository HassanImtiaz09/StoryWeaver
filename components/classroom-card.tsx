/**
 * Classroom Card Component
 * Displays a single classroom with progress overview and quick stats
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ClassroomCardProps {
  id: number;
  name: string;
  gradeLevel: string;
  studentCount: number;
  completionPercentage?: number;
  activeStudents?: number;
  averageReadingTime?: number;
  onPress: () => void;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  id,
  name,
  gradeLevel,
  studentCount,
  completionPercentage = 0,
  activeStudents = 0,
  averageReadingTime = 0,
  onPress,
}) => {
  const getGradeColor = (grade: string): [string, string] => {
    const colorMap: Record<string, [string, string]> = {
      K: ["#FFB6C1", "#FFC0CB"],
      "1st": ["#87CEEB", "#ADD8E6"],
      "2nd": ["#90EE90", "#98FB98"],
      "3rd": ["#FFD700", "#FFEB3B"],
      "4th": ["#FFA500", "#FFB84D"],
      "5th": ["#DDA0DD", "#EE82EE"],
      "6th": ["#FF6347", "#FF7F50"],
    };

    return colorMap[grade] || ["#B0C4DE", "#D3D3D3"];
  };

  const [startColor, endColor] = getGradeColor(gradeLevel);
  const completionPercentDisplay = Math.round(completionPercentage);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={[startColor, endColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.classroomName}>{name}</Text>
            <Text style={styles.gradeLevel}>Grade {gradeLevel}</Text>
          </View>
          <View style={styles.studentBadge}>
            <Text style={styles.studentCount}>{studentCount}</Text>
            <Text style={styles.studentLabel}>
              {studentCount === 1 ? "Student" : "Students"}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(completionPercentDisplay, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {completionPercentDisplay}% Stories Completed
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeStudents}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{averageReadingTime}</Text>
            <Text style={styles.statLabel}>Avg. Minutes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐</Text>
            <Text style={styles.statLabel}>Trending</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  classroomName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  gradeLevel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  studentBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  studentCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  studentLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.75)",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
  },
});
