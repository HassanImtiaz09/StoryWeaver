import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface Props {
  title: string;
  childName: string;
  coverImageUrl?: string;
  format: string;
  pageCount: number;
}

const { width } = Dimensions.get("window");

export function BookPreviewCard({
  title,
  childName,
  coverImageUrl,
  format,
  pageCount,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      {/* 3D-ish book mockup */}
      <View style={styles.bookContainer}>
        <View style={[styles.bookSpine, { backgroundColor: colors.primary }]} />
        <View style={styles.coverWrapper}>
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                📖
              </Text>
            </View>
          )}
          <View style={[styles.coverOverlay, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
            <Text style={[styles.coverTitle, { color: "#fff" }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.coverSubtitle, { color: "rgba(255,255,255,0.9)" }]}>
              for {childName}
            </Text>
          </View>
        </View>
      </View>

      {/* Book info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Format</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{format}</Text>

        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Pages</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{pageCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  bookContainer: {
    flexDirection: "row",
    height: 280,
    perspective: 1,
  },
  bookSpine: {
    width: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  coverWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    margin: 16,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 48,
  },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: "flex-end",
  },
  coverTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 13,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoLabel: {
    fontSize: 12,
    width: "50%",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    width: "50%",
    marginBottom: 12,
  },
});
