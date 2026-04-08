import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { Milestone } from "@/server/_core/analyticsService";
import Animated, { FadeInLeft } from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface MilestoneTimelineProps {
  milestones: Milestone[];
  isLoading: boolean;
}

export function MilestoneTimeline({
  milestones,
  isLoading,
}: MilestoneTimelineProps) {
  const achievedMilestones = milestones.filter((m) => m.achievedDate);
  const progressMilestones = milestones.filter((m) => !m.achievedDate);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonTimeline} />
      </View>
    );
  }

  if (milestones.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No milestones yet</Text>
          <Text style={styles.emptySubtext}>
            Start reading to unlock achievements!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={styles.container} entering={FadeInLeft.duration(500)}>
      <View style={styles.header}>
        <Text style={styles.title}>Milestones & Achievements</Text>
        <Text style={styles.subtitle}>
          {achievedMilestones.length} of {milestones.length} unlocked
        </Text>
      </View>

      <ScrollView
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Achieved Milestones */}
        {achievedMilestones.map((milestone, idx) => (
          <View key={milestone.id} style={styles.timelineItem}>
            {/* Timeline dot and line */}
            <View style={styles.timelineDotContainer}>
              <View style={[styles.dot, styles.dotAchieved]}>
                <Text style={styles.dotIcon}>{milestone.icon}</Text>
              </View>
              {idx < achievedMilestones.length - 1 && (
                <View style={[styles.line, styles.lineAchieved]} />
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.contentHeader}>
                <Text style={styles.title}>{milestone.title}</Text>
                <Text style={styles.date}>
                  {milestone.achievedDate
                    ? new Date(milestone.achievedDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )
                    : ""}
                </Text>
              </View>
              <Text style={styles.description}>{milestone.description}</Text>
              <View style={[styles.badge, styles.badgeAchieved]}>
                <Text style={styles.badgeText}>🎉 Unlocked</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Progress Divider */}
        {progressMilestones.length > 0 && (
          <View style={styles.progressDivider}>
            <Text style={styles.progressDividerText}>In Progress</Text>
          </View>
        )}

        {/* Progress Milestones */}
        {progressMilestones.map((milestone) => (
          <View key={milestone.id} style={styles.timelineItem}>
            {/* Timeline dot and line */}
            <View style={styles.timelineDotContainer}>
              <View style={[styles.dot, styles.dotProgress]}>
                <Text style={styles.dotIcon}>{milestone.icon}</Text>
              </View>
              <View style={[styles.line, styles.lineProgress]} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.contentHeader}>
                <Text style={[styles.title, styles.titleProgress]}>
                  {milestone.title}
                </Text>
              </View>
              <Text style={styles.description}>{milestone.description}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${milestone.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(milestone.progress)}% Complete
              </Text>
            </View>
          </View>
        ))}

        {/* Final spacing */}
        <View style={styles.timelineEnd} />
      </ScrollView>

      {/* Category Filter Hint */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {achievedMilestones.length === milestones.length
            ? "🎊 All milestones unlocked!"
            : `Keep reading to unlock ${progressMilestones.length} more achievement${
                progressMilestones.length !== 1 ? "s" : ""
              }!`}
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: "hidden",
  },
  skeletonTimeline: {
    backgroundColor: "#F0F0F0",
    height: 400,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  subtitle: {
    fontSize: 12,
    color: "#808080",
    marginTop: 4,
  },
  timeline: {
    maxHeight: 400,
  },
  timelineItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timelineDotContainer: {
    alignItems: "center",
    marginRight: 16,
    position: "relative",
  },
  dot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dotAchieved: {
    backgroundColor: "#06D6A0",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  dotProgress: {
    backgroundColor: "#E0E0E0",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  dotIcon: {
    fontSize: 24,
  },
  line: {
    width: 2,
    height: 80,
    position: "absolute",
    top: 50,
    left: "50%",
    marginLeft: -1,
  },
  lineAchieved: {
    backgroundColor: "#06D6A0",
  },
  lineProgress: {
    backgroundColor: "#E0E0E0",
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleProgress: {
    color: "#B0B0B0",
  },
  description: {
    fontSize: 12,
    color: "#808080",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  badgeAchieved: {
    backgroundColor: "#E0F7F4",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#06D6A0",
  },
  date: {
    fontSize: 11,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#9D4EDD",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  progressDivider: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  progressDividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B0B0B0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineEnd: {
    height: 40,
  },
  footer: {
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  footerText: {
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
    fontWeight: "500",
  },
  emptyState: {
    paddingVertical: 60,
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
