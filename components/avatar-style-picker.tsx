import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import type { ArtStyle } from "@/lib/character-avatar";

interface ArtStyleOption {
  id: ArtStyle;
  label: string;
  description: string;
  emoji: string;
}

const ART_STYLES: ArtStyleOption[] = [
  {
    id: "watercolor",
    label: "Watercolor Dream",
    description: "Soft, dreamy watercolor style perfect for bedtime",
    emoji: "🎨",
  },
  {
    id: "cartoon",
    label: "Cartoon Fun",
    description: "Bright and playful cartoon illustration",
    emoji: "😊",
  },
  {
    id: "anime",
    label: "Anime Adventure",
    description: "Expressive anime-inspired character design",
    emoji: "✨",
  },
  {
    id: "storybook-classic",
    label: "Classic Storybook",
    description: "Traditional fairytale illustration style",
    emoji: "📖",
  },
  {
    id: "pixel-art",
    label: "Pixel Quest",
    description: "Retro pixel art character style",
    emoji: "8",
  },
];

interface AvatarStylePickerProps {
  selectedStyle: ArtStyle;
  onStyleSelected: (style: ArtStyle) => void;
}

export function AvatarStylePicker({
  selectedStyle,
  onStyleSelected,
}: AvatarStylePickerProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = screenWidth - 40; // Account for padding

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Choose an Art Style
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          How should your character look?
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {ART_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <Pressable
              key={style.id}
              onPress={() => onStyleSelected(style.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  width: cardWidth,
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 3 : 1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.selectedBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </View>
              )}

              <Text style={styles.emoji}>{style.emoji}</Text>

              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {style.label}
              </Text>

              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                {style.description}
              </Text>

              <View style={styles.previewBox}>
                <Text style={styles.previewText}>Character Preview</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Ionicons name="information-circle" size={16} color={colors.muted} />
        <Text style={[styles.footerText, { color: colors.muted }]}>
          You can change the style later if you'd like
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 20,
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
    paddingRight: 20,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 12,
    padding: 4,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  previewBox: {
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: "rgba(100, 100, 100, 0.1)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    fontSize: 12,
    color: "#888888",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 12,
    flex: 1,
  },
});
