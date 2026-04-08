import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";

interface FamilyMemberCardProps {
  id: number;
  name: string;
  relationship: string;
  lastActive?: Date;
  storiesCoCreated?: number;
  avatarUrl?: string;
  onStartStory: (familyMemberId: number) => void;
}

export default function FamilyMemberCard({
  id,
  name,
  relationship,
  lastActive,
  storiesCoCreated = 0,
  avatarUrl,
  onStartStory,
}: FamilyMemberCardProps) {
  const { colors } = useColors();
  const { fontSize } = useGrandparentStore();
  const { width } = useWindowDimensions();

  const scaledFontSize = (size: number) => Math.round(size * fontSize);

  const getRelationshipEmoji = (rel: string) => {
    const emojiMap: Record<string, string> = {
      grandparent: "👵",
      aunt_uncle: "👨",
      cousin: "👦",
      family_friend: "🤝",
      parent: "👨",
      other: "💙",
    };
    return emojiMap[rel] || "👤";
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Profile Section */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: scaledFontSize(60),
            height: scaledFontSize(60),
            borderRadius: scaledFontSize(30),
            backgroundColor: colors.primary,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
            overflow: "hidden",
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <Text style={{ fontSize: scaledFontSize(32) }}>
              {getRelationshipEmoji(relationship)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: scaledFontSize(18),
              fontWeight: "700",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {name}
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(14),
              color: colors.textSecondary,
              textTransform: "capitalize",
              marginBottom: 4,
            }}
          >
            {relationship.replace("_", " ")}
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(12),
              color: colors.textSecondary,
            }}
          >
            Active {formatLastActive(lastActive)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 12,
          paddingHorizontal: 8,
          backgroundColor: colors.background,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: scaledFontSize(20),
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            {storiesCoCreated}
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(12),
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            Stories Together
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        onPress={() => onStartStory(id)}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          backgroundColor: colors.primary,
        }}
      >
        <Text
          style={{
            fontSize: scaledFontSize(14),
            fontWeight: "700",
            color: "white",
            textAlign: "center",
          }}
        >
          Start Story Together
        </Text>
      </TouchableOpacity>
    </View>
  );
}
