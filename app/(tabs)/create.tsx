import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getLocalChildren, type LocalChild } from "@/lib/onboarding-store";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  emoji: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "new-story",
    title: "New Story",
    description: "Generate a personalized bedtime story",
    icon: "sparkles",
    color: "#FF6B6B",
    route: "/new-story",
    emoji: "✨",
  },
  {
    id: "collaborative",
    title: "Collaborative Story",
    description: "Create stories together with family",
    icon: "people",
    color: "#48C9B0",
    route: "/collaborative-story",
    emoji: "👨‍👩‍👧‍👦",
  },
  {
    id: "character",
    title: "Create Character",
    description: "Design a custom character or avatar",
    icon: "body",
    color: "#9B59B6",
    route: "/create-character",
    emoji: "🎨",
  },
];

export default function CreateScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LocalChild | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
    if (kids.length > 0) {
      setSelectedChild(kids[0]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOptionPress = (option: CreateOption) => {
    if (selectedChild) {
      router.push({
        pathname: option.route as any,
        params: {
          childId: selectedChild.id,
          childName: selectedChild.name,
        },
      });
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  if (children.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="create-outline" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Child Profile
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create a child profile first to start creating stories
          </Text>
          <Pressable
            onPress={() => router.push("/create-child")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.emptyButtonText}>Create Profile</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose what to create for {selectedChild?.name}
          </Text>
        </Animated.View>

        {/* Child Selector */}
        {children.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.childSelector}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  onPress={() => setSelectedChild(child)}
                  style={[
                    styles.childChip,
                    {
                      backgroundColor:
                        selectedChild?.id === child.id
                          ? colors.primary
                          : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      {
                        color:
                          selectedChild?.id === child.id ? "#0A0E1A" : colors.text,
                      },
                    ]}
                  >
                    {child.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Create Options Grid */}
        <View style={styles.optionsGrid}>
          {CREATE_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(150 + index * 100).duration(400)}
            >
              <Pressable
                onPress={() => handleOptionPress(option)}
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <LinearGradient
                  colors={[option.color, option.color + "CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                    <View style={styles.optionArrow}>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Tips Section */}
        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.tipsSection}
        >
          <View style={[styles.tipCard, { backgroundColor: "rgba(255,215,0,0.1)" }]}>
            <Ionicons name="lightbulb-outline" size={20} color="#FFD700" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Creating Stories
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Each story is personalized based on {selectedChild?.name}'s interests,
                age, and preferences for the perfect bedtime experience.
              </Text>
            </View>
          </View>
        </Animated.View>

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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  childSelector: {
    marginBottom: 20,
  },
  childChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  optionGradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: "space-between",
  },
  optionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  optionEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
    marginBottom: 12,
  },
  optionArrow: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 8,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#0A0E1A",
    fontSize: 14,
    fontWeight: "700",
  },
});
