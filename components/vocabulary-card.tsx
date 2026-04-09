/**
 * Vocabulary Card Component
 *
 * Shows a highlighted word with:
 * - Original word in context
 * - Translation
 * - Phonetic pronunciation guide
 * - Simple definition
 * - Swipeable for learning mode
 * - Can be saved to word bank
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from "react-native";
import { useLanguageLearning } from "@/lib/language-store";
import { useColors } from "@/hooks/use-colors";

interface VocabularyCardProps {
  word: string;
  translation: string;
  pronunciation?: string;
  definition?: string;
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function VocabularyCard({
  word,
  translation,
  pronunciation,
  definition,
  visible,
  onClose,
  onSave,
}: VocabularyCardProps) {
  const colors = useColors();
  const [isSaved, setIsSaved] = useState(false);
  const { learningLanguage } = useLanguageLearning();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const handleSave = () => {
    setIsSaved(true);
    onSave?.();
    // Reset after 1 second
    setTimeout(() => setIsSaved(false), 1000);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Word */}
            <View style={styles.wordSection}>
              <Text style={styles.word}>{word}</Text>
              {pronunciation && (
                <Text style={styles.pronunciation}>/{pronunciation}/</Text>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Translation */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Translation</Text>
              <Text style={styles.translation}>{translation}</Text>
            </View>

            {/* Definition */}
            {definition && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Definition</Text>
                <Text style={styles.definition}>{definition}</Text>
              </View>
            )}

            {/* Learning Language Note */}
            {learningLanguage && (
              <View style={[styles.section, styles.learningNote]}>
                <Text style={styles.learningNoteText}>
                  Learning <Text style={styles.learningLanguageHighlight}>{learningLanguage}</Text>?
                  Save this word to build your vocabulary!
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onClose}
              >
                <Text style={styles.actionButtonTextSecondary}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPrimary,
                  isSaved && styles.actionButtonSaved,
                ]}
                onPress={handleSave}
              >
                <Text style={styles.actionButtonText}>
                  {isSaved ? "✓ Saved" : "Save Word"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Swipe Hint */}
            <Text style={styles.swipeHint}>← Swipe to learn more words →</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Learning Mode: Swipeable vocabulary cards
 */
export function VocabularyCardStack({
  cards,
  visible,
  onClose,
}: {
  cards: Array<{
    id: string;
    word: string;
    translation: string;
    pronunciation?: string;
    definition?: string;
  }>;
  visible: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedWords, setSavedWords] = useState(new Set<string>());

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSave = () => {
    setSavedWords((prev) => new Set(prev).add(currentCard.id));
  };

  if (!currentCard) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.fullScreenOverlay}>
        <View style={styles.fullScreenContainer}>
          {/* Progress */}
          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {cards.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((currentIndex + 1) / cards.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Card */}
          <View style={styles.stackCard}>
            <View style={styles.stackWordSection}>
              <Text style={styles.stackWord}>{currentCard.word}</Text>
              {currentCard.pronunciation && (
                <Text style={styles.stackPronunciation}>
                  /{currentCard.pronunciation}/
                </Text>
              )}
            </View>

            <View style={styles.stackDivider} />

            <View style={styles.stackSection}>
              <Text style={styles.stackSectionLabel}>Translation</Text>
              <Text style={styles.stackTranslation}>{currentCard.translation}</Text>
            </View>

            {currentCard.definition && (
              <View style={styles.stackSection}>
                <Text style={styles.stackSectionLabel}>Definition</Text>
                <Text style={styles.stackDefinition}>{currentCard.definition}</Text>
              </View>
            )}

            {savedWords.has(currentCard.id) && (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>✓ Saved</Text>
              </View>
            )}
          </View>

          {/* Navigation */}
          <View style={styles.stackNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonDisabled]}>
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.navButtonText}>
                {savedWords.has(currentCard.id) ? "✓ Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNext}
            >
              <Text style={styles.navButtonText}>
                {currentIndex === cards.length - 1 ? "Finish" : "Next →"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "85%",
    maxWidth: 400,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },

  closeButtonText: {
    fontSize: 28,
    color: "#999",
    fontWeight: "300",
  },

  wordSection: {
    alignItems: "center",
    marginBottom: 16,
  },

  word: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
  },

  pronunciation: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },

  divider: {
    height: 2,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },

  section: {
    marginBottom: 16,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  translation: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2196f3",
  },

  definition: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },

  learningNote: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },

  learningNoteText: {
    fontSize: 13,
    color: "#1976d2",
    fontWeight: "500",
  },

  learningLanguageHighlight: {
    fontWeight: "700",
    color: "#0d47a1",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  actionButtonPrimary: {
    backgroundColor: "#2196f3",
    borderColor: "#2196f3",
  },

  actionButtonSaved: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  swipeHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#ccc",
    marginTop: 12,
  },

  // Stack/Learning Mode Styles
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  fullScreenContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  progress: {
    marginBottom: 16,
  },

  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },

  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2196f3",
  },

  stackCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  stackWordSection: {
    alignItems: "center",
    marginBottom: 16,
  },

  stackWord: {
    fontSize: 36,
    fontWeight: "700",
    color: "#000",
  },

  stackPronunciation: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },

  stackDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },

  stackSection: {
    marginBottom: 16,
  },

  stackSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  stackTranslation: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2196f3",
  },

  stackDefinition: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
  },

  savedBadge: {
    backgroundColor: "#c8e6c9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 12,
    alignItems: "center",
  },

  savedBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
  },

  stackNavigation: {
    flexDirection: "row",
    gap: 12,
  },

  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#2196f3",
    borderRadius: 8,
    alignItems: "center",
  },

  saveButton: {
    backgroundColor: "#ffc107",
  },

  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  navButtonDisabled: {
    opacity: 0.5,
    color: "#ccc",
  },
});
