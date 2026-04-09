/**
 * Class Analytics Summary Component
 * Displays class-wide analytics and performance metrics
 */
// @ts-nocheck


import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ClassAnalyticsSummaryProps {
  totalReadingTime: number;
  averageReadingTime: number;
  studentsEngaged: number;
  totalStudents: number;
  readingLevelDistribution: Record<string, number>;
  mostPopularTheme: string | null;
  studentsNeedingAttention: any[];
  topPerformers: any[];
}

export const ClassAnalyticsSummary: React.FC<ClassAnalyticsSummaryProps> = ({
  totalReadingTime,
  averageReadingTime,
  studentsEngaged,
  totalStudents,
  readingLevelDistribution,
  mostPopularTheme,
  studentsNeedingAttention,
  topPerformers,
}) => {
  const colors = useColors();
  const chartWidth = Dimensions.get("window").width - 32;
  const engagementRate = totalStudents > 0 ? Math.round((studentsEngaged / totalStudents) * 100) : 0;

  // Prepare reading level data for pie chart
  const levelLabels = Object.keys(readingLevelDistribution);
  const levelData = {
    labels: levelLabels.length > 0 ? levelLabels : ["No Data"],
    datasets: [
      {
        data:
          levelLabels.length > 0
            ? levelLabels.map((level) => readingLevelDistribution[level] || 0)
            : [0],
      },
    ],
  };

  // Colors for pie chart
  const levelColors = [
    "#FFB6C1",
    "#87CEEB",
    "#90EE90",
    "#FFD700",
    "#FFA500",
    "#DDA0DD",
    "#FF6347",
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overview Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalReadingTime}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{averageReadingTime}</Text>
          <Text style={styles.statLabel}>Avg per Student</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{engagementRate}%</Text>
          <Text style={styles.statLabel}>Engagement Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{studentsEngaged}</Text>
          <Text style={styles.statLabel}>Active Students</Text>
        </View>
      </View>

      {/* Reading Level Distribution */}
      {levelLabels.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Reading Level Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={levelData}
              width={chartWidth}
              height={200}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="data"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
            />
          </View>
          <View style={styles.legendContainer}>
            {levelLabels.map((level, idx) => (
              <View key={level} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: levelColors[idx] },
                  ]}
                />
                <Text style={styles.legendLabel}>
                  {level} ({readingLevelDistribution[level]})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Most Popular Theme */}
      {mostPopularTheme && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Most Popular Theme</Text>
          <View style={styles.themeCard}>
            <Text style={styles.themeText}>
              {mostPopularTheme.charAt(0).toUpperCase() +
                mostPopularTheme.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Students Needing Attention */}
      {studentsNeedingAttention.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          {studentsNeedingAttention.map((student) => (
            <View key={student.childId} style={styles.studentItem}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentDetail}>
                  {student.weeklyActivityCount} activities this week
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>⚠️</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {topPerformers.map((student, idx) => (
            <View key={student.childId} style={styles.studentItem}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>
                  {idx + 1}. {student.name}
                </Text>
                <Text style={styles.studentDetail}>
                  {student.completionPercentage}% Complete
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>⭐</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3A86FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    textAlign: "center",
  },
  chartSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  legendContainer: {
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: "#666",
  },
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  themeCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  themeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A86FF",
    textTransform: "capitalize",
  },
  studentItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  studentDetail: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
  },
  bottomPadding: {
    height: 20,
  },
});
