import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useDiversityStore } from "@/lib/diversity-store";
import { ScreenContainer } from "@/components/screen-container";
import { BreadcrumbHeader } from "@/components/breadcrumb-header";
import DiversityCategorySelector from "@/components/diversity-category-selector";
import RepresentationPreview from "@/components/representation-preview";
import CulturalCalendarCard from "@/components/cultural-calendar-card";
import DiversityStatsChart from "@/components/diversity-stats-chart";
import type { DiversityProfile } from "@/server/_core/diversityService";

enum SettingsTab {
  Categories = "categories",
  Preview = "preview",
  Calendar = "calendar",
  Stats = "stats",
}

export default function DiversitySettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    SettingsTab.Categories
  );
  const [isSaving, setIsSaving] = useState(false);
  const [localProfile, setLocalProfile] = useState<DiversityProfile | null>(
    null
  );

  const {
    profile,
    categories,
    representationStats,
    culturalEvents,
    loading,
    error,
    setProfile,
    setCategories,
    setRepresentationStats,
    setCulturalEvents,
    setLoading,
    setError,
  } = useDiversityStore();

  // Query data
  const { data: fetchedProfile, isLoading: isProfileLoading } =
    trpc.diversity.getProfile.useQuery();
  const { data: fetchedCategories, isLoading: isCategoriesLoading } =
    trpc.diversity.getCategories.useQuery();
  const { data: fetchedCalendar, isLoading: isCalendarLoading } =
    trpc.diversity.getCulturalCalendar.useQuery();

  // Mutations
  const { mutate: updateProfileMutation } =
    trpc.diversity.updateProfile.useMutation({
      onSuccess: (updated) => {
        setProfile(updated);
        setIsSaving(false);
      },
      onError: (error) => {
        setError(error.message);
        setIsSaving(false);
        Alert.alert("Error", "Failed to save diversity profile");
      },
    });

  // Initialize local profile and sync with store
  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
      setLocalProfile(fetchedProfile);
    }
  }, [fetchedProfile, setProfile]);

  useEffect(() => {
    if (fetchedCategories) {
      setCategories(fetchedCategories);
    }
  }, [fetchedCategories, setCategories]);

  useEffect(() => {
    if (fetchedCalendar) {
      setCulturalEvents(fetchedCalendar);
    }
  }, [fetchedCalendar, setCulturalEvents]);

  const handleCategoryChange = (categoryId: string, selectedIds: string[]) => {
    if (!localProfile) return;

    const categoryKey = categoryId as keyof DiversityProfile;
    if (typeof categoryKey === "string" && categoryKey in localProfile) {
      setLocalProfile({
        ...localProfile,
        [categoryKey]: selectedIds,
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!localProfile) return;
    setIsSaving(true);
    updateProfileMutation(localProfile);
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      "Reset to Defaults",
      "Are you sure you want to reset all diversity settings to balanced defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const defaultProfile: DiversityProfile = {
              ethnicities: [
                "caucasian",
                "african",
                "asian",
                "latinx",
                "middle_eastern",
              ],
              familyStructures: ["two-parent", "single-parent"],
              abilities: [],
              culturalBackgrounds: [],
              genderExpression: ["traditional", "non-stereotypical"],
              bodyTypes: ["average", "athletic"],
              languages: ["english"],
              religiousSpiritual: [],
              preferMirrorFamily: false,
              diversityLevel: "balanced",
            };
            setLocalProfile(defaultProfile);
            setIsSaving(true);
            updateProfileMutation(defaultProfile);
          },
        },
      ]
    );
  };

  const isLoading =
    isProfileLoading || isCategoriesLoading || isCalendarLoading || loading;
  const hasChanges =
    JSON.stringify(localProfile) !== JSON.stringify(profile);

  const tabItems = [
    { id: SettingsTab.Categories, label: "Preferences" },
    { id: SettingsTab.Preview, label: "Preview" },
    { id: SettingsTab.Calendar, label: "Calendar" },
    { id: SettingsTab.Stats, label: "Stats" },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScreenContainer>
        {/* Breadcrumb Header */}
        <BreadcrumbHeader
          title="Diversity & Representation"
          crumbs={[
            { label: "Home", route: "/(tabs)" },
            { label: "Settings", route: "/settings" },
            { label: "Diversity" },
          ]}
        />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Tab Navigation */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <View className="flex-row gap-0">
                {tabItems.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id as SettingsTab)}
                    className={`px-4 py-3 border-b-2 ${
                      activeTab === tab.id
                        ? "border-indigo-500"
                        : "border-transparent"
                    }`}
                    style={{
                      borderBottomColor:
                        activeTab === tab.id ? colors.primary : "transparent",
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        activeTab === tab.id
                          ? "text-indigo-600"
                          : "text-gray-600"
                      }`}
                      style={{
                        color:
                          activeTab === tab.id ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Tab Content */}
            <View className="flex-1">
              {activeTab === SettingsTab.Categories && (
                <View className="flex-1 p-4">
                  <Text
                    className="text-sm text-gray-600 mb-4"
                    style={{ color: colors.textSecondary }}
                  >
                    Select the diversity elements you'd like to see represented
                    in your family's stories.
                  </Text>
                  {localProfile && categories.length > 0 && (
                    <DiversityCategorySelector
                      categories={categories}
                      selectedIds={{
                        ethnicities: localProfile.ethnicities,
                        familyStructures: localProfile.familyStructures,
                        abilities: localProfile.abilities,
                        culturalBackgrounds: localProfile.culturalBackgrounds,
                        genderExpression: localProfile.genderExpression,
                        bodyTypes: localProfile.bodyTypes,
                        languages: localProfile.languages,
                        religiousSpiritual: localProfile.religiousSpiritual,
                      }}
                      onChange={handleCategoryChange}
                    />
                  )}
                </View>
              )}

              {activeTab === SettingsTab.Preview && (
                <View className="flex-1">
                  {localProfile && categories.length > 0 && (
                    <RepresentationPreview
                      profile={localProfile}
                      categories={categories}
                    />
                  )}
                </View>
              )}

              {activeTab === SettingsTab.Calendar && (
                <View className="flex-1">
                  <CulturalCalendarCard events={culturalEvents} />
                </View>
              )}

              {activeTab === SettingsTab.Stats && (
                <View className="flex-1">
                  <DiversityStatsChart stats={representationStats} />
                </View>
              )}
            </View>

            {/* Footer Actions */}
            <View
              className="px-4 py-4 border-t gap-3"
              style={{ borderTopColor: colors.border }}
            >
              {error && (
                <Text className="text-red-600 text-xs text-center">{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleResetToDefaults}
                className="flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg border"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <RotateCcw size={16} color={colors.textSecondary} />
                <Text
                  className="font-semibold text-gray-700"
                  style={{ color: colors.text }}
                >
                  Reset to Defaults
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveChanges}
                disabled={!hasChanges || isSaving}
                className={`px-4 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
                  !hasChanges || isSaving ? "opacity-50" : ""
                }`}
                style={{
                  backgroundColor:
                    hasChanges && !isSaving ? colors.primary : colors.border,
                }}
              >
                {isSaving && (
                  <ActivityIndicator size="small" color="white" />
                )}
                <Text className="font-semibold text-white">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
