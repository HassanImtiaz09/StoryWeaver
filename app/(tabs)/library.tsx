import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { STORY_THEMES } from "@/constants/assets";
import { getLocalStoryArcs, type LocalStoryArc } from "@/lib/story-store";
import Animated, { FadeInDown } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function LibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [arcs, setArcs] = useState<LocalStoryArc[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const loaded = await getLocalStoryArcs();
        setArcs(loaded);
      })();
    }, [])
  );

  const renderArc = ({ item, index }: { item: LocalStoryArc; index: number }) => {
    const themeData = STORY_THEMES.find((t) => t.id === item.theme);
    const progress = item.totalEpisodes > 0 ? (item.currentEpisode / item.totalEpisodes) * 100 : 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
        <Pressable
          onPress={() => {
            router.push({
              pathname: "/story-reader" as any,
              params: {
                episodeTitle: item.title,
                childName: item.childName,
                arcId: item.id,
              },
            });
          }}
          style={({ pressed }) => [
            styles.arcCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Image
            source={{ uri: themeData?.image }}
            style={styles.arcImage}
            contentFit="cover"
          />
          <View style={styles.arcInfo}>
            <Text style={[styles.arcTitle, { color: colors.foreground }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.arcMeta, { color: colors.muted }]}>
              {item.childName} | {item.educationalValueName}
            </Text>
            <Text style={[styles.arcEpisode, { color: colors.muted }]}>
              Episode {item.currentEpisode}/{item.totalEpisodes}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  item.status === "active" && { backgroundColor: "rgba(255, 215, 0, 0.15)" },
                  item.status === "completed" && { backgroundColor: "rgba(34, 197, 94, 0.15)" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === "active" && { color: "#FFD700" },
                    item.status === "completed" && { color: "#22C55E" },
                  ]}
                >
                  {item.status === "active" ? "In Progress" : item.status === "completed" ? "Complete" : "Paused"}
                </Text>
              </View>
              {item.status === "completed" && (
                <Pressable
                  onPress={() => router.push({
                    pathname: "/print-book" as any,
                    params: { arcId: item.id, title: item.title },
                  })}
                  style={({ pressed }) => [
                    styles.printBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name="printer.fill" size={14} color="#FFD700" />
                  <Text style={styles.printBtnText}>Print Book</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Story Library</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Your collection of adventures
          </Text>
        </Animated.View>

        {arcs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Stories Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Go to the Tonight tab and choose a theme to start your first story adventure!
            </Text>
            <Pressable
              onPress={() => router.push("/")}
              style={({ pressed }) => [
                styles.startButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.startButtonText}>Start First Story</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={arcs}
            renderItem={renderArc}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 14,
    paddingBottom: 100,
  },
  arcCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  arcImage: {
    width: 110,
    height: 140,
  },
  arcInfo: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    gap: 4,
  },
  arcTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  arcMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  arcEpisode: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    marginTop: 6,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFD700",
  },
  statusRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  printBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    marginLeft: 8,
  },
  printBtnText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#FFD700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  startButton: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  startButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
});
