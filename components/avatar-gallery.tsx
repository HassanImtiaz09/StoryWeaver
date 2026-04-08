import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { AvatarVariant } from "@/lib/character-avatar";

interface AvatarGalleryProps {
  variants: AvatarVariant[];
  selectedAvatarId?: string;
  onSelectAvatar: (avatarId: string) => void;
  onGenerateMore?: () => Promise<void>;
  isGenerating?: boolean;
  generationProgress?: number;
}

export function AvatarGallery({
  variants,
  selectedAvatarId,
  onSelectAvatar,
  onGenerateMore,
  isGenerating = false,
  generationProgress = 0,
}: AvatarGalleryProps) {
  const colors = useColors();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleGenerateMore = async () => {
    if (!onGenerateMore) return;

    try {
      setIsRegenerating(true);
      await onGenerateMore();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to generate more avatars"
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!variants || variants.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>
            No avatars generated yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.muted }]}>
            Generate your first set of avatars to see them here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your Avatar Options
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Tap to select which one looks best
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {variants.map((variant, index) => (
          <Pressable
            key={variant.id}
            onPress={() => onSelectAvatar(variant.id)}
            style={({ pressed }) => [
              styles.avatarCard,
              {
                backgroundColor: colors.surface,
                borderColor:
                  selectedAvatarId === variant.id ? colors.primary : colors.border,
                borderWidth: selectedAvatarId === variant.id ? 2 : 1,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.variantNumber, { color: colors.foreground }]}>
                Option {index + 1}
              </Text>
              {selectedAvatarId === variant.id && (
                <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.poseContainer}>
              <View style={styles.poseItem}>
                <Image
                  source={{ uri: variant.portrait }}
                  style={[
                    styles.poseImage,
                    { borderColor: colors.border },
                  ]}
                  onError={() => {
                    // Handle image load error
                  }}
                />
                <Text style={[styles.poseLabel, { color: colors.muted }]}>
                  Portrait
                </Text>
              </View>

              <View style={styles.poseItem}>
                <Image
                  source={{ uri: variant.fullBody }}
                  style={[
                    styles.poseImage,
                    { borderColor: colors.border },
                  ]}
                  onError={() => {
                    // Handle image load error
                  }}
                />
                <Text style={[styles.poseLabel, { color: colors.muted }]}>
                  Full Body
                </Text>
              </View>

              <View style={styles.poseItem}>
                <Image
                  source={{ uri: variant.actionPose }}
                  style={[
                    styles.poseImage,
                    { borderColor: colors.border },
                  ]}
                  onError={() => {
                    // Handle image load error
                  }}
                />
                <Text style={[styles.poseLabel, { color: colors.muted }]}>
                  Action Pose
                </Text>
              </View>
            </View>

            <View style={styles.styleTag}>
              <Text style={[styles.styleTagText, { color: colors.muted }]}>
                {variant.artStyle}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {isGenerating && (
        <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${generationProgress}%`,
              },
            ]}
          />
        </View>
      )}

      {onGenerateMore && (
        <Pressable
          onPress={handleGenerateMore}
          disabled={isGenerating || isRegenerating}
          style={({ pressed }) => [
            styles.regenerateButton,
            {
              backgroundColor: colors.primary,
              opacity:
                isGenerating || isRegenerating || pressed ? 0.7 : 1,
            },
          ]}
        >
          {isRegenerating || isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.regenerateButtonText}>Generate More</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  variantNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  poseContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  poseItem: {
    flex: 1,
    alignItems: "center",
  },
  poseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  poseLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  styleTag: {
    alignItems: "center",
    paddingVertical: 6,
  },
  styleTagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  regenerateButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  regenerateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
