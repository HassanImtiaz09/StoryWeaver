// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { AvatarVariant } from "@/lib/character-avatar";

interface CharacterPreviewProps {
  avatar: AvatarVariant;
  childName: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function CharacterPreview({
  avatar,
  childName,
  onEdit,
  onRegenerate,
  isLoading = false,
}: CharacterPreviewProps) {
  const colors = useColors();

  const getFeaturesList = (): string[] => {
    const features: string[] = [];

    if (avatar.description.hairColor) {
      features.push(`${avatar.description.hairColor} hair`);
    }

    if (avatar.description.eyeColor) {
      features.push(`${avatar.description.eyeColor} eyes`);
    }

    if (avatar.description.skinTone) {
      features.push(`${avatar.description.skinTone} skin`);
    }

    if (
      avatar.description.distinguishingFeatures &&
      avatar.description.distinguishingFeatures.length > 0
    ) {
      features.push(...avatar.description.distinguishingFeatures);
    }

    return features;
  };

  const features = getFeaturesList();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Main Character Preview */}
      <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
        <View style={styles.portraitContainer}>
          <Image
            source={{ uri: avatar.variants.portrait }}
            style={styles.portraitImage}
          />
          <View
            style={[
              styles.goldenBorder,
              {
                borderColor: colors.primary,
              },
            ]}
          />
        </View>

        <Text style={[styles.characterName, { color: colors.foreground }]}>
          This is {childName}
        </Text>

        <Text style={[styles.subtitle, { color: colors.muted }]}>
          in {avatar.artStyle}
        </Text>
      </View>

      {/* Character Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Character Details
        </Text>

        {features.length > 0 && (
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}

        {avatar.description.expression && (
          <View style={styles.expressionBox}>
            <Text style={[styles.expressionLabel, { color: colors.muted }]}>
              Expression
            </Text>
            <Text style={[styles.expressionValue, { color: colors.foreground }]}>
              {avatar.description.expression}
            </Text>
          </View>
        )}

        {avatar.description.personalityHints &&
          avatar.description.personalityHints.length > 0 && (
            <View style={styles.personalityBox}>
              <Text style={[styles.personalityLabel, { color: colors.muted }]}>
                Personality
              </Text>
              <Text style={[styles.personalityValue, { color: colors.foreground }]}>
                {avatar.description.personalityHints.join(", ")}
              </Text>
            </View>
          )}
      </View>

      {/* Character Poses */}
      <View style={[styles.posesCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Character Poses
        </Text>

        <View style={styles.posesGrid}>
          <View style={styles.poseItem}>
            <Image
              source={{ uri: avatar.variants.portrait }}
              style={[styles.poseImage, { borderColor: colors.border }]}
            />
            <Text style={[styles.poseItemLabel, { color: colors.muted }]}>
              Portrait
            </Text>
          </View>

          <View style={styles.poseItem}>
            <Image
              source={{ uri: avatar.variants.fullBody }}
              style={[styles.poseImage, { borderColor: colors.border }]}
            />
            <Text style={[styles.poseItemLabel, { color: colors.muted }]}>
              Full Body
            </Text>
          </View>

          <View style={styles.poseItem}>
            <Image
              source={{ uri: avatar.variants.actionPose }}
              style={[styles.poseImage, { borderColor: colors.border }]}
            />
            <Text style={[styles.poseItemLabel, { color: colors.muted }]}>
              Action Pose
            </Text>
          </View>
        </View>

        <Text style={[styles.posesDescription, { color: colors.muted }]}>
          Your character will appear in all three poses throughout {childName}'s stories
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: colors.border,
                opacity: pressed || isLoading ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="pencil" size={18} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Edit
            </Text>
          </Pressable>
        )}

        {onRegenerate && (
          <Pressable
            onPress={onRegenerate}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: colors.border,
                opacity: pressed || isLoading ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Regenerate
            </Text>
          </Pressable>
        )}
      </View>

      {/* Info Message */}
      <View style={styles.infoBox}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {childName} will appear in all their personalized stories looking just like this!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  previewCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  portraitContainer: {
    position: "relative",
    marginBottom: 20,
  },
  portraitImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  goldenBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 12,
    borderWidth: 3,
  },
  characterName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
  },
  expressionBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(100, 100, 100, 0.05)",
    marginBottom: 8,
  },
  expressionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  expressionValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  personalityBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(100, 100, 100, 0.05)",
  },
  personalityLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  personalityValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  posesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  posesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  poseItem: {
    flex: 1,
    alignItems: "center",
  },
  poseImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  poseItemLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  posesDescription: {
    fontSize: 12,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(100, 100, 100, 0.05)",
    borderRadius: 8,
    alignItems: "flex-start",
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});
