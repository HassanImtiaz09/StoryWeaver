/**
 * Educator Dashboard Screen
 * Main teacher interface for classroom management and student progress tracking
 */
// @ts-nocheck


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useEducatorStore } from "@/lib/educator-store";
import { ClassroomCard } from "@/components/classroom-card";

export default function EducatorDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    classrooms,
    loadingClassrooms,
    loadClassrooms,
    selectClassroom,
  } = useEducatorStore();

  const getClassroomsQuery = trpc.educator.getMyClassrooms.useQuery();

  useEffect(() => {
    if (getClassroomsQuery.data) {
      loadClassrooms(getClassroomsQuery.data);
    }
  }, [getClassroomsQuery.data, loadClassrooms]);

  const handleRefresh = () => {
    setRefreshing(true);
    getClassroomsQuery.refetch().finally(() => {
      setRefreshing(false);
    });
  };

  const handleCreateClassroom = () => {
    router.push("/create-classroom");
  };

  const handleSelectClassroom = (classroom: any) => {
    selectClassroom(classroom);
    router.push(`/classroom-detail/${classroom.id}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Classrooms Yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first classroom to start managing students and tracking reading progress.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleCreateClassroom}
      >
        <Text style={styles.emptyButtonText}>Create Classroom</Text>
      </TouchableOpacity>
    </View>
  );

  if (loadingClassrooms && !classrooms.length) {
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
        <View>
          <Text style={styles.title}>Educator Dashboard</Text>
          <Text style={styles.subtitle}>
            {classrooms.length} {classrooms.length === 1 ? "classroom" : "classrooms"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateClassroom}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Classrooms List */}
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
        {classrooms.length === 0 ? (
          renderEmptyState()
        ) : (
          <View>
            {classrooms.map((classroom) => (
              <ClassroomCard
                key={classroom.id}
                id={classroom.id}
                name={classroom.name}
                gradeLevel={classroom.gradeLevel}
                studentCount={classroom.studentCount || 0}
                completionPercentage={50} // TODO: Calculate from progress data
                activeStudents={5} // TODO: Calculate from progress data
                averageReadingTime={45} // TODO: Calculate from analytics
                onPress={() => handleSelectClassroom(classroom)}
              />
            ))}
          </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: "#3A86FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#3A86FF",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  bottomPadding: {
    height: 20,
  },
});
