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
import { LinearGradient } from "expo-linear-gradient";
import { saveLocalStoryArc, type LocalStoryArc } from "@/lib/story-store";
import { trpc } from "@/lib/trpc";
import Animated, { FadeInDown } from "react-native-reanimated";

type GenerationStep = "idle" | "creating_arc" | "generating_episode" | "generating_images" | "done";

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: "",
  creating_arc: "Crafting your story universe...",
  generating_episode: "Writing tonight's episode...",
  generating_images: "Painting the illustrations...",
  done: "Your story is ready!",
};

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
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");

  const themeData = STORY_THEMES.find((t) => t.id === params.theme);

  // Server-side story generation via tRPC
  const createArcMutation = trpc.storyArcs.create.useMutation();
  const generateEpisodeMutation = trpc.episodes.generate.useMutation();

  const handleCreate = async () => {
    if (!selectedValue || creating) return;
    setCreating(true);

    const valueName = EDUCATIONAL_VALUES.find((v) => v.id === selectedValue)?.name || selectedValue;

    // Try server-side AI generation first, fall back to local
    try {
      setGenerationStep("creating_arc");

      const arcResult = await createArcMutation.mutateAsync({
        childId: parseInt(params.childId, 10),
        theme: params.theme,
        educationalValue: selectedValue,
        totalEpisodes: episodeCount,
      });

      // Also save locally for offline access
      const localArc: LocalStoryArc = {
        id: arcResult.id.toString(),
        childId: params.childId,
        childName: params.childName,
        title: arcResult.title || `${params.childName}'s ${params.themeName} Adventure`,
        theme: params.theme,
        themeName: params.themeName,
        educationalValue: selectedValue,
        educationalValueName: valueName,
        totalEpisodes: episodeCount,
        currentEpisode: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        serverArcId: arcResult.id,
        coverImageUrl: arcResult.coverImageUrl || undefined,
        synopsis: arcResult.synopsis || undefined,
      };
      await saveLocalStoryArc(localArc);

      // Generate first episode
      setGenerationStep("generating_episode");
      const episodeResult = await generateEpisodeMutation.mutateAsync({
        storyArcId: arcResult.id,
      });

      setGenerationStep("done");

      Alert.alert(
        "Story Created!",
        `"${arcResult.title}" is ready with its first episode: "${episodeResult.title}". Head to the story reader to begin the adventure!`,
        [{
          text: "Read Now!",
          onPress: () => router.replace({
            pathname: "/story-reader" as any,
            params: {
              episodeTitle: episodeResult.title,
              childName: params.childName,
              arcId: arcResult.id.toString(),
              episodeId: episodeResult.id.toString(),
              serverMode: "true",
            },
          }),
        }, {
          text: "Later",
          onPress: () => router.replace("/"),
          style: "cancel",
        }]
      );
    } catch (serverError) {
      // Fallback to local-only story arc
      console.log("Server generation failed, falling back to local:", serverError);
      try {
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
          `"${arc.title}" is ready! AI generation will be available when connected. Go to the Library tab to start reading.`,
          [{ text: "OK", onPress: () => router.replace("/") }]
        );
      } catch (e) {
        Alert.alert("Error", "Failed to create story. Please try again.");
      }
    } finally {
      setCreating(false);
      setGenerationStep("idle");
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
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            locations={[0.3, 1]}
            style={styles.themeGradient}
          >
            <Text style={styles.themeEmoji}>{themeData?.emoji}</Text>
            <Text style={styles.themeName}>{params.themeName}</Text>
            <Text style={styles.themeChild}>for {params.childName}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Generation Progress Overlay */}
        {creating && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              {STEP_MESSAGES[generationStep]}
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.muted }]}>
              Our AI is personalizing this story for {params.childName}. This may take 15-30 seconds.
            </Text>
            <View style={styles.progressDots}>
              {(["creating_arc", "generating_episode", "generating_images", "done"] as GenerationStep[]).map((step, idx) => (
                <View
                  key={step}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        generationStep === step ? "#FFD700" :
                        (["creating_arc", "generating_episode", "generating_images", "done"].indexOf(generationStep) > idx) ? "#4ADE80" :
                        colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Educational Value */}
        {!creating && (
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
        )}

        {/* Episode Count */}
        {!creating && (
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
        )}

        {/* Create Button */}
        {!creating && (
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
              <IconSymbol name="sparkles" size={20} color="#0A0E1A" />
              <Text style={styles.createButtonText}>Generate with AI</Text>
            </Pressable>
            <Text style={[styles.aiNote, { color: colors.muted }]}>
              Our AI will craft a unique, personalized story based on {params.childName}'s profile
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  themePreview: { borderRadius: 24, overflow: "hidden", height: 240, marginBottom: 28 },
  themeGradient: { flex: 1, justifyContent: "flex-end", padding: 22 },
  themeEmoji: { fontSize: 40, marginBottom: 6 },
  themeName: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  themeChild: { fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  progressCard: { borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 28, gap: 12 },
  progressTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  progressSubtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  progressDots: { flexDirection: "row", gap: 8, marginTop: 4 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  valueGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  valueCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 8 },
  valueCardActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  valueEmoji: { fontSize: 20 },
  valueName: { fontSize: 15, fontWeight: "600" },
  episodeRow: { flexDirection: "row", gap: 12 },
  episodeChip: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
  episodeChipActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  episodeCount: { fontSize: 28, fontWeight: "800" },
  episodeLabel: { fontSize: 13, fontWeight: "500" },
  buttonArea: { marginTop: 4, alignItems: "center" },
  createButton: { backgroundColor: "#FFD700", borderRadius: 16, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, width: "100%" },
  createButtonDisabled: { opacity: 0.4 },
  createButtonText: { color: "#0A0E1A", fontSize: 18, fontWeight: "700" },
  aiNote: { fontSize: 12, textAlign: "center", marginTop: 10, lineHeight: 18 },
});
