import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Heart, X } from "lucide-react-native";
import { useColors } from "@/hooks/use-colors";
import type { DiversityProfile, DiversityCategory } from "@/server/_core/diversityService";

interface RepresentationBadgeProps {
  profile: DiversityProfile;
  categories: DiversityCategory[];
  size?: "small" | "medium" | "large";
}

export default function RepresentationBadge({
  profile,
  categories,
  size = "small",
}: RepresentationBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const colors = useColors();

  const totalSelections =
    (profile.ethnicities?.length || 0) +
    (profile.familyStructures?.length || 0) +
    (profile.abilities?.length || 0) +
    (profile.culturalBackgrounds?.length || 0) +
    (profile.genderExpression?.length || 0) +
    (profile.bodyTypes?.length || 0) +
    (profile.languages?.length || 0) +
    (profile.religiousSpiritual?.length || 0);

  const getCategoryLabel = (categoryId: string, optionId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.options.find((o) => o.id === optionId)?.label || optionId;
  };

  const sizeStyles = {
    small: {
      container: "px-2 py-1",
      badge: "w-4 h-4",
      text: "text-xs",
      icon: 12,
    },
    medium: {
      container: "px-3 py-2",
      badge: "w-5 h-5",
      text: "text-sm",
      icon: 14,
    },
    large: {
      container: "px-4 py-3",
      badge: "w-6 h-6",
      text: "text-base",
      icon: 16,
    },
  };

  const style = sizeStyles[size];

  if (totalSelections === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDetails(true)}
        className={`flex-row items-center gap-1.5 rounded-full ${style.container}`}
        style={{
          backgroundColor: `${colors.primary}20`,
          borderColor: colors.primary,
          borderWidth: 1,
        }}
      >
        <View
          className={`${style.badge} rounded-full items-center justify-center`}
          style={{ backgroundColor: colors.primary }}
        >
          <Heart
            size={style.icon}
            color="white"
            strokeWidth={2.5}
            fill="white"
          />
        </View>
        <Text
          className={`font-semibold ${style.text}`}
          style={{ color: colors.primary }}
        >
          Diverse
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50">
          <View
            className="flex-1 mt-20 rounded-t-3xl"
            style={{ backgroundColor: colors.background }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b">
              <Text
                className="text-lg font-bold text-gray-900"
                style={{ color: colors.text }}
              >
                Representation Details
              </Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-4">
              {/* Ethnicities */}
              {profile.ethnicities && profile.ethnicities.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Ethnicities & Backgrounds
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.ethnicities.map((id) => (
                      <View
                        key={id}
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${colors.primary}20` }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: colors.primary }}
                        >
                          {getCategoryLabel("ethnicities", id)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Family Structures */}
              {profile.familyStructures && profile.familyStructures.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Family Structures
                  </Text>
                  <View className="gap-1">
                    {profile.familyStructures.map((id) => (
                      <Text
                        key={id}
                        className="text-sm text-gray-700"
                        style={{ color: colors.text }}
                      >
                        • {getCategoryLabel("familyStructures", id)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Abilities */}
              {profile.abilities && profile.abilities.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Abilities & Accessibility
                  </Text>
                  <View className="gap-1">
                    {profile.abilities.map((id) => (
                      <Text
                        key={id}
                        className="text-sm text-gray-700"
                        style={{ color: colors.text }}
                      >
                        • {getCategoryLabel("abilities", id)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Cultural Backgrounds */}
              {profile.culturalBackgrounds &&
                profile.culturalBackgrounds.length > 0 && (
                  <View className="mb-4">
                    <Text
                      className="font-semibold text-gray-900 mb-2"
                      style={{ color: colors.text }}
                    >
                      Cultural Traditions
                    </Text>
                    <View className="gap-1">
                      {profile.culturalBackgrounds.map((id) => (
                        <Text
                          key={id}
                          className="text-sm text-gray-700"
                          style={{ color: colors.text }}
                        >
                          • {getCategoryLabel("culturalBackgrounds", id)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

              {/* Gender Expression */}
              {profile.genderExpression && profile.genderExpression.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Gender Expression
                  </Text>
                  <View className="gap-1">
                    {profile.genderExpression.map((id) => (
                      <Text
                        key={id}
                        className="text-sm text-gray-700"
                        style={{ color: colors.text }}
                      >
                        • {getCategoryLabel("genderExpression", id)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Body Types */}
              {profile.bodyTypes && profile.bodyTypes.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Body Type Diversity
                  </Text>
                  <View className="gap-1">
                    {profile.bodyTypes.map((id) => (
                      <Text
                        key={id}
                        className="text-sm text-gray-700"
                        style={{ color: colors.text }}
                      >
                        • {getCategoryLabel("bodyTypes", id)}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="font-semibold text-gray-900 mb-2"
                    style={{ color: colors.text }}
                  >
                    Languages
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.languages.map((id) => (
                      <View
                        key={id}
                        className="px-2 py-1 rounded-full border"
                        style={{
                          borderColor: colors.primary,
                          backgroundColor: `${colors.primary}15`,
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: colors.primary }}
                        >
                          {getCategoryLabel("languages", id)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Religious/Spiritual */}
              {profile.religiousSpiritual &&
                profile.religiousSpiritual.length > 0 && (
                  <View className="mb-6">
                    <Text
                      className="font-semibold text-gray-900 mb-2"
                      style={{ color: colors.text }}
                    >
                      Spiritual Traditions
                    </Text>
                    <View className="gap-1">
                      {profile.religiousSpiritual.map((id) => (
                        <Text
                          key={id}
                          className="text-sm text-gray-700"
                          style={{ color: colors.text }}
                        >
                          • {getCategoryLabel("religiousSpiritual", id)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
