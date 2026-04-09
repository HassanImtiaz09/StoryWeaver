/**
 * Session Lobby Component
 * Pre-game lobby where participants gather before starting collaborative story
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Share,
  StyleSheet} from "react-native";
import { useCollaborativeStore } from "../lib/collaborative-store";

interface SessionLobbyProps {
  onStartSession?: () => void;
  onCancel?: () => void;
}

export const SessionLobby: React.FC<SessionLobbyProps> = ({ onStartSession, onCancel }) => {
  const session = useCollaborativeStore((state) => state.activeSession);
  const isHost = useCollaborativeStore((state) => state.getIsHost());
  const myUserId = useCollaborativeStore((state) => state.myUserId);
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No active session</Text>
      </View>
    );
  }

  const handleCopyCode = async () => {
    if (session?.sessionCode) {
      // Copy to clipboard
      try {
        await Share.share({
          message: `Join our family story session! Code: ${session.sessionCode}`,
          url: undefined,
        });
      } catch {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleStartSession = () => {
    if (isHost && onStartSession) {
      onStartSession();
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Session Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.code}>{session.sessionCode}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleCopyCode}>
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>Share this code with family members to join</Text>
      </View>

      {/* Participants Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Participants ({session.participants.length}/{session.maxParticipants})
        </Text>
        <View style={styles.participantsList}>
          {session.participants.map((participant) => (
            <View key={participant.userId} style={styles.participantItem}>
              <View
                style={[
                  styles.participantAvatar,
                  { backgroundColor: participant.color },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.displayName}</Text>
                <Text style={styles.participantRole}>
                  {participant.role === "host" ? "Host" : "Contributor"}
                </Text>
              </View>
              {participant.role === "host" && (
                <Text style={styles.hostBadge}>HOST</Text>
              )}
            </View>
          ))}
        </View>

        {session.participants.length < session.maxParticipants && (
          <Text style={styles.waitingText}>
            Waiting for more participants... ({session.maxParticipants - session.participants.length} spots left)
          </Text>
        )}
      </View>

      {/* Settings Section (Host Only) */}
      {isHost && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Max Participants</Text>
            <Text style={styles.settingValue}>{session.maxParticipants}</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Turn Time Limit</Text>
            <Text style={styles.settingValue}>
              {session.turnTimeLimit === 0 ? "Unlimited" : `${session.turnTimeLimit}s`}
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isHost && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStartSession}
            disabled={session.participants.length < 2}
          >
            <Text style={styles.buttonText}>
              Start Story Session ({session.participants.length}/2+ ready)
            </Text>
          </TouchableOpacity>
        )}

        {!isHost && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>Waiting for host to start...</Text>
            <View style={styles.loadingDots}>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Leave Session</Text>
        </TouchableOpacity>
      </View>

      {copied && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>Code copied!</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingVertical: 20,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 8,
  },
  code: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4ECDC4",
    letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: "#4ECDC4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  participantRole: {
    fontSize: 12,
    color: "#6B7280",
  },
  hostBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFA07A",
    backgroundColor: "#FFE8DD",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  waitingText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 12,
    fontStyle: "italic",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingLabel: {
    fontSize: 13,
    color: "#4B5563",
  },
  settingValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4ECDC4",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  waitingContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  waitingTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    fontSize: 16,
    color: "#4ECDC4",
  },
  notification: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#4ECDC4",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  notificationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  error: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 20,
  },
});
