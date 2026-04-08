import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useParentToolsStore } from "@/lib/parent-tools-store";
import type { CustomElement } from "@/lib/parent-tools-store";

interface CustomElementCardProps {
  element: CustomElement;
  onEdit?: (element: CustomElement) => void;
  onDelete?: (elementId: number) => void;
}

export function CustomElementCard({
  element,
  onEdit,
  onDelete,
}: CustomElementCardProps) {
  const colors = useColors();
  const deleteCustomElement = useParentToolsStore(
    (state) => state.deleteCustomElement
  );
  const isLoading = useParentToolsStore((state) => state.isLoading);
  const [isDeleting, setIsDeleting] = useState(false);

  const elementTypeEmoji: Record<string, string> = {
    character: "👤",
    location: "🏠",
    moral: "✨",
    pet: "🐾",
    object: "🎁",
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Element",
      `Are you sure you want to delete "${element.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteCustomElement(element.id);
              onDelete?.(element.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete element");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {isDeleting && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {element.imageUrl && (
        <Image source={{ uri: element.imageUrl }} style={styles.image} />
      )}

      <View
        style={[
          styles.emoji,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text style={styles.emojiText}>
          {elementTypeEmoji[element.elementType] || "⭐"}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {element.name}
            </Text>
            <Text style={[styles.type, { color: colors.muted }]}>
              {element.elementType}
            </Text>
          </View>

          {!isDeleting && (
            <View style={styles.actions}>
              {onEdit && (
                <Pressable
                  onPress={() => onEdit(element)}
                  disabled={isLoading || isDeleting}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={handleDelete}
                disabled={isLoading || isDeleting}
                style={({ pressed }) => [
                  styles.actionButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="trash" size={18} color="#EF4444" />
              </Pressable>
            </View>
          )}
        </View>

        {element.description && (
          <Text
            style={[styles.description, { color: colors.muted }]}
            numberOfLines={2}
          >
            {element.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 150,
  },
  emoji: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 24,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});
