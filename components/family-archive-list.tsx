import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";

interface FamilyStory {
  id: number;
  title?: string;
  hostUserId: number;
  familyMemberUserId: number;
  childId: number;
  status: "active" | "paused" | "completed";
  memoryCount: number;
  createdAt: Date;
  completedAt?: Date | null;
  memoryCount: number;
}

interface ContributorInfo {
  userId: number;
  name: string;
  relationship: string;
}

interface FamilyArchiveListProps {
  stories: FamilyStory[];
  contributors?: Record<number, ContributorInfo>;
  isLoading?: boolean;
  onSelectStory?: (storyId: number) => void;
  onPlayNarration?: (storyId: number) => void;
  filterByFamilyMemberId?: number;
  onFilterChange?: (familyMemberId?: number) => void;
}

export default function FamilyArchiveList({
  stories,
  contributors = {},
  isLoading = false,
  onSelectStory,
  onPlayNarration,
  filterByFamilyMemberId,
  onFilterChange,
}: FamilyArchiveListProps) {
  const colors = useColors();
  const { fontSize } = useGrandparentStore();
  const { width } = useWindowDimensions();
  const [expandedStoryId, setExpandedStoryId] = useState<number | null>(null);

  const scaledFontSize = (size: number) => Math.round(size * fontSize);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "active":
        return colors.warning;
      case "paused":
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredStories = filterByFamilyMemberId
    ? stories.filter((s) => s.familyMemberUserId === filterByFamilyMemberId)
    : stories;

  const getContributorName = (userId: number) => {
    return contributors[userId]?.name || `Contributor ${userId}`;
  };

  const renderStoryItem = ({ item: story }: { item: FamilyStory }) => {
    const isExpanded = expandedStoryId === story.id;
    const contributor = contributors[story.familyMemberUserId];

    return (
      <TouchableOpacity
        onPress={() => setExpandedStoryId(isExpanded ? null : story.id)}
        activeOpacity={0.7}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            marginBottom: 12,
            overflow: "hidden",
            borderLeftWidth: 4,
            borderLeftColor: getStatusColor(story.status),
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Story Header */}
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: scaledFontSize(16),
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  Story #{story.id}
                </Text>
                {contributor && (
                  <Text
                    style={{
                      fontSize: scaledFontSize(13),
                      color: colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    With {contributor.name} ({contributor.relationship})
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: scaledFontSize(12),
                    color: colors.textSecondary,
                  }}
                >
                  Created {formatDate(story.createdAt)}
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: getStatusColor(story.status),
                  opacity: 0.2,
                }}
              >
                <Text
                  style={{
                    fontSize: scaledFontSize(11),
                    fontWeight: "600",
                    color: getStatusColor(story.status),
                    textTransform: "uppercase",
                  }}
                >
                  {story.status}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                paddingVertical: 12,
                paddingHorizontal: 8,
                backgroundColor: colors.background,
                borderRadius: 8,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: scaledFontSize(18),
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {story.memoryCount}
                </Text>
                <Text
                  style={{
                    fontSize: scaledFontSize(11),
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Memories
                </Text>
              </View>
            </View>
          </View>

          {/* Expanded Details */}
          {isExpanded && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: colors.background,
              }}
            >
              <Text
                style={{
                  fontSize: scaledFontSize(13),
                  color: colors.textSecondary,
                  marginBottom: 12,
                  fontStyle: "italic",
                }}
              >
                {story.memoryCount} memory prompt{story.memoryCount !== 1 ? "s" : ""}{" "}
                woven into this story
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {onSelectStory && (
                  <TouchableOpacity
                    onPress={() => onSelectStory(story.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: scaledFontSize(12),
                        fontWeight: "600",
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      View Story
                    </Text>
                  </TouchableOpacity>
                )}

                {onPlayNarration && (
                  <TouchableOpacity
                    onPress={() => onPlayNarration(story.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      backgroundColor: colors.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: scaledFontSize(12),
                        fontWeight: "600",
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      🎵 Listen
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Filter Tags */}
      {filterByFamilyMemberId && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: scaledFontSize(13),
              color: colors.textSecondary,
              marginRight: 8,
            }}
          >
            Filtered by:
          </Text>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: colors.primary,
            }}
          >
            <Text
              style={{
                fontSize: scaledFontSize(12),
                fontWeight: "600",
                color: "white",
              }}
            >
              {getContributorName(filterByFamilyMemberId)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onFilterChange?.(undefined)}
            style={{ marginLeft: "auto" }}
          >
            <Text
              style={{
                fontSize: scaledFontSize(12),
                color: colors.primary,
                fontWeight: "600",
              }}
            >
              Clear Filter
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stories List */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredStories.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              fontSize: scaledFontSize(18),
              fontWeight: "600",
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No Stories Yet
          </Text>
          <Text
            style={{
              fontSize: scaledFontSize(14),
              color: colors.textSecondary,
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            {filterByFamilyMemberId
              ? "This family member hasn't co-created any stories yet."
              : "Start a co-creation session to begin building your family story collection!"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
          scrollEnabled
        />
      )}
    </View>
  );
}
