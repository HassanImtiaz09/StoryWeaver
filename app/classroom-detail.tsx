/**
 * Classroom Detail Screen
 * Shows student progress, assignments, and analytics for a specific classroom
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TabBar,
  Tab,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useEducatorStore } from "@/lib/educator-store";
import { StudentProgressRow } from "@/components/student-progress-row";
import { AssignmentCard } from "@/components/assignment-card";
import { ClassAnalyticsSummary } from "@/components/class-analytics-summary";

export default function ClassroomDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { classroomId } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("students");

  const id = typeof classroomId === "string" ? parseInt(classroomId) : 0;

  const {
    selectedClassroom,
    students,
    assignments,
    classAnalytics,
    loadStudents,
    loadAssignments,
    loadAnalytics,
  } = useEducatorStore();

  const classProgressQuery = trpc.educator.getClassProgress.useQuery({
    classroomId: id,
  });

  const assignmentsQuery = trpc.educator.getClassroomAssignments.useQuery({
    classroomId: id,
  });

  const analyticsQuery = trpc.educator.getClassAnalytics.useQuery({
    classroomId: id,
    period: "month",
  });

  useEffect(() => {
    if (classProgressQuery.data) {
      loadStudents(classProgressQuery.data);
    }
  }, [classProgressQuery.data, loadStudents]);

  useEffect(() => {
    if (assignmentsQuery.data) {
      loadAssignments(assignmentsQuery.data);
    }
  }, [assignmentsQuery.data, loadAssignments]);

  useEffect(() => {
    if (analyticsQuery.data) {
      loadAnalytics(analyticsQuery.data);
    }
  }, [analyticsQuery.data, loadAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      classProgressQuery.refetch(),
      assignmentsQuery.refetch(),
      analyticsQuery.refetch(),
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const handleAssignStory = () => {
    router.push({
      pathname: "/assign-story",
      params: { classroomId: id },
    });
  };

  const handleGenerateAssessment = () => {
    router.push({
      pathname: "/generate-assessment",
      params: { classroomId: id },
    });
  };

  const handleExportReport = async () => {
    // TODO: Implement report export
  };

  const isLoading =
    classProgressQuery.isLoading ||
    assignmentsQuery.isLoading ||
    analyticsQuery.isLoading;

  if (isLoading && !students.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3A86FF" />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{selectedClassroom?.name || "Classroom"}</Text>
          <Text style={styles.subtitle}>
            Grade {selectedClassroom?.gradeLevel}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            // TODO: Implement menu
          }}
        >
          <Text style={styles.menuText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAssignStory}
        >
          <Text style={styles.actionButtonLabel}>Assign Story</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleGenerateAssessment}
        >
          <Text style={styles.actionButtonLabelSecondary}>Assessment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={handleExportReport}
        >
          <Text style={styles.actionButtonLabelSecondary}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {["students", "assignments", "analytics"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3A86FF"
          />
        }
      >
        {activeTab === "students" && (
          <View>
            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No students yet</Text>
              </View>
            ) : (
              students.map((student) => (
                <StudentProgressRow
                  key={student.childId}
                  id={student.childId}
                  name={student.name}
                  readingLevel={student.readingLevel}
                  storiesCompleted={student.storiesCompleted}
                  storiesAssigned={student.storiesAssigned}
                  currentStreak={student.currentStreak}
                  lastActive={student.lastActive}
                  completionPercentage={student.completionPercentage}
                  onPress={() => {
                    router.push({
                      pathname: "/student-detail",
                      params: { studentId: student.childId, classroomId: id },
                    });
                  }}
                />
              ))
            )}
          </View>
        )}

        {activeTab === "assignments" && (
          <View>
            {assignments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No assignments yet</Text>
              </View>
            ) : (
              assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  id={assignment.id}
                  storyTitle="Story Title" // TODO: Fetch from arc
                  storyTheme="adventure" // TODO: Fetch from arc
                  dueDate={assignment.dueDate}
                  completionCount={0} // TODO: Calculate
                  totalStudents={students.length}
                  instructions={assignment.instructions}
                  onViewDetails={() => {
                    router.push({
                      pathname: "/assignment-detail",
                      params: { assignmentId: assignment.id },
                    });
                  }}
                  onExtendDeadline={() => {
                    // TODO: Implement deadline extension
                  }}
                />
              ))
            )}
          </View>
        )}

        {activeTab === "analytics" && classAnalytics && (
          <ClassAnalyticsSummary {...classAnalytics} />
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A86FF",
  },
  titleSection: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  subtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuText: {
    fontSize: 20,
    color: "#666",
  },
  actionsBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#3A86FF",
    borderRadius: 6,
    alignItems: "center",
  },
  actionButtonSecondary: {
    backgroundColor: "#f0f0f0",
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  actionButtonLabelSecondary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  tabActive: {
    borderBottomColor: "#3A86FF",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  tabLabelActive: {
    color: "#3A86FF",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  bottomPadding: {
    height: 20,
  },
});
