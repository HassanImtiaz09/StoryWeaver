import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from "react-native";

const { width } = Dimensions.get("window");

interface ShareCardProps {
  title: string;
  childName: string;
  childAge: number;
  theme: string;
  themeIcon: string;
  coverImageUrl?: string | null;
  firstLinePreview: string;
  pageCount: number;
  readingTimeMinutes: number;
  cardSize?: "small" | "medium" | "large";
  style?: ViewStyle;
}

export const ShareCard: React.FC<ShareCardProps> = ({
  title,
  childName,
  childAge,
  theme,
  themeIcon,
  coverImageUrl,
  firstLinePreview,
  pageCount,
  readingTimeMinutes,
  cardSize = "medium",
  style,
}) => {
  const sizeConfig = {
    small: { width: width * 0.4, padding: 12, fontSize: 12 },
    medium: { width: width * 0.8, padding: 16, fontSize: 14 },
    large: { width: width * 0.95, padding: 20, fontSize: 16 },
  };

  const config = sizeConfig[cardSize];

  return (
    <View
      style={[
        styles.container,
        {
          width: config.width,
          padding: config.padding,
        },
        style,
      ]}
    >
      {/* Cover Image Background */}
      {coverImageUrl && (
        <Image
          source={{ uri: coverImageUrl }}
          style={[
            styles.coverImage,
            {
              height: cardSize === "small" ? 120 : cardSize === "medium" ? 180 : 240,
            },
          ]}
        />
      )}

      {/* Overlay for text readability */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Theme Badge */}
        <View style={styles.themeBadge}>
          <Text style={styles.themeIcon}>{themeIcon}</Text>
          <Text style={[styles.themeText, { fontSize: config.fontSize }]}>
            {theme}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              fontSize: cardSize === "small" ? 14 : cardSize === "medium" ? 18 : 22,
            },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Author Credit */}
        <Text
          style={[
            styles.authorCredit,
            { fontSize: config.fontSize },
          ]}
        >
          A story by {childName}, age {childAge}
        </Text>

        {/* Preview Text */}
        <Text
          style={[
            styles.preview,
            { fontSize: config.fontSize - 1 },
          ]}
          numberOfLines={2}
        >
          "{firstLinePreview}"
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { fontSize: config.fontSize - 1 }]}>
              📄 {pageCount} {pageCount === 1 ? "page" : "pages"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { fontSize: config.fontSize - 1 }]}>
              ⏱️ {readingTimeMinutes}m read
            </Text>
          </View>
        </View>

        {/* StoryWeaver Watermark */}
        <View style={styles.watermark}>
          <Text style={[styles.watermarkText, { fontSize: config.fontSize - 2 }]}>
            Created with StoryWeaver ✨
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverImage: {
    width: "100%",
    backgroundColor: "#E0E0E0",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  content: {
    padding: 16,
    paddingTop: 20,
    backgroundColor: "#FFFFFF",
  },
  themeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  themeText: {
    color: "#666",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  title: {
    color: "#1A1A1A",
    fontWeight: "bold",
    marginBottom: 8,
    fontFamily: "Georgia",
  },
  authorCredit: {
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
  },
  preview: {
    color: "#555",
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: "italic",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: "#444",
    fontWeight: "500",
  },
  watermark: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
    marginTop: 8,
  },
  watermarkText: {
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
