import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { reviewEpisode } from "@/lib/parent-tools-actions";
import type { ApprovalQueueItem } from "@/lib/parent-tools-store";

interface ApprovalCardProps {
  item: ApprovalQueueItem;
  episodeTitle?: string;
  childName?: string;
  onReview?: () => void;
}

export function ApprovalCard({
  item,
  episodeTitle,
  childName,
  onReview,
}: ApprovalCardProps) {
  const colors = useColors();
  const [isReviewing, setIsReviewing] = useState(false);

  const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
    pending: { color: "#FFA500", label: "Pending Review", icon: "time" },
    approved: { color: "#22C55E", label: "Approved", icon: "checkmark-circle" },
    rejected: { color: "#EF4444", label: "Rejected", icon: "close-circle" },
    edited: { color: "#3B82F6", label: "Edited", icon: "pencil" },
  };

  const config = statusConfig[item.status];

  const handleApprove = async () => {
    Alert.alert(
      "Approve Episode",
      "This episode will be available for your child to read.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setIsReviewing(true);
            try {
              await reviewEpisode(item.id, "approved");
              Alert.alert("Success", "Episode approved!");
              onReview?.();
            } catch (error) {
              Alert.alert("Error", "Failed to approve episode");
            } finally {
              setIsReviewing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    Alert.alert(
      "Reject Episode",
      "This episode will not be available until revised.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setIsReviewing(true);
            try {
              await reviewEpisode(item.id, "rejected");
              Alert.alert("Success", "Episode rejected");
              onReview?.();
            } catch (error) {
              Alert.alert("Error", "Failed to reject episode");
            } finally {
              setIsReviewing(false);
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
      {isReviewing && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Status Badge */}
      <View style={styles.header}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${config.color}20` },
          ]}
        >
          <Ionicons name={config.icon as any} size={16} color={config.color} />
          <Text style={[styles.statusLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.episodeTitle, { color: colors.foreground }]}>
          {episodeTitle || `Episode ${item.episodeId}`}
        </Text>

        {childName && (
          <Text style={[styles.childName, { color: colors.muted }]}>
            For {childName}
          </Text>
        )}

        {item.parentNotes && (
          <View style={styles.notesSection}>
            <Text style={[styles.notesLabel, { color: colors.foreground }]}>
              Notes:
            </Text>
            <Text style={[styles.notesText, { color: colors.muted }]}>
              {item.parentNotes}
            </Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.timestamps}>
          <View style={styles.timestamp}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={[styles.timestampText, { color: colors.muted }]}>
              Submitted {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {item.reviewedAt && (
            <View style={styles.timestamp}>
              <Ionicons name="checkmark-outline" size={14} color={colors.muted} />
              <Text style={[styles.timestampText, { color: colors.muted }]}>
                Reviewed {new Date(item.reviewedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {item.status === "pending" && !isReviewing && (
        <View style={styles.actions}>
          <Pressable
            onPress={handleReject}
            disabled={isReviewing}
            style={({ pressed }) => [
              styles.rejectButton,
              { borderColor: "#EF4444", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close" size={18} color="#EF4444" />
            <Text style={[styles.rejectButtonText, { color: "#EF4444" }]}>
              Reject
            </Text>
          </Pressable>
          <Pressable
            onPress={handleApprove}
            disabled={isReviewing}
            style={({ pressed }) => [
              styles.approveButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </Pressable>
        </View>
      )}
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
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  childName: {
    fontSize: 13,
    marginBottom: 12,
  },
  notesSection: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamps: {
    gap: 8,
  },
  timestamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  approveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});
