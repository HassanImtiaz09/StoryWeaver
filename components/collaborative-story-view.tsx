/**
 * Collaborative Story View
 * Displays the story as it's built by all participants
 */

import React, { useEffect, useRef } from "react";
import { View, Text, ScrollView, Animated, Image,
  StyleSheet} from "react-native";
import { useCollaborativeStore } from "../lib/collaborative-store";

interface CollaborativeStoryViewProps {
  showPageNumbers?: boolean;
  showContributorBadges?: boolean;
}

export const CollaborativeStoryView: React.FC<CollaborativeStoryViewProps> = ({
  showPageNumbers = true,
  showContributorBadges = true,
}) => {
  const session = useCollaborativeStore((state) => state.activeSession);
  const segments = session?.storySegments || [];
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (segments.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [segments.length]);

  if (!session || segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>The story is waiting...</Text>
        <Text style={styles.emptyText}>
          {session && session.status === "waiting"
            ? "The host will start the story once everyone is ready."
            : "The first contributor will begin the story soon."}
        </Text>
      </View>
    );
  }

  const getContributorInfo = (participantId: number) => {
    return session.participants.find((p) => p.userId === participantId);
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.storyContainer}>
        {/* Story Title / Header */}
        <View style={styles.headerSection}>
          <Text style={styles.storyTitle}>Our Collaborative Story</Text>
          <Text style={styles.episodeInfo}>
            {segments.length} page{segments.length !== 1 ? "s" : ""} • {session.participants.length} contributor{session.participants.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Story Segments */}
        {segments.map((segment, index) => {
          const contributor = getContributorInfo(segment.participantId);

          return (
            <SegmentCard
              key={index}
              pageNumber={segment.pageNumber}
              text={segment.text}
              contributor={contributor}
              isLast={index === segments.length - 1}
              showPageNumber={showPageNumbers}
              showBadge={showContributorBadges}
            />
          );
        })}

        {/* Spacing at bottom */}
        <View style={styles.bottomSpacing} />
      </View>
    </ScrollView>
  );
};

interface SegmentCardProps {
  pageNumber: number;
  text: string;
  contributor?: {
    displayName: string;
    color: string;
    turnsCompleted: number;
  };
  isLast: boolean;
  showPageNumber: boolean;
  showBadge: boolean;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  pageNumber,
  text,
  contributor,
  isLast,
  showPageNumber,
  showBadge,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.segmentCard, { opacity: fadeAnim }]}>
      {/* Page Header with Contributor Badge */}
      <View style={styles.segmentHeader}>
        {showPageNumber && (
          <Text style={styles.pageNumber}>Page {pageNumber}</Text>
        )}

        {showBadge && contributor && (
          <View style={styles.contributorBadge}>
            <View
              style={[
                styles.contributorDot,
                { backgroundColor: contributor.color },
              ]}
            />
            <Text style={styles.contributorName}>{contributor.displayName}</Text>
          </View>
        )}
      </View>

      {/* Segment Text */}
      <View style={styles.segmentContent}>
        <Text style={styles.storyText}>{text}</Text>
      </View>

      {/* Connector Line (if not last) */}
      {!isLast && <View style={styles.connectorLine} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  storyContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  episodeInfo: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  segmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pageNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contributorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  contributorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  contributorName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  segmentContent: {
    marginBottom: 12,
  },
  storyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  connectorLine: {
    height: 12,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F5F7FA",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});
