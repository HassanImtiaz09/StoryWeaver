import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useSharingStore } from "@/lib/sharing-store";
import { GalleryFilters } from "@/components/gallery-filters";
import { GalleryStoryCard } from "@/components/gallery-story-card";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const COLUMN_WIDTH = (width - 32) / COLUMN_COUNT;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    galleryStories,
    galleryPage,
    hasMoreGalleryStories,
    galleryFilters,
    isLoadingGallery,
    setGalleryStories,
    addGalleryStories,
    setHasMoreGallery,
    setIsLoadingGallery,
    setGalleryFilters,
    toggleLikeStory,
  } = useSharingStore();

  // API calls
  const getGalleryQuery = trpc.sharing.getGalleryStories.useQuery(
    {
      theme: galleryFilters.theme,
      ageGroup: galleryFilters.ageGroup,
      sortBy: galleryFilters.sortBy,
      searchQuery: galleryFilters.searchQuery,
      limit: 20,
      offset: galleryPage * 20,
    },
    {
      enabled: true,
      // @ts-expect-error - overload mismatch
      onSuccess: (data: any) => {
        if (galleryPage === 0) {
          setGalleryStories(data, true);
        } else {
          addGalleryStories(data);
        }
        setHasMoreGallery(data.length === 20);
        setIsLoadingGallery(false);
      },
      onError: () => {
        setIsLoadingGallery(false);
      },
    }
  );

  const likeStoryMutation = trpc.sharing.likeStory.useMutation();

  // Load gallery on mount and filter changes
  useEffect(() => {
    setIsLoadingGallery(true);
  }, [galleryFilters]);

  const handleLoadMore = () => {
    if (hasMoreGalleryStories && !isLoadingMore) {
      setIsLoadingMore(true);
      // This will trigger the query again due to galleryPage change
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reset to page 0
    setGalleryStories([], true);
    setIsRefreshing(false);
  };

  const handleLikePress = (arcId: number) => {
    toggleLikeStory(arcId);
    likeStoryMutation.mutate({ arcId });
  };

  const handleStoryPress = (arcId: number) => {
    // Navigate to story details
    // router.push(`/story/${arcId}`);
  };

  const handleThemeChange = (theme?: string) => {
    setGalleryFilters({ theme });
  };

  const handleAgeGroupChange = (ageGroup?: string) => {
    setGalleryFilters({ ageGroup });
  };

  const handleSortChange = (sortBy: "popular" | "recent" | "liked") => {
    setGalleryFilters({ sortBy });
  };

  const handleSearchChange = (searchQuery?: string) => {
    setGalleryFilters({ searchQuery });
  };

  const renderItem = ({ item, index }: any) => (
    <GalleryStoryCard
      id={item.id}
      title={item.title}
      author={item.childName}
      theme={item.theme}
      coverImageUrl={item.coverImageUrl}
      likeCount={item.likeCount}
      viewCount={item.viewCount}
      isLiked={item.isLiked}
      onPress={() => handleStoryPress(item.arcId)}
      onLikePress={handleLikePress}
      columnWidth={COLUMN_WIDTH}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Stories Yet</Text>
      <Text style={styles.emptyText}>
        No stories match your filters. Try adjusting your search.
      </Text>
      <Pressable
        style={styles.resetButton}
        onPress={() => {
          setGalleryFilters({});
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Story Gallery</Text>
        <Text style={styles.subtitle}>Discover amazing stories from our community</Text>
      </View>

      {/* Filters */}
      <GalleryFilters
        onThemeChange={handleThemeChange}
        onAgeGroupChange={handleAgeGroupChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        currentTheme={galleryFilters.theme}
        currentAgeGroup={galleryFilters.ageGroup}
        currentSort={galleryFilters.sortBy}
        currentSearch={galleryFilters.searchQuery}
      />

      {/* Stories Grid */}
      {isLoadingGallery && galleryStories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      ) : (
        <FlatList
          data={galleryStories}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.id}`}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6366F1"
            />
          }
          scrollEventThrottle={16}
        />
      )}

      {/* Load More Indicator */}
      {isLoadingMore && (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}

      {/* Share CTA */}
      {galleryStories.length > 0 && (
        <View style={styles.ctaContainer}>
          <Pressable style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>✨ Share Your Story</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#6366F1",
    borderRadius: 6,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  ctaButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
