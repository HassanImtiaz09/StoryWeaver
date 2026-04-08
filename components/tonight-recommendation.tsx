import { View, Text, Pressable, StyleSheet, ImageBackground } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { StoryTitle, BodyText, BodyTextSmall, CaptionText } from "@/components/styled-text";

interface Recommendation {
  title: string;
  theme: string;
  reason: string;
  coverImageUrl?: string;
}

interface ContinueArc {
  title: string;
  episodeNumber: number;
  totalEpisodes: number;
  coverImageUrl?: string;
}

interface Props {
  childName: string;
  recommendation: Recommendation | null;
  onPress: () => void;
  continueArc?: ContinueArc;
  onContinuePress?: () => void;
}

/**
 * Smart recommendation card that shows:
 * 1. "Continue Your Story" as PRIMARY action (if available)
 * 2. "Tonight's Suggestion" as secondary
 */
export function TonightRecommendation({
  childName,
  recommendation,
  onPress,
  continueArc,
  onContinuePress,
}: Props) {
  const colors = useColors();

  // If both exist, show continue arc first (larger, more prominent)
  if (continueArc && onContinuePress) {
    return (
      <Animated.View entering={FadeInDown.duration(600)} style={styles.container}>
        {/* Continue Your Story - PRIMARY */}
        <Pressable
          onPress={onContinuePress}
          style={({ pressed }) => [
            styles.continueCard,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.continueContent}>
            {continueArc.coverImageUrl && (
              <Image
                source={{ uri: continueArc.coverImageUrl }}
                style={styles.continueImage}
                contentFit="cover"
              />
            )}
            <View
              style={[
                styles.continueImagePlaceholder,
                !continueArc.coverImageUrl && {
                  backgroundColor: "rgba(255, 215, 0, 0.15)",
                },
              ]}
            >
              {!continueArc.coverImageUrl && (
                <Text style={styles.bookEmoji}>📖</Text>
              )}
            </View>

            <View style={styles.continueInfo}>
              <View style={styles.continueHeader}>
                <BodyTextSmall style={{ color: colors.textSecondary, textTransform: "uppercase" }}>
                  Continue Your Story
                </BodyTextSmall>
                <IconSymbol name="arrow.right" size={16} color={colors.primary} />
              </View>

              <StoryTitle
                style={{ color: colors.text, fontSize: 16 }}
                numberOfLines={2}
              >
                {continueArc.title}
              </StoryTitle>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: "rgba(255, 215, 0, 0.15)" },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (continueArc.episodeNumber / continueArc.totalEpisodes) *
                          100
                        }%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <CaptionText style={{ color: colors.textSecondary }}>
                  Episode {continueArc.episodeNumber}/{continueArc.totalEpisodes}
                </CaptionText>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Tonight's Suggestion - SECONDARY */}
        {recommendation && (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.suggestionCard,
              { backgroundColor: colors.card },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.suggestionIcon}>
              <Text style={styles.suggestionEmoji}>✨</Text>
            </View>
            <View style={styles.suggestionInfo}>
              <BodyTextSmall style={{ color: colors.textSecondary, textTransform: "uppercase" }}>
                Tonight's Suggestion
              </BodyTextSmall>
              <StoryTitle
                style={{ color: colors.text, fontSize: 14 }}
                numberOfLines={1}
              >
                {recommendation.title}
              </StoryTitle>
              <BodyTextSmall
                style={{ color: colors.textSecondary }}
                numberOfLines={1}
              >
                {recommendation.reason}
              </BodyTextSmall>
            </View>
            <IconSymbol name="arrow.right" size={16} color={colors.primary} />
          </Pressable>
        )}
      </Animated.View>
    );
  }

  // Only continue arc
  if (continueArc && onContinuePress) {
    return (
      <Animated.View entering={FadeInDown.duration(600)} style={styles.container}>
        <Pressable
          onPress={onContinuePress}
          style={({ pressed }) => [
            styles.continueCard,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.continueContent}>
            {continueArc.coverImageUrl && (
              <Image
                source={{ uri: continueArc.coverImageUrl }}
                style={styles.continueImage}
                contentFit="cover"
              />
            )}
            <View
              style={[
                styles.continueImagePlaceholder,
                !continueArc.coverImageUrl && {
                  backgroundColor: "rgba(255, 215, 0, 0.15)",
                },
              ]}
            >
              {!continueArc.coverImageUrl && (
                <Text style={styles.bookEmoji}>📖</Text>
              )}
            </View>

            <View style={styles.continueInfo}>
              <View style={styles.continueHeader}>
                <BodyTextSmall style={{ color: colors.textSecondary, textTransform: "uppercase" }}>
                  Continue Your Story
                </BodyTextSmall>
                <IconSymbol name="arrow.right" size={16} color={colors.primary} />
              </View>

              <StoryTitle
                style={{ color: colors.text, fontSize: 16 }}
                numberOfLines={2}
              >
                {continueArc.title}
              </StoryTitle>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: "rgba(255, 215, 0, 0.15)" },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (continueArc.episodeNumber / continueArc.totalEpisodes) *
                          100
                        }%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <CaptionText style={{ color: colors.textSecondary }}>
                  Episode {continueArc.episodeNumber}/{continueArc.totalEpisodes}
                </CaptionText>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Only recommendation
  if (recommendation) {
    return (
      <Animated.View entering={FadeInDown.duration(600)} style={styles.container}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.suggestionCard,
            { backgroundColor: colors.card },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.suggestionIcon}>
            <Text style={styles.suggestionEmoji}>✨</Text>
          </View>
          <View style={styles.suggestionInfo}>
            <Text style={[styles.suggestionLabel, { color: colors.textSecondary }]}>
              Tonight's Suggestion
            </Text>
            <Text
              style={[styles.suggestionTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {recommendation.title}
            </Text>
            <Text
              style={[styles.suggestionReason, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {recommendation.reason}
            </Text>
          </View>
          <IconSymbol name="arrow.right" size={16} color={colors.primary} />
        </Pressable>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 12,
  },
  // Continue arc card styles
  continueCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  continueContent: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  continueImage: {
    width: 100,
    height: 140,
  },
  continueImagePlaceholder: {
    width: 100,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  bookEmoji: {
    fontSize: 36,
  },
  continueInfo: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  continueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  continueLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  continueTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  episodeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Tonight's suggestion card styles
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
  },
  suggestionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionEmoji: {
    fontSize: 24,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
  },
});
