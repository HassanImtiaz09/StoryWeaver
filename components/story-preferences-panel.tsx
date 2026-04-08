import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useParentToolsStore } from "@/lib/parent-tools-store";
import { CustomElementCard } from "./custom-element-card";

interface StoryPreferencesPanelProps {
  childId: number;
  childName: string;
  onAddElement?: () => void;
}

export function StoryPreferencesPanel({
  childId,
  childName,
  onAddElement,
}: StoryPreferencesPanelProps) {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "character" | "location" | "moral" | "pet" | "object"
  >("all");

  const customElements = useParentToolsStore(
    (state) => state.customElements.get(childId) || []
  );
  const fetchCustomElements = useParentToolsStore(
    (state) => state.fetchCustomElements
  );
  const isLoading = useParentToolsStore((state) => state.isLoading);

  useEffect(() => {
    fetchCustomElements(childId);
  }, [childId]);

  const categoryInfo: Record<string, { label: string; emoji: string; color: string }> = {
    character: {
      label: "Characters",
      emoji: "👤",
      color: "#3B82F6",
    },
    location: {
      label: "Locations",
      emoji: "🏠",
      color: "#8B5CF6",
    },
    moral: {
      label: "Morals & Lessons",
      emoji: "✨",
      color: "#EC4899",
    },
    pet: {
      label: "Pets",
      emoji: "🐾",
      color: "#F59E0B",
    },
    object: {
      label: "Objects",
      emoji: "🎁",
      color: "#10B981",
    },
  };

  const categories = Object.entries(categoryInfo).map(([id, info]) => ({
    id: id as "character" | "location" | "moral" | "pet" | "object",
    ...info,
  }));

  const filteredElements =
    selectedCategory === "all"
      ? customElements
      : customElements.filter((e) => e.elementType === selectedCategory);

  const elementsByCategory = {
    character: customElements.filter((e) => e.elementType === "character"),
    location: customElements.filter((e) => e.elementType === "location"),
    moral: customElements.filter((e) => e.elementType === "moral"),
    pet: customElements.filter((e) => e.elementType === "pet"),
    object: customElements.filter((e) => e.elementType === "object"),
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Story Elements for {childName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            These custom elements will be included in AI-generated stories
          </Text>
        </View>
        {onAddElement && (
          <Pressable
            onPress={onAddElement}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        <Pressable
          onPress={() => setSelectedCategory("all")}
          style={({ pressed }) => [
            styles.categoryChip,
            {
              backgroundColor:
                selectedCategory === "all"
                  ? colors.primary
                  : colors.surface,
              borderColor:
                selectedCategory === "all" ? colors.primary : colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[
              styles.categoryChipText,
              {
                color:
                  selectedCategory === "all"
                    ? "#FFFFFF"
                    : colors.foreground,
              },
            ]}
          >
            All ({customElements.length})
          </Text>
        </Pressable>

        {categories.map((category) => {
          const count = elementsByCategory[category.id].length;
          return (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? colors.primary
                      : colors.surface,
                  borderColor:
                    selectedCategory === category.id
                      ? colors.primary
                      : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategory === category.id
                        ? "#FFFFFF"
                        : colors.foreground,
                  },
                ]}
              >
                {category.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Elements List */}
      {isLoading && filteredElements.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading elements...
          </Text>
        </View>
      ) : filteredElements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            {selectedCategory === "all"
              ? "✨"
              : categoryInfo[selectedCategory]?.emoji}
          </Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No elements yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {onAddElement
              ? "Add custom elements to personalize your child's stories"
              : "Your child has no custom elements yet"}
          </Text>
          {onAddElement && (
            <Pressable
              onPress={onAddElement}
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Element</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredElements}
          renderItem={({ item }) => (
            <View style={styles.elementItem}>
              <CustomElementCard element={item} />
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  elementItem: {
    marginBottom: 12,
  },
});
