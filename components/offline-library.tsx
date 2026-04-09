/**
 * Offline Library Component
 *
 * Displays list of available offline stories with download status.
 * Allows filtering, sorting, and batch operations.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore, type OfflineStoryInfo } from "@/lib/offline-store";
import { createOfflineManager } from "@/lib/offline-manager";
import { useColors } from "@/hooks/use-colors";

type SortOption = "recently-downloaded" | "size" | "last-read";

interface OfflineLibraryProps {
  userId: number;
  onStoryPress?: (story: OfflineStoryInfo) => void;
}

export function OfflineLibrary({ userId, onStoryPress }: OfflineLibraryProps) {
  const [sortBy, setSortBy] = useState<SortOption>("recently-downloaded");
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();

  const store = useOfflineStore();
  const stories = Array.from(store.offlineStories.values());

  const sortedStories = [...stories].sort((a, b) => {
    switch (sortBy) {
      case "size":
        return b.totalSize - a.totalSize;
      case "last-read":
        return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
      case "recently-downloaded":
      default:
        return b.downloadedAt.getTime() - a.downloadedAt.getTime();
    }
  });

  const handleDownloadAll = async () => {
    Alert.alert(
      "Download All",
      "This feature requires the story bundles. In production, this would trigger downloading all available stories.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Download",
          onPress: async () => {
            // In production, would fetch bundles and download
            console.log("Download all stories triggered");
          },
        },
      ]
    );
  };

  const handleRemoveAll = async () => {
    if (stories.length === 0) return;

    Alert.alert(
      "Remove All Offline Stories",
      `Delete all ${stories.length} offline stories? This will free up ${formatBytes(
        stories.reduce((sum, s) => sum + s.totalSize, 0)
      )}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            setIsLoading(true);
            try {
              const manager = createOfflineManager(userId);
              for (const story of stories) {
                await manager.removeOfflineStory(story.arcId);
              }
            } catch (error) {
              console.error("Failed to remove stories:", error);
              Alert.alert("Error", "Failed to remove some stories");
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const breakdown = store.getStorageBreakdown();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-download-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Stories Downloaded Yet</Text>
        <Text style={styles.emptyText}>
          Download stories to read them offline. Perfect for flights, car trips, and areas with
          poor connectivity.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sort Controls */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["recently-downloaded", "size", "last-read"] as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setSortBy(option)}
              style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option && styles.sortButtonTextActive,
                ]}
              >
                {option === "recently-downloaded"
                  ? "Recently Downloaded"
                  : option === "size"
                  ? "Size"
                  : "Last Read"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Storage Usage */}
      <View style={styles.storageContainer}>
        <View>
          <Text style={styles.storageLabel}>Storage Used</Text>
          <Text style={styles.storageValue}>
            {formatBytes(breakdown.used)} / {formatBytes(breakdown.quota)}
          </Text>
        </View>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageBarFill,
              {
                width: `${breakdown.percentUsed}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.storagePercent}>{Math.round(breakdown.percentUsed)}%</Text>
      </View>

      {/* Stories List */}
      <FlatList
        data={sortedStories}
        keyExtractor={(story) => story.arcId.toString()}
        scrollEnabled={false}
        renderItem={({ item: story }) => (
          <StoryOfflineCard
            story={story}
            userId={userId}
            onPress={() => onStoryPress?.(story)}
          />
        )}
        contentContainerStyle={styles.listContainer}
      />

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadAllButton]}
          onPress={handleDownloadAll}
        >
          <Ionicons name="cloud-download" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Download All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.removeAllButton]}
          onPress={handleRemoveAll}
        >
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Remove All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface StoryOfflineCardProps {
  story: OfflineStoryInfo;
  userId: number;
  onPress?: () => void;
}

function StoryOfflineCard({ story, userId, onPress }: StoryOfflineCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const manager = createOfflineManager(userId);
      await manager.removeOfflineStory(story.arcId);
    } catch (error) {
      console.error("Failed to remove story:", error);
      Alert.alert("Error", "Failed to remove story");
    } finally {
      setIsRemoving(false);
    }
  };

  const episodeCount = story.episodes.size;
  const completedEpisodes = Array.from(story.episodes.values()).filter(
    (e) => e.textCached && e.imagesCached
  ).length;

  const daysAgo = Math.floor(
    (Date.now() - story.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {story.title}
          </Text>
          <Text style={styles.cardTheme}>{story.theme}</Text>
        </View>
        <TouchableOpacity
          onPress={handleRemove}
          disabled={isRemoving}
          style={styles.cardRemoveButton}
        >
          {isRemoving ? (
            <ActivityIndicator size={20} color="#EF4444" />
          ) : (
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="document-text" size={16} color="#6B7280" />
          <Text style={styles.metaText}>
            {completedEpisodes}/{episodeCount} episodes
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="hardware-chip" size={16} color="#6B7280" />
          <Text style={styles.metaText}>{formatBytes(story.totalSize)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text style={styles.metaText}>
            {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
          </Text>
        </View>
      </View>

      {completedEpisodes < episodeCount && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(completedEpisodes / episodeCount) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedEpisodes}/{episodeCount} complete
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    color: "#1F2937",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  sortButtonActive: {
    backgroundColor: "#4F46E5",
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  sortButtonTextActive: {
    color: "#FFFFFF",
  },
  storageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
  },
  storageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  storageValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginVertical: 4,
  },
  storageBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginVertical: 8,
    overflow: "hidden",
  },
  storageBarFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
  },
  storagePercent: {
    fontSize: 12,
    color: "#6B7280",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  cardTheme: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  cardRemoveButton: {
    padding: 8,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  progressText: {
    fontSize: 11,
    color: "#6B7280",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadAllButton: {
    backgroundColor: "#4F46E5",
  },
  removeAllButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
