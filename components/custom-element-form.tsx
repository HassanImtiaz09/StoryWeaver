import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useParentToolsStore } from "@/lib/parent-tools-store";
import type { CustomElement } from "@/lib/parent-tools-store";

interface CustomElementFormProps {
  childId: number;
  element?: CustomElement;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomElementForm({
  childId,
  element,
  onSuccess,
  onCancel,
}: CustomElementFormProps) {
  const colors = useColors();
  const [elementType, setElementType] = useState<
    "character" | "location" | "moral" | "pet" | "object"
  >(element?.elementType || "character");
  const [name, setName] = useState(element?.name || "");
  const [description, setDescription] = useState(element?.description || "");
  const [imageUrl, setImageUrl] = useState(element?.imageUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCustomElement = useParentToolsStore(
    (state) => state.createCustomElement
  );
  const updateCustomElement = useParentToolsStore(
    (state) => state.updateCustomElement
  );
  const storeIsLoading = useParentToolsStore((state) => state.isLoading);

  const elementTypeEmoji: Record<string, string> = {
    character: "👤",
    location: "🏠",
    moral: "✨",
    pet: "🐾",
    object: "🎁",
  };

  const elementTypes = [
    { id: "character", label: "Character", emoji: "👤" },
    { id: "location", label: "Location", emoji: "🏠" },
    { id: "moral", label: "Moral/Lesson", emoji: "✨" },
    { id: "pet", label: "Pet", emoji: "🐾" },
    { id: "object", label: "Object", emoji: "🎁" },
  ] as const;

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name for this element");
      return;
    }

    setIsSubmitting(true);
    try {
      if (element) {
        // Update existing
        await updateCustomElement(element.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        });
      } else {
        // Create new
        await createCustomElement(
          childId,
          elementType,
          name.trim(),
          description.trim() || undefined,
          imageUrl.trim() || undefined
        );
      }
      onSuccess?.();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save element"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Element Type Selector */}
      {!element && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Type of Element
          </Text>
          <View style={styles.typeGrid}>
            {elementTypes.map((type) => (
              <Pressable
                key={type.id}
                onPress={() =>
                  setElementType(
                    type.id as
                      | "character"
                      | "location"
                      | "moral"
                      | "pet"
                      | "object"
                  )
                }
                style={({ pressed }) => [
                  styles.typeButton,
                  {
                    backgroundColor:
                      elementType === type.id
                        ? colors.primary
                        : colors.surface,
                    borderColor:
                      elementType === type.id ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    {
                      color:
                        elementType === type.id
                          ? "#FFFFFF"
                          : colors.foreground,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Name Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Enter name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          editable={!isSubmitting}
          maxLength={200}
        />
        <Text style={[styles.charCount, { color: colors.muted }]}>
          {name.length}/200
        </Text>
      </View>

      {/* Description Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          Description (Optional)
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Add details about this element..."
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          editable={!isSubmitting}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.muted }]}>
          {description.length}/500
        </Text>
      </View>

      {/* Image URL Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          Image URL (Optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="https://..."
          placeholderTextColor={colors.muted}
          value={imageUrl}
          onChangeText={setImageUrl}
          editable={!isSubmitting}
          autoCapitalize="none"
        />
        {imageUrl.trim() && (
          <Text
            style={[styles.hint, { color: colors.muted }]}
            numberOfLines={1}
          >
            Preview: {imageUrl.trim()}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
              Cancel
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || !name.trim()}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: !name.trim() || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {element ? "Update" : "Create"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
