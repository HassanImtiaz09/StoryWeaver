import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const FEEDBACK_OPTIONS = [
  { emoji: "😍", label: "Loved it!", value: 5 },
  { emoji: "😊", label: "Great!", value: 4 },
  { emoji: "🙂", label: "Good", value: 3 },
  { emoji: "😐", label: "Okay", value: 2 },
  { emoji: "😕", label: "Not for me", value: 1 },
];

interface StoryFeedbackModalProps {
  visible: boolean;
  childName: string;
  storyTitle?: string;
  onSubmit: (rating: number) => void;
  onDismiss: () => void;
  accentColor?: string;
}

/**
 * Child-friendly story feedback modal shown at the end of a story.
 * Uses large emoji options that young readers can easily tap.
 */
export function StoryFeedbackModal({
  visible,
  childName,
  storyTitle,
  onSubmit,
  onDismiss,
  accentColor = "#FFD700",
}: StoryFeedbackModalProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRating(value);
  };

  const handleSubmit = () => {
    if (selectedRating === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    onSubmit(selectedRating);

    // Auto-dismiss after celebration
    setTimeout(() => {
      setSubmitted(false);
      setSelectedRating(null);
      onDismiss();
    }, 1800);
  };

  const handleSkip = () => {
    setSelectedRating(null);
    setSubmitted(false);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify().damping(14)}
          style={styles.card}
        >
          {submitted ? (
            /* Thank you state */
            <Animated.View entering={ZoomIn.springify()} style={styles.thankYouContainer}>
              <Text style={styles.thankYouEmoji}>🌟</Text>
              <Text style={styles.thankYouText}>Thank you, {childName}!</Text>
              <Text style={styles.thankYouSubtext}>
                Your feedback helps us make better stories
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Header */}
              <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
                <Text style={styles.headerEmoji}>📖</Text>
                <Text style={styles.headerTitle}>
                  How was this story?
                </Text>
                {storyTitle && (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {storyTitle}
                  </Text>
                )}
              </Animated.View>

              {/* Emoji options */}
              <View style={styles.optionsRow}>
                {FEEDBACK_OPTIONS.map((option, index) => {
                  const isSelected = selectedRating === option.value;
                  return (
                    <Animated.View
                      key={option.value}
                      entering={FadeInUp.delay(150 + index * 80).springify()}
                    >
                      <Pressable
                        onPress={() => handleSelect(option.value)}
                        style={({ pressed }) => [
                          styles.emojiButton,
                          isSelected && [
                            styles.emojiButtonSelected,
                            { borderColor: accentColor },
                          ],
                          pressed && { transform: [{ scale: 0.9 }] },
                        ]}
                        accessibilityLabel={`Rate story: ${option.label}`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.emoji,
                            isSelected && styles.emojiSelected,
                          ]}
                        >
                          {option.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.emojiLabel,
                            isSelected && { color: accentColor, fontWeight: "700" },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={selectedRating === null}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: accentColor },
                    selectedRating === null && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#0A0E1A" />
                  <Text style={styles.submitText}>Submit</Text>
                </Pressable>

                <Pressable
                  onPress={handleSkip}
                  style={({ pressed }) => [
                    styles.skipButton,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  emojiButton: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 56,
  },
  emojiButtonSelected: {
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  emoji: {
    fontSize: 32,
  },
  emojiSelected: {
    fontSize: 38,
  },
  emojiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0E1A",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  thankYouContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  thankYouEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  thankYouText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  thankYouSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
