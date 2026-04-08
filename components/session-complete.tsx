/**
 * Session Complete Screen
 * Shows the final collaborative story and options to save/share
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from "react-native";
import { useCollaborativeStore } from "../lib/collaborative-store";

interface SessionCompleteProps {
  onPlayAgain?: () => void;
  onSaveToLibrary?: () => Promise<void>;
  onPrintAsBook?: () => void;
  onClose?: () => void;
}

export const SessionComplete: React.FC<SessionCompleteProps> = ({
  onPlayAgain,
  onSaveToLibrary,
  onPrintAsBook,
  onClose,
}) => {
  const session = useCollaborativeStore((state) => state.activeSession);
  const mergedStory = useCollaborativeStore((state) => state.getMergedStory());
  const [isSaving, setIsSaving] = useState(false);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Session data not found</Text>
      </View>
    );
  }

  const handleSaveToLibrary = async () => {
    if (!onSaveToLibrary) return;

    try {
      setIsSaving(true);
      await onSaveToLibrary();
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `We created a story together! Check out this collaborative story created by ${session.participants.map((p) => p.displayName).join(", ")} on StoryWeaver.`,
        title: "Our Collaborative Story",
      });
    } catch {
      // Error handled silently
    }
  };

  const calculateDuration = (): string => {
    if (!session.createdAt || !session.completedAt) return "Unknown";

    const start = new Date(session.createdAt);
    const end = new Date(session.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Less than 1 minute";
    if (diffMins === 1) return "1 minute";
    return `${diffMins} minutes`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Celebration Header */}
      <View style={styles.celebrationHeader}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
        <Text style={styles.celebrationTitle}>Story Complete!</Text>
        <Text style={styles.celebrationSubtitle}>
          What a wonderful collaborative adventure
        </Text>
      </View>

      {/* Full Story Preview */}
      <View style={styles.storyPreviewSection}>
        <Text style={styles.sectionTitle}>Your Story</Text>
        <View style={styles.storyPreviewBox}>
          <Text style={styles.storyPreviewText}>{mergedStory}</Text>
        </View>
      </View>

      {/* Story Credits */}
      <View style={styles.creditsSection}>
        <Text style={styles.sectionTitle}>A Story By</Text>
        <View style={styles.creditsContainer}>
          {session.participants.map((participant) => (
            <View key={participant.userId} style={styles.creditItem}>
              <View
                style={[
                  styles.creditAvatar,
                  { backgroundColor: participant.color },
                ]}
              >
                <Text style={styles.creditInitial}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.creditInfo}>
                <Text style={styles.creditName}>{participant.displayName}</Text>
                <Text style={styles.creditTurns}>
                  {participant.turnsCompleted} turn{participant.turnsCompleted !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Story Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Story Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{session.storySegments.length}</Text>
            <Text style={styles.statLabel}>Pages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {session.storySegments.reduce((sum, seg) => sum + seg.text.split(" ").length, 0)}
            </Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{calculateDuration()}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{session.participants.length}</Text>
            <Text style={styles.statLabel}>Contributors</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSaveToLibrary}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.buttonEmoji}>📚</Text>
              <Text style={styles.primaryButtonText}>Save to My Library</Text>
            </>
          )}
        </TouchableOpacity>

        {onPrintAsBook && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onPrintAsBook}
          >
            <Text style={styles.buttonEmoji}>📖</Text>
            <Text style={styles.secondaryButtonText}>Print as Book</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.tertiaryButton} onPress={handleShare}>
          <Text style={styles.buttonEmoji}>🔗</Text>
          <Text style={styles.tertiaryButtonText}>Share</Text>
        </TouchableOpacity>

        {onPlayAgain && (
          <TouchableOpacity
            style={[styles.button, styles.playAgainButton]}
            onPress={onPlayAgain}
          >
            <Text style={styles.buttonEmoji}>🎮</Text>
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  celebrationHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#4ECDC4",
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
    textAlign: "center",
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  storyPreviewSection: {
    marginVertical: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  storyPreviewBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
    maxHeight: 300,
  },
  storyPreviewText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  creditsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  creditsContainer: {
    gap: 12,
  },
  creditItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  creditAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  creditInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  creditInfo: {
    flex: 1,
  },
  creditName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  creditTurns: {
    fontSize: 11,
    color: "#6B7280",
  },
  statsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4ECDC4",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  buttonSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#4ECDC4",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#45B7D1",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tertiaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  playAgainButton: {
    backgroundColor: "#FFA07A",
  },
  playAgainButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonEmoji: {
    fontSize: 16,
  },
  closeButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  bottomSpacing: {
    height: 20,
  },
  error: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 20,
  },
};
