import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAnalyticsStore } from "@/lib/analytics-store";
import { trpc } from "@/lib/trpc";
import { ReadingStatsCard } from "@/components/reading-stats-card";
import { ReadingTimeChart } from "@/components/reading-time-chart";
import { ThemePieChart } from "@/components/theme-pie-chart";
import { ReadingHeatmap } from "@/components/reading-heatmap";
import { VocabularyProgress } from "@/components/vocabulary-progress";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { WeeklyDigestCard } from "@/components/weekly-digest-card";
import Animated, { FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
  const analyticsStore = useAnalyticsStore();
  const [refreshing, setRefreshing] = useState(false);

  // Get current user and children
  // @ts-expect-error - type mismatch from schema
  const { data: userChildren } = trpc.children.getChildren.useQuery();

  // Select first child if none selected
  useEffect(() => {
    if (analyticsStore.selectedChild === null && userChildren && userChildren.length > 0) {
      analyticsStore.setSelectedChild(userChildren[0].id);
    }
  }, [userChildren]);

  // Load analytics when selected child changes
  useEffect(() => {
    if (analyticsStore.selectedChild !== null) {
      const loadData = async () => {
        await analyticsStore.loadAnalytics(
          analyticsStore.selectedChild!,
          0 // userId would come from auth context in real app
        );
      };
      loadData();
    }
  }, [analyticsStore.selectedChild, analyticsStore.selectedPeriod]);

  const handleRefresh = async () => {
    if (analyticsStore.selectedChild === null) return;

    setRefreshing(true);
    try {
      await analyticsStore.refreshData(
        analyticsStore.selectedChild,
        0 // userId
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!analyticsStore.selectedChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No children profiles found</Text>
          <Text style={styles.emptySubtext}>
            Create a child profile to view analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedChildName =
    userChildren?.find((c: any) => c.id === analyticsStore.selectedChild)?.name ||
    "My Child";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Period Selector */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{selectedChildName}</Text>
          <Text style={styles.headerSubtitle}>Reading Analytics</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(["week", "month", "all"] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              analyticsStore.selectedPeriod === period &&
                styles.periodButtonActive,
            ]}
            onPress={() => analyticsStore.setPeriod(period)}
            accessible={true}
            accessibilityLabel={`View ${period === "week" ? "weekly" : period === "month" ? "monthly" : "all-time"} analytics`}
          >
            <Text
              style={[
                styles.periodButtonText,
                analyticsStore.selectedPeriod === period &&
                  styles.periodButtonTextActive,
              ]}
            >
              {period === "week"
                ? "This Week"
                : period === "month"
                  ? "This Month"
                  : "All Time"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#9D4EDD"]}
            tintColor="#9D4EDD"
          />
        }
      >
        {analyticsStore.isLoading && !analyticsStore.summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9D4EDD" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Reading Stats Card */}
            <ReadingStatsCard
              summary={analyticsStore.summary}
              isLoading={analyticsStore.isLoading}
            />

            {/* Reading Time Chart */}
            <ReadingTimeChart
              data={analyticsStore.trends}
              isLoading={analyticsStore.isLoading}
            />

            {/* Reading Heatmap */}
            <ReadingHeatmap
              data={analyticsStore.heatmap}
              isLoading={analyticsStore.isLoading}
            />

            {/* Theme Pie Chart */}
            <ThemePieChart
              data={analyticsStore.themeBreakdown}
              isLoading={analyticsStore.isLoading}
            />

            {/* Vocabulary Progress */}
            <VocabularyProgress
              data={analyticsStore.vocabularyGrowth}
              isLoading={analyticsStore.isLoading}
            />

            {/* Milestone Timeline */}
            <MilestoneTimeline
              milestones={analyticsStore.milestones}
              isLoading={analyticsStore.isLoading}
            />

            {/* Weekly Digest */}
            <WeeklyDigestCard
              report={analyticsStore.weeklyReport}
              isLoading={analyticsStore.isLoading}
              onShare={() => {
                // Haptic feedback would go here
              }}
            />

            {/* Error Message */}
            {analyticsStore.error && (
              <Animated.View
                style={styles.errorContainer}
                entering={FadeIn.duration(300)}
              >
                <Text style={styles.errorText}>{analyticsStore.error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefresh}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>

      {/* Child Selector (if multiple children) */}
      {userChildren && userChildren.length > 1 && (
        <View style={styles.childSelector}>
          <Text style={styles.childSelectorLabel}>View:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childSelectorContent}
          >
            {userChildren.map((child: any) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childButton,
                  analyticsStore.selectedChild === child.id &&
                    styles.childButtonActive,
                ]}
                onPress={() => analyticsStore.setSelectedChild(child.id)}
                accessible={true}
                accessibilityLabel={`View ${child.name}'s analytics`}
              >
                <Text
                  style={[
                    styles.childButtonText,
                    analyticsStore.selectedChild === child.id &&
                      styles.childButtonTextActive,
                  ]}
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#808080",
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#9D4EDD",
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#808080",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#808080",
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#FFF3F3",
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B6B",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#C41E3A",
    marginBottom: 8,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomSpacing: {
    height: 40,
  },
  childSelector: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  childSelectorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#808080",
    marginBottom: 8,
  },
  childSelectorContent: {
    paddingRight: 16,
  },
  childButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#F8F8F8",
    marginRight: 8,
  },
  childButtonActive: {
    backgroundColor: "#9D4EDD",
  },
  childButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#808080",
  },
  childButtonTextActive: {
    color: "#FFFFFF",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#808080",
    textAlign: "center",
  },
});
