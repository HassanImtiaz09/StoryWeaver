// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useSelStore } from "@/lib/sel-store";
import SelCompetencyWheel from "@/components/sel-competency-wheel";
import SelTemplateCard from "@/components/sel-template-card";
import SelProgressChart from "@/components/sel-progress-chart";
import EmotionCheckIn from "@/components/emotion-check-in";
import SelInsightsPanel from "@/components/sel-insights-panel";
import { cn } from "@/lib/utils";

type Tab = "explore" | "progress" | "insights";

export default function SelStoriesScreen() {
  const router = useRouter();
  const colors = useColors();

  // State
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [selectedChild, setSelectedChild] = useState<number>(1); // Mock child ID
  const [childAge, setChildAge] = useState<number>(7); // Mock age
  const [childName, setChildName] = useState<string>("Alex"); // Mock name
  const [refreshing, setRefreshing] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [lastGeneratedStoryId, setLastGeneratedStoryId] = useState<string | null>(null);

  // Store
  const {
    templates,
    setTemplates,
    competencies,
    setCompetencies,
    childProgress,
    setChildProgress,
    selectedCompetency,
    setSelectedCompetency,
    currentTemplate,
    setCurrentTemplate,
    addGeneratedStory,
    generatedStories,
    insights,
    setInsights,
  } = useSelStore();

  // tRPC queries
  const templatesQuery = trpc.sel.getTemplates.useQuery({
    competency: selectedCompetency || undefined,
    ageMin: childAge - 2,
    ageMax: childAge + 2,
  });

  const competenciesQuery = trpc.sel.getCompetencies.useQuery();

  const progressQuery = trpc.sel.getProgress.useQuery({
    childId: selectedChild,
  });

  const recommendedQuery = trpc.sel.getRecommendations.useQuery({
    childId: selectedChild,
    childAge,
    childName,
  });

  const insightsQuery = trpc.sel.getInsights.useQuery({
    childId: selectedChild,
  });

  // Mutations
  const generateStoryMutation = trpc.sel.generateStory.useMutation();
  const submitResponseMutation = trpc.sel.submitResponse.useMutation();

  // Update store when queries complete
  useEffect(() => {
    if (templatesQuery.data) {
      setTemplates(templatesQuery.data);
    }
  }, [templatesQuery.data, setTemplates]);

  useEffect(() => {
    if (competenciesQuery.data) {
      setCompetencies(competenciesQuery.data);
    }
  }, [competenciesQuery.data, setCompetencies]);

  useEffect(() => {
    if (progressQuery.data) {
      setChildProgress(selectedChild, progressQuery.data.progressByCompetency);
    }
  }, [progressQuery.data, selectedChild, setChildProgress]);

  useEffect(() => {
    if (insightsQuery.data) {
      setInsights(selectedChild, insightsQuery.data);
    }
  }, [insightsQuery.data, selectedChild, setInsights]);

  // Handle template selection and story generation
  const handleGenerateStory = useCallback(
    async (templateId: number) => {
      setGeneratingStory(true);
      try {
        const result = await generateStoryMutation.mutateAsync({
          templateId,
          childId: selectedChild,
          childName,
          childAge,
        });

        addGeneratedStory(result);
        setLastGeneratedStoryId(result.id);
        setCurrentTemplate(templates.find((t) => t.id === templateId) || null);

        // Navigate to story view (would need a dedicated screen)
        // For now, show an alert
        Alert.alert(
          "Story Generated!",
          `Your story "${result.title}" is ready. Save your emotional response after reading.`,
          [
            {
              text: "Read Now",
              onPress: () => {
                // TODO: Navigate to story reader
                setShowCheckIn(true);
              },
            },
            { text: "Later", onPress: () => {} },
          ]
        );
      } catch (error) {
        Alert.alert("Error", "Failed to generate story. Please try again.");
        console.error(error);
      } finally {
        setGeneratingStory(false);
      }
    },
    [
      selectedChild,
      childName,
      childAge,
      generateStoryMutation,
      addGeneratedStory,
      setCurrentTemplate,
      templates,
    ]
  );

  // Handle emotional check-in submission
  const handleSubmitCheckIn = useCallback(
    async (data: {
      emotionFelt: string;
      emotionIntensity: number;
      reflection?: string;
    }) => {
      setCheckingIn(true);
      try {
        if (!lastGeneratedStoryId) {
          Alert.alert("Error", "No story to check in for");
          return;
        }

        // Extract template ID from story ID
        const templateId = parseInt(lastGeneratedStoryId.split("-")[0]);

        await submitResponseMutation.mutateAsync({
          childId: selectedChild,
          templateId,
          emotionFelt: data.emotionFelt,
          emotionIntensity: data.emotionIntensity,
          reflection: data.reflection,
        });

        Alert.alert(
          "Thank You!",
          "Your feelings have been saved. Great job exploring your emotions!"
        );
        setShowCheckIn(false);
        setLastGeneratedStoryId(null);

        // Refresh insights
        insightsQuery.refetch();
      } catch (error) {
        Alert.alert("Error", "Failed to save response. Please try again.");
        console.error(error);
      } finally {
        setCheckingIn(false);
      }
    },
    [lastGeneratedStoryId, selectedChild, submitResponseMutation, insightsQuery]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        templatesQuery.refetch(),
        competenciesQuery.refetch(),
        progressQuery.refetch(),
        insightsQuery.refetch(),
        recommendedQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    templatesQuery,
    competenciesQuery,
    progressQuery,
    insightsQuery,
    recommendedQuery,
  ]);

  // Filter templates based on selected competency
  const filteredTemplates =
    selectedCompetency && templates.length > 0
      ? templates.filter((t) => t.competency === selectedCompetency)
      : templates;

  // Get recommended templates
  const recommendedTemplates = recommendedQuery.data || [];

  const isLoading =
    templatesQuery.isLoading ||
    competenciesQuery.isLoading ||
    progressQuery.isLoading;

  return (
    <ScreenContainer>
      {/* Header with tab navigation */}
      <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-0">
        <View className="mb-4">
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            🎭 SEL Stories
          </Text>
          <Text className="text-sm text-gray-600">
            Build emotional skills through storytelling
          </Text>
        </View>

        {/* Child selector */}
        <View className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Text className="text-xs font-semibold text-blue-900 mb-1">
            Reading as: {childName} (Age {childAge})
          </Text>
          <Text className="text-xs text-blue-700">
            Tap to select a different child
          </Text>
        </View>

        {/* Tab navigation */}
        <View className="flex-row gap-2">
          {[
            { id: "explore", label: "Explore", emoji: "🔍" },
            { id: "progress", label: "Progress", emoji: "📊" },
            { id: "insights", label: "Insights", emoji: "💡" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex-1 py-3 px-3 rounded-t-lg border-b-2 items-center",
                activeTab === tab.id
                  ? "bg-blue-500 border-blue-600"
                  : "bg-gray-100 border-gray-300"
              )}
            >
              <Text
                className={cn(
                  "font-semibold text-sm",
                  activeTab === tab.id ? "text-white" : "text-gray-700"
                )}
              >
                {tab.emoji} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === "explore" && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          className="flex-1 bg-gray-50"
        >
          {isLoading && !templates.length ? (
            <View className="flex-1 justify-center items-center py-12">
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />
              <Text className="text-gray-600 mt-3">
                Loading stories...
              </Text>
            </View>
          ) : (
            <View className="p-4 pb-12">
              {/* Competency Wheel */}
              {childProgress[selectedChild] && childProgress[selectedChild].length > 0 && (
                <>
                  <SelCompetencyWheel
                    progress={childProgress[selectedChild]}
                    maxStoriesRead={10}
                    onCompetencySelect={(competency) => {
                      setSelectedCompetency(competency as any);
                    }}
                  />
                  <View className="h-6" />
                </>
              )}

              {/* Recommended Section */}
              {recommendedTemplates.length > 0 && (
                <>
                  <View className="mb-4">
                    <Text className="text-xl font-bold text-gray-800 mb-3">
                      ✨ Recommended For You
                    </Text>
                    <View className="gap-3">
                      {recommendedTemplates.slice(0, 3).map((template) => (
                        <SelTemplateCard
                          key={template.id}
                          template={template}
                          onPress={() => handleGenerateStory(template.id)}
                          isSelected={false}
                        />
                      ))}
                    </View>
                  </View>
                  <View className="h-4" />
                </>
              )}

              {/* All Templates Section */}
              <View>
                <Text className="text-xl font-bold text-gray-800 mb-3">
                  {selectedCompetency ? "Filtered Stories" : "All Stories"}
                </Text>

                {filteredTemplates.length === 0 ? (
                  <View className="py-8 items-center">
                    <Text className="text-3xl mb-3">📚</Text>
                    <Text className="text-gray-700 font-semibold">
                      No stories found
                    </Text>
                    <Text className="text-gray-600 text-center mt-2">
                      Try selecting a different competency
                    </Text>
                  </View>
                ) : (
                  <View className="gap-3">
                    {filteredTemplates.map((template) => (
                      <SelTemplateCard
                        key={template.id}
                        template={template}
                        onPress={() => handleGenerateStory(template.id)}
                        isSelected={currentTemplate?.id === template.id}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === "progress" && (
        <View className="flex-1 bg-white">
          {progressQuery.isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : childProgress[selectedChild] && childProgress[selectedChild].length > 0 ? (
            <SelProgressChart
              progress={childProgress[selectedChild]}
              maxStoriesRead={10}
              showBadges={true}
            />
          ) : (
            <View className="flex-1 justify-center items-center p-6">
              <Text className="text-3xl mb-4">📖</Text>
              <Text className="text-xl font-bold text-gray-800 text-center mb-2">
                Start Reading Stories
              </Text>
              <Text className="text-gray-600 text-center">
                Read your first SEL story to begin tracking your progress
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === "insights" && (
        <View className="flex-1 bg-gray-50">
          {insightsQuery.isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : insights[selectedChild] ? (
            <SelInsightsPanel
              insights={insights[selectedChild]}
              onExportPdf={() => {
                Alert.alert(
                  "Export PDF",
                  "PDF export coming soon! Share these insights with therapists.",
                  [{ text: "OK" }]
                );
              }}
              isLoading={false}
            />
          ) : (
            <View className="flex-1 justify-center items-center p-6">
              <Text className="text-3xl mb-4">📊</Text>
              <Text className="text-xl font-bold text-gray-800 text-center mb-2">
                No Insights Yet
              </Text>
              <Text className="text-gray-600 text-center">
                Read stories and complete emotional check-ins to see your insights
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Floating Emotional Check-in Modal */}
      {showCheckIn && (
        <View className="absolute inset-0 bg-black bg-opacity-50 z-50">
          <View className="flex-1 bg-white rounded-t-3xl mt-auto">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-800">
                How are you feeling?
              </Text>
              <TouchableOpacity
                onPress={() => setShowCheckIn(false)}
                className="p-2"
              >
                <Text className="text-2xl">✕</Text>
              </TouchableOpacity>
            </View>
            <EmotionCheckIn
              onSubmit={handleSubmitCheckIn}
              isLoading={checkingIn}
            />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
