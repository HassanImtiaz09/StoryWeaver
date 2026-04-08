import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getLocalStoryArcs } from "@/lib/story-store";

export default function StoryDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    arcId: string;
    title: string;
    childName: string;
    theme: string;
    serverArcId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [storyData, setStoryData] = useState<any>(null);

  const loadStory = useCallback(async () => {
    try {
      const arcs = await getLocalStoryArcs();
      const arcId = params?.arcId ? parseInt(params.arcId, 10) : null;
      if (arcId) {
        const arc = arcs.find((a) => a.id === arcId);
        if (arc) {
          setStoryData(arc);
        }
      }
    } catch (error) {
      console.error("Error loading story:", error);
    } finally {
      setLoading(false);
    }
  }, [params?.arcId]);

  useFocusEffect(
    useCallback(() => {
      loadStory();
    }, [loadStory])
  );

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {params?.title || "Story"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Story Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Child:
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {params?.childName}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Theme:
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {params?.theme}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Episodes:
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {storyData?.currentEpisode || 0}/{storyData?.totalEpisodes || 1}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() =>
              Alert.alert("Story Reading", "Story reading feature coming soon")
            }
          >
            <Ionicons name="play-circle" size={24} color="#0A0E1A" />
            <Text style={styles.actionButtonText}>Read Story</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: "rgba(255,215,0,0.15)" },
            ]}
            onPress={() =>
              router.push({
                pathname: "/story-share" as any,
                params: {
                  arcId: params?.arcId,
                  title: params?.title,
                  childName: params?.childName,
                  serverArcId: params?.serverArcId,
                },
              })
            }
          >
            <Ionicons name="share-social-outline" size={24} color="#FFD700" />
            <Text style={styles.actionButtonTextMuted}>Share</Text>
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            About This Story
          </Text>
          <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
            This personalized story was created specifically for{" "}
            {params?.childName} based on their interests and age preferences.
            Each episode brings a new adventure in the {params?.theme} theme.
          </Text>
        </View>

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "#0A0E1A",
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonTextMuted: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
