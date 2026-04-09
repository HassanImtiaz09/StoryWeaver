// @ts-nocheck
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useSharingStore } from "@/lib/sharing-store";
import { GalleryFilters } from "@/components/gallery-filters";
import { GalleryStoryCard } from "@/components/gallery-story-card";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const COLUMN_WIDTH = (width - 32) / COLUMN_COUNT;

export default function GalleryTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    }
  );

  // Initial load
  useEffect(() => {
    if (getGalleryQuery.data) {
      const { stories, hasMore } = getGalleryQuery.data;
      setGalleryStories(stories);
      setHasMoreGallery(hasMore);
      setIsLoadingGallery(false);
    }
  }, [getGalleryQuery.data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await getGalleryQuery.refetch();
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (hasMoreGalleryStories && !isLoadingMore) {
      setIsLoadingMore(true);
      // Fetch next page
      const nextPage = galleryPage + 1;
      const { data } = await trpc.sharing.getGalleryStories.fetch({
        theme: galleryFilters.theme,
        ageGroup: galleryFilters.ageGroup,
        sortBy: galleryFilters.sortBy,
        searchQuery: galleryFilters.searchQuery,
        limit: 20,
        offset: nextPage * 20,
      });

      if (data) {
        addGalleryStories(data.stories);
        setHasMoreGallery(data.hasMore);
      }
      setIsLoadingMore(false);
    }
  };

  const renderStoryCard = ({ item, index }: any) => (
    <View
      style={{
        width: COLUMN_WIDTH - 6,
        marginRight: index % 2 === 0 ? 12 : 0,
        marginBottom: 12,
      }}
    >
      <GalleryStoryCard
        story={item}
        onPress={() =>
          router.push({
            pathname: "/story-detail" as any,
            params: {
              arcId: item.id,
              title: item.title,
              childName: item.childName,
              theme: item.theme,
              serverArcId: item.id,
            },
          })
        }
        onLike={() => toggleLikeStory(item.id)}
      />
    </View>
  );

  if (isLoadingGallery && galleryStories.length === 0) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={galleryStories}
        renderItem={renderStoryCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Community Gallery</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Discover stories from our community
            </Text>
            <GalleryFilters
              onFilterChange={(filters) => {
                setGalleryFilters(filters);
                setIsLoadingGallery(true);
                getGalleryQuery.refetch();
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No stories found
            </Text>
          </View>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FFD700"
          />
        }
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
