import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

interface GalleryStoryCardProps {
  id: number;
  title: string;
  author: string;
  theme: string;
  coverImageUrl?: string | null;
  likeCount: number;
  viewCount: number;
  isLiked?: boolean;
  onPress: () => void;
  onLikePress: (id: number) => void;
  columnWidth?: number;
}

export const GalleryStoryCard: React.FC<GalleryStoryCardProps> = ({
  id,
  title,
  author,
  theme,
  coverImageUrl,
  likeCount,
  viewCount,
  isLiked = false,
  onPress,
  onLikePress,
  columnWidth = (width - 32) / 2, // Default to 2-column grid
}) => {
  const themeIcons: Record<string, string> = {
    space: "🚀",
    ocean: "🌊",
    forest: "🌲",
    fairy: "✨",
    adventure: "🗺️",
    bedtime: "🌙",
    mystery: "🔍",
    magic: "✨",
    default: "📖",
  };

  const themeIcon = themeIcons[theme.toLowerCase()] || themeIcons.default;

  return (
    <View style={[styles.container, { width: columnWidth }]}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
      >
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          {coverImageUrl ? (
            <Image
              source={{ uri: coverImageUrl }}
              style={styles.image}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderIcon}>📖</Text>
            </View>
          )}

          {/* Theme Badge */}
          <View style={styles.themeBadge}>
            <Text style={styles.themeIcon}>{themeIcon}</Text>
          </View>

          {/* Like Button */}
          <Pressable
            style={styles.likeButton}
            onPress={() => onLikePress(id)}
          >
            <Text style={styles.likeIcon}>
              {isLiked ? "❤️" : "🤍"}
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Author */}
          <Text
            style={styles.author}
            numberOfLines={1}
          >
            by {author}
          </Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statText}>
                {likeCount > 0 ? (likeCount > 999 ? "999+" : likeCount) : 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>👁️</Text>
              <Text style={styles.statText}>
                {viewCount > 0 ? (viewCount > 999 ? "999+" : viewCount) : 0}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  themeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeIcon: {
    fontSize: 18,
  },
  likeButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  likeIcon: {
    fontSize: 20,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 18,
  },
  author: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 8,
    fontStyle: "italic",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    fontSize: 12,
  },
  statText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
});
