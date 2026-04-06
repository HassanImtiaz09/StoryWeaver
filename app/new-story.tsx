import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { EDUCATIONAL_VALUES, STORY_THEMES } from "@/constants/assets";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { saveLocalStoryArc, type LocalStoryArc } from "@/lib/story-store";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function NewStoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    childId: string;
    childName: string;
    theme: string;
    themeName: string;
  }>();

  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [episodeCount, setEpisodeCount] = useState(7);
  const [creating, setCreating] = useState(false);

  const themeData = STORY_THEMES.find((t) => t.id === params.theme);

  const handleCreate = async () => {
    if (!selectedValue || creating) return;
    setCreating(true);

    try {
      const valueName = EDUCATIONAL_VALUES.find((v) => v.id === selectedValue)?.name || selectedValue;
      const arc: LocalStoryArc = {
        id: Date.now().toString(),
        childId: params.childId,
        childName: params.childName,
        title: `${params.childName}'s ${params.themeName} Adventure`,
        theme: params.theme,
        themeName: params.themeName,
        educationalValue: selectedValue,
        educationalValueName: valueName,
        totalEpisodes: episodeCount,
        currentEpisode: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveLocalStoryArc(arc);
      Alert.alert(
        "Story Arc Created!",
        `"${arc.title}" is ready! Go to the Library tab to start reading episodes.`,
        [{ text: "Wonderful!", onPress: () => router.replace("/") }]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to create story. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>

        {/* Theme Preview */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.themePreview}>
          <Image
            source={{ uri: themeData?.image }}
            style={styles.themeImage}
            contentFit="cover"
          />
          <View style={styles.themeOverlay}>
            <Text style={styles.themeEmoji}>{themeData?.emoji}</Text>
            <Text style={styles.themeName}>{params.themeName}</Text>
            <Text style={styles.themeChild}>for {params.childName}</Text>
          </View>
        </Animated.View>

        {/* Educational Value */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            What should this story teach?
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Choose a value that will be woven into every episode
          </Text>
          <View style={styles.valueGrid}>
            {EDUCATIONAL_VALUES.map((val) => (
              <Pressable
                key={val.id}
                onPress={() => setSelectedValue(val.id)}
                style={({ pressed }) => [
                  styles.valueCard,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  selectedValue === val.id && styles.valueCardActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.valueEmoji}>{val.emoji}</Text>
                <Text
                  style={[
                    styles.valueName,
                    { color: colors.foreground },
                    selectedValue === val.id && { color: "#0A0E1A" },
                  ]}
                >
                  {val.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Episode Count */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            How many episodes?
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            One episode per night - choose how long the adventure lasts
          </Text>
          <View style={styles.episodeRow}>
            {[5, 7, 10].map((count) => (
              <Pressable
                key={count}
                onPress={() => setEpisodeCount(count)}
                style={({ pressed }) => [
                  styles.episodeChip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  episodeCount === count && styles.episodeChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.episodeCount,
                    { color: colors.foreground },
                    episodeCount === count && { color: "#0A0E1A" },
                  ]}
                >
                  {count}
                </Text>
                <Text
                  style={[
                    styles.episodeLabel,
                    { color: colors.muted },
                    episodeCount === count && { color: "#0A0E1A" },
                  ]}
                >
                  nights
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Create Button */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.buttonArea}>
          <Pressable
            onPress={handleCreate}
            disabled={!selectedValue || creating}
            style={({ pressed }) => [
              styles.createButton,
              (!selectedValue || creating) && styles.createButtonDisabled,
              pressed && selectedValue && !creating && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            {creating ? (
              <ActivityIndicator color="#0A0E1A" />
            ) : (
              <Text style={styles.createButtonText}>Create Story Adventure</Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  themePreview: {
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
    marginBottom: 28,
  },
  themeImage: {
    ...StyleSheet.absoluteFillObject,
  },
  themeOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  themeEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  themeName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  themeChild: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  valueCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  valueCardActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  valueEmoji: {
    fontSize: 20,
  },
  valueName: {
    fontSize: 15,
    fontWeight: "600",
  },
  episodeRow: {
    flexDirection: "row",
    gap: 12,
  },
  episodeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  episodeChipActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  episodeCount: {
    fontSize: 28,
    fontWeight: "800",
  },
  episodeLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  buttonArea: {
    marginTop: 4,
  },
  createButton: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    color: "#0A0E1A",
    fontSize: 18,
    fontWeight: "700",
  },
});
