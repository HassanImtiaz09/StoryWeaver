// @ts-nocheck
import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { Users, Heart, Sparkles } from "lucide-react-native";
import { useColors } from "@/hooks/use-colors";
import type { DiversityProfile, DiversityCategory } from "@/server/_core/diversityService";

interface RepresentationPreviewProps {
  profile: DiversityProfile;
  categories: DiversityCategory[];
}

const EXAMPLE_NAMES_BY_ETHNICITY: Record<string, string[]> = {
  caucasian: ["Emma", "Oliver", "Sophie", "James"],
  african: ["Amara", "Jamal", "Zara", "Kai"],
  asian: ["Priya", "Min-jun", "Yuki", "Arjun"],
  latinx: ["Sofia", "Diego", "Lucia", "Miguel"],
  middle_eastern: ["Aisha", "Rashid", "Leila", "Omar"],
  indigenous: ["Winona", "Takoda", "Aiyana", "Tokala"],
  pacific: ["Moana", "Aiono", "Keahi", "Nalani"],
  multiracial: ["Mira", "Ezra", "Asha", "Lucas"],
};

const FAMILY_EXAMPLES: Record<string, string> = {
  "two-parent": "Raised by two married parents who both work",
  "single-parent": "Raised by one parent who works hard every day",
  "grandparent-led": "Living with and cared for by grandparents",
  foster: "In a loving foster family after being in the system",
  "same-sex": "Has two moms or two dads who love them very much",
  blended: "Has stepsisters and stepsiblings from blended family",
  multigenerational: "Living in a house with parents and grandparents",
  extended: "Raised by aunts, uncles, and cousins as primary caregivers",
};

export default function RepresentationPreview({
  profile,
  categories,
}: RepresentationPreviewProps) {
  const colors = useColors();

  const exampleCharacters = useMemo(() => {
    const ethnicities = profile.ethnicities.slice(0, 3);
    const names: string[] = [];

    ethnicities.forEach((ethnicity) => {
      const options = EXAMPLE_NAMES_BY_ETHNICITY[ethnicity];
      if (options && options.length > 0) {
        names.push(options[Math.floor(Math.random() * options.length)]);
      }
    });

    return names.slice(0, 3);
  }, [profile.ethnicities]);

  const exampleFamilies = useMemo(() => {
    return profile.familyStructures.slice(0, 2).map((fs) => FAMILY_EXAMPLES[fs]);
  }, [profile.familyStructures]);

  const getCategoryLabel = (categoryId: string, optionId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.options.find((o) => o.id === optionId)?.label || optionId;
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4 gap-4">
        {/* Character Names Preview */}
        {exampleCharacters.length > 0 && (
          <View
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Sparkles size={20} color={colors.primary} />
              <Text
                className="font-semibold text-gray-900"
                style={{ color: colors.text }}
              >
                Character Names You Might See
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {exampleCharacters.map((name, idx) => (
                <View
                  key={idx}
                  className="px-3 py-2 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-white font-semibold text-sm">
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Family Structure Examples */}
        {exampleFamilies.length > 0 && (
          <View
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${colors.success}10` }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Users size={20} color={colors.success} />
              <Text
                className="font-semibold text-gray-900"
                style={{ color: colors.text }}
              >
                Family Examples
              </Text>
            </View>
            <View className="gap-2">
              {exampleFamilies.map((example, idx) => (
                <Text
                  key={idx}
                  className="text-sm text-gray-700"
                  style={{ color: colors.text }}
                >
                  • {example}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Abilities & Other Representation */}
        {profile.abilities.length > 0 && (
          <View
            className="p-4 rounded-xl"
            style={{ backgroundColor: `${colors.warning}10` }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Heart size={20} color={colors.warning} />
              <Text
                className="font-semibold text-gray-900"
                style={{ color: colors.text }}
              >
                Abilities & Accessibility
              </Text>
            </View>
            <View className="gap-2">
              {profile.abilities.map((abilityId) => {
                const label = getCategoryLabel("abilities", abilityId);
                return (
                  <Text
                    key={abilityId}
                    className="text-sm text-gray-700"
                    style={{ color: colors.text }}
                  >
                    • Characters with {label}
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        {/* Cultural & Language Elements */}
        {(profile.culturalBackgrounds.length > 0 ||
          profile.languages.length > 0) && (
          <View
            className="p-4 rounded-xl border-l-4"
            style={{
              backgroundColor: colors.surface,
              borderLeftColor: colors.primary,
            }}
          >
            <Text
              className="font-semibold text-gray-900 mb-2"
              style={{ color: colors.text }}
            >
              Cultural & Language Elements
            </Text>

            {profile.culturalBackgrounds.length > 0 && (
              <View className="mb-2">
                <Text
                  className="text-xs font-semibold text-gray-600 mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Celebrations & Traditions:
                </Text>
                <View className="gap-1">
                  {profile.culturalBackgrounds.slice(0, 3).map((cultId) => {
                    const label = getCategoryLabel(
                      "culturalBackgrounds",
                      cultId
                    );
                    return (
                      <Text
                        key={cultId}
                        className="text-sm text-gray-700"
                        style={{ color: colors.text }}
                      >
                        • {label}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}

            {profile.languages.length > 0 && (
              <View>
                <Text
                  className="text-xs font-semibold text-gray-600 mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Languages:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {profile.languages.slice(0, 3).map((langId) => {
                    const label = getCategoryLabel("languages", langId);
                    return (
                      <View
                        key={langId}
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
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* How This Looks in a Story */}
        <View
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.surface }}
        >
          <Text
            className="font-semibold text-gray-900 mb-3"
            style={{ color: colors.text }}
          >
            How This Looks in a Story
          </Text>
          <Text
            className="text-sm text-gray-700 leading-relaxed"
            style={{ color: colors.text }}
          >
            Your preferences guide how characters are created and families are
            depicted. Instead of making diversity the topic, it's woven
            naturally into the story. For example, a character might have a
            particular cultural background reflected in their name and
            traditions, or a family structure is simply how the story unfolds.
          </Text>

          <Text
            className="text-xs text-gray-600 mt-3 italic"
            style={{ color: colors.textSecondary }}
          >
            We avoid stereotypes and aim for authentic representation that every
            child can see themselves reflected in the stories they love.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
