import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { AnimatedPressable, BounceButton } from "@/components/animated-pressable";
import { announce } from "@/lib/a11y-helpers";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { getLocalStoryArcs, type LocalStoryArc } from "@/lib/story-store";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { IllustratedEmptyState } from "@/components/illustrated-empty-state";

export default function LibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [storyArcs, setStoryArcs] = useState<LocalStoryArc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterOffline, setFilterOffline] = useState(false);

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);

    if (kids.length > 0) {
      const child =
        selectedChild && kids.find((k) => k.id === selectedChild.id)
          ? selectedChild
          : kids[0];
      setSelectedChild(child);

      const arcs = await getLocalStoryArcs();
      const filteredArcs = filterOffline
        ? arcs.filter((a) => a.childId === child.id && a.isOfflineAvailable)
        : arcs.filter((a) => a.childId === child.id);

      setStoryArcs(filteredArcs);
    } else {
      setSelectedChild(null);
      setStoryArcs([]);
    }

    setLoading(false);
  }, [selectedChild, filterOffline]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const selectChild = async (child: LocalChild) => {
    setSelectedChild(child);
    announce(`Selected ${child.name}`);
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  if (children.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
          }
        >
          <IllustratedEmptyState
            type="no-stories"
            title="Your Story Library is Empty"
            subtitle="Every great adventure starts with 'Once upon a time...' Create a child profile to get started."
            actionLabel="Create Child Profile"
            onAction={() => router.push("/create-child")}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {/* Header */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(400)}
          style={styles.header}
          accessibilityRole="header"
        >
          <Text style={[styles.title, { color: colors.text }]}>Your Library</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            All your child's stories in one place
          </Text>
        </Animated.View>

        {/* Child Selector */}
        {children.length > 1 && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(100).duration(400)}
            style={styles.childSelector}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => selectChild(child)}
                  accessibilityLabel={child.name}
                  accessibilityRole="button"
                  accessibilityHint="Tap to select this child's stories"
                  accessibilityState={{ selected: selectedChild?.id === child.id }}
                  style={[
                    styles.childChip,
                    { minHeight: 44 },
                    {
                      backgroundColor:
                        selectedChild?.id === child.id
                          ? colors.primary
                          : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      {
                        color:
                          selectedChild?.id === child.id ? "#0A0E1A" : colors.text,
                      },
                    ]}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Filter Buttons */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(150).duration(400)}
          style={styles.filterContainer}
        >
          <Pressable
            onPress={() => {
              setFilterOffline(false);
              announce("Showing all stories");
            }}
            accessibilityLabel="All Stories"
            accessibilityRole="button"
            accessibilityState={{ selected: !filterOffline }}
            accessibilityHint="Filter to show all stories"
            style={[
              styles.filterButton,
              { minHeight: 44 },
              {
                backgroundColor:
                  !filterOffline
                    ? colors.primary
                    : "rgba(255,255,255,0.08)",
              },
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: !filterOffline ? "#0A0E1A" : colors.text },
              ]}
            >
              All Stories
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setFilterOffline(true);
              announce("Showing offline available stories only");
            }}
            accessibilityLabel="Offline Available"
            accessibilityRole="button"
            accessibilityState={{ selected: filterOffline }}
            accessibilityHint="Filter to show only stories available offline"
            style={[
              styles.filterButton,
              { minHeight: 44 },
              {
                backgroundColor:
                  filterOffline
                    ? colors.primary
                    : "rgba(255,255,255,0.08)",
              },
            ]}
          >
            <Ionicons
              name="cloud-download-outline"
              size={16}
              color={filterOffline ? "#0A0E1A" : colors.text}
              style={styles.filterIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: filterOffline ? "#0A0E1A" : colors.text },
              ]}
            >
              Offline Available
            </Text>
          </Pressable>
        </Animated.View>

        {/* Story List */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(400)}>
          {storyArcs.length === 0 ? (
            <IllustratedEmptyState
              type="no-downloads"
              title={filterOffline ? "No Offline Stories" : "No Stories Created Yet"}
              subtitle={filterOffline
                ? "Download stories to read anywhere, anytime"
                : "Complete some stories to see them appear here"}
              actionLabel={!filterOffline ? "Create Your First Story" : undefined}
              onAction={!filterOffline ? () => router.push("/(tabs)/create") : undefined}
              compact
            />
          ) : (
            <View style={styles.storyGrid}>
              {storyArcs.map((arc) => {
                const progressPercent = arc.totalEpisodes > 0
                  ? Math.round((arc.currentEpisode / arc.totalEpisodes) * 100)
                  : 0;
                const offlineStatus = arc.isOfflineAvailable ? ", available offline" : "";
                const storyLabel = `${arc.title}, ${arc.currentEpisode} of ${arc.totalEpisodes} episodes, ${progressPercent}% complete${offlineStatus}`;

                return (
                <AnimatedPressable
                  key={arc.id}
                  onPress={() =>
                    router.push({
                      pathname: "/story-detail" as any,
                      params: {
                        arcId: arc.id,
                        title: arc.title,
                        childName: arc.childName,
                        theme: arc.theme,
                        serverArcId: arc.serverArcId?.toString() || "",
                      },
                    })
                  }
                  accessibilityLabel={storyLabel}
                  accessibilityRole="button"
                  accessibilityHint="Opens this story to view or continue reading"
                  style={[styles.storyCard, { backgroundColor: colors.card, minHeight: 44 }]}
                >
                  {arc.coverImageUrl && (
                    <Image
                      source={{ uri: arc.coverImageUrl }}
                      style={styles.storyImage}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.storyInfo}>
                    <Text
                      style={[styles.storyTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {arc.title}
                    </Text>
                    <Text
                      style={[styles.storyMeta, { color: colors.textSecondary }]}
                    >
                      {arc.currentEpisode}/{arc.totalEpisodes} episodes
                    </Text>

                    {/* Progress Bar */}
                    <View
                      style={[
                        styles.progressBar,
                        { backgroundColor: "rgba(255,215,0,0.15)" },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${
                              arc.totalEpisodes > 0
                                ? (arc.currentEpisode / arc.totalEpisodes) * 100
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>

                    {/* Offline Badge */}
                    {arc.isOfflineAvailable && (
                      <View style={styles.offlineBadge}>
                        <Ionicons name="cloud-done" size={12} color="#10B981" />
                        <Text style={styles.offlineBadgeText}>Offline</Text>
                      </View>
                    )}
                  </View>
                </AnimatedPressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  childSelector: {
    marginBottom: 16,
  },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  storyGrid: {
    gap: 12,
  },
  storyCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  storyImage: {
    width: "100%",
    height: 120,
  },
  storyInfo: {
    padding: 12,
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  storyMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD700",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  offlineBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#0A0E1A",
    fontSize: 14,
    fontWeight: "700",
  },
  noStoriesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  noStoriesText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    color: "#0A0E1A",
    fontSize: 13,
    fontWeight: "700",
  },
});
