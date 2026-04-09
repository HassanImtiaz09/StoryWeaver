import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";

interface FamilyInviteCardProps {
  inviteCode: string;
  familyMemberName: string;
  relationship: string;
  status: "pending" | "accepted" | "expired";
  onRefresh?: () => void;
}

export default function FamilyInviteCard({
  inviteCode,
  familyMemberName,
  relationship,
  status,
  onRefresh,
}: FamilyInviteCardProps) {
  const colors = useColors();
  const { fontSize } = useGrandparentStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { width } = useWindowDimensions();

  const scaledFontSize = (size: number) => Math.round(size * fontSize);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      Alert.alert("Error", "Failed to copy invite code");
    }
  };

  const handleShareCode = async () => {
    try {
      setIsSharing(true);
      const message = `Join me on StoryWeaver! Use this code to co-create stories with the children in our family: ${inviteCode}`;

      await Share.share({
        message,
        title: "Family Story Invite",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share invite code");
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "accepted":
        return colors.success;
      case "expired":
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "expired":
        return "Expired";
      default:
        return "Unknown";
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: getStatusColor(),
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Header with name and status */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: scaledFontSize(18),
              fontWeight: "600",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {familyMemberName}
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(14),
              color: colors.textSecondary,
              textTransform: "capitalize",
            }}
          >
            {relationship.replace("_", " ")}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: getStatusColor(),
            opacity: 0.2,
          }}
        >
          <Text
            style={{
              fontSize: scaledFontSize(12),
              fontWeight: "600",
              color: getStatusColor(),
              textTransform: "uppercase",
            }}
          >
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      {/* Invite Code Display */}
      <View
        style={{
          marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 8,
          padding: 16,
          borderWidth: 2,
          borderColor: colors.primary,
          borderStyle: "dashed",
        }}
      >
        <Text
          style={{
            fontSize: scaledFontSize(12),
            color: colors.textSecondary,
            marginBottom: 8,
            fontWeight: "500",
          }}
        >
          INVITE CODE
        </Text>
        <Text
          style={{
            fontSize: scaledFontSize(32),
            fontWeight: "700",
            color: colors.primary,
            letterSpacing: 2,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          {inviteCode}
        </Text>
      </View>

      {/* Action Buttons */}
      <View
        style={{
          marginTop: 16,
          flexDirection: "row",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={handleCopyCode}
          disabled={status === "expired"}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: isCopied ? colors.success : colors.primary,
            opacity: status === "expired" ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              fontSize: scaledFontSize(14),
              fontWeight: "600",
              color: "white",
              textAlign: "center",
            }}
          >
            {isCopied ? "Copied!" : "Copy Code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareCode}
          disabled={isSharing || status === "expired"}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: colors.secondary,
            opacity: status === "expired" ? 0.5 : 1,
          }}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text
              style={{
                fontSize: scaledFontSize(14),
                fontWeight: "600",
                color: "white",
                textAlign: "center",
              }}
            >
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Helper Text */}
      {status === "pending" && (
        <Text
          style={{
            marginTop: 12,
            fontSize: scaledFontSize(12),
            color: colors.warning,
            fontStyle: "italic",
          }}
        >
          Share this code with {familyMemberName} to invite them to co-create stories.
        </Text>
      )}

      {status === "accepted" && (
        <Text
          style={{
            marginTop: 12,
            fontSize: scaledFontSize(12),
            color: colors.success,
            fontStyle: "italic",
          }}
        >
          {familyMemberName} has accepted the invite and can now create stories with you!
        </Text>
      )}

      {status === "expired" && (
        <Text
          style={{
            marginTop: 12,
            fontSize: scaledFontSize(12),
            color: colors.error,
            fontStyle: "italic",
          }}
        >
          This invite code has expired. Create a new invite to add {familyMemberName}.
        </Text>
      )}
    </View>
  );
}
