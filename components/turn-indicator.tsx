/**
 * Turn Indicator Widget
 * Shows whose turn it is and lets host skip turns
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useCollaborativeStore } from "../lib/collaborative-store";

interface TurnIndicatorProps {
  onSkipTurn?: () => Promise<void>;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ onSkipTurn }) => {
  const session = useCollaborativeStore((state) => state.activeSession);
  const isHost = useCollaborativeStore((state) => state.getIsHost());
  const isMyTurn = useCollaborativeStore((state) => state.isMyTurn);
  const [isSkipping, setIsSkipping] = useState(false);

  const glowAnim = useRef(new Animated.Value(0)).current;

  // Glow animation for current participant
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const handleSkipTurn = async () => {
    if (!onSkipTurn) return;

    try {
      setIsSkipping(true);
      await onSkipTurn();
    } finally {
      setIsSkipping(false);
    }
  };

  if (!session) {
    return null;
  }

  const currentTurnIndex = session.currentTurnIndex % session.turnOrder.length;
  const currentParticipantId = session.turnOrder[currentTurnIndex];
  const currentParticipant = session.participants.find(
    (p) => p.userId === currentParticipantId
  );

  return (
    <View style={styles.container}>
      {/* Current Turn Indicator */}
      <View style={styles.currentTurnSection}>
        {isMyTurn && (
          <Animated.View
            style={[
              styles.turnBanner,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
          >
            <Text style={styles.turnBannerText}>Your turn!</Text>
          </Animated.View>
        )}

        {currentParticipant && !isMyTurn && (
          <View style={styles.currentTurnInfo}>
            <View
              style={[
                styles.currentAvatar,
                { backgroundColor: currentParticipant.color },
              ]}
            >
              <Text style={styles.avatarInitial}>
                {currentParticipant.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.currentInfoText}>
              <Text style={styles.currentTurnLabel}>Now Telling:</Text>
              <Text style={styles.currentTurnName}>
                {currentParticipant.displayName}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Turn Order Carousel */}
      <View style={styles.carouselSection}>
        <Text style={styles.carouselLabel}>Turn Order</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        >
          <View style={styles.avatarRow}>
            {session.participants.map((participant, idx) => {
              const isCurrentTurn =
                participant.userId === currentParticipantId;

              return (
                <Animated.View
                  key={participant.userId}
                  style={[
                    styles.avatarContainer,
                    isCurrentTurn && {
                      transform: [
                        {
                          scale: glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.15],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.participantAvatar,
                      {
                        backgroundColor: participant.color,
                        borderWidth: isCurrentTurn ? 3 : 1,
                        borderColor: isCurrentTurn ? "#FFA07A" : "#D1D5DB",
                      },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>
                      {participant.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.participantLabel,
                      isCurrentTurn && styles.participantLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {participant.displayName}
                  </Text>
                  {participant.turnsCompleted > 0 && (
                    <Text style={styles.turnCount}>
                      {participant.turnsCompleted}x
                    </Text>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Skip Turn Button (Host Only) */}
      {isHost && (
        <View style={styles.hostControls}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipTurn}
            disabled={isSkipping}
          >
            <Text style={styles.skipButtonText}>
              {isSkipping ? "Skipping..." : "Skip Turn (Host)"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pages</Text>
          <Text style={styles.statValue}>{session.storySegments.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Contributors</Text>
          <Text style={styles.statValue}>{session.participants.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Status</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  session.status === "active"
                    ? "#10B981"
                    : session.status === "paused"
                      ? "#F59E0B"
                      : "#6B7280",
              },
            ]}
          >
            {session.status === "active"
              ? "Live"
              : session.status === "paused"
                ? "Paused"
                : "Waiting"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  currentTurnSection: {
    marginBottom: 16,
  },
  turnBanner: {
    backgroundColor: "#4ECDC4",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  turnBannerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  currentTurnInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  currentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  currentInfoText: {
    flex: 1,
  },
  currentTurnLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  currentTurnName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  carouselSection: {
    marginBottom: 16,
  },
  carouselLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  carousel: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  avatarRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatarContainer: {
    alignItems: "center",
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  participantLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 50,
  },
  participantLabelActive: {
    fontWeight: "700",
    color: "#1F2937",
  },
  turnCount: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFA07A",
    backgroundColor: "#FFE8DD",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    marginTop: 2,
  },
  hostControls: {
    marginBottom: 16,
  },
  skipButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginHorizontal: 0,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
});
