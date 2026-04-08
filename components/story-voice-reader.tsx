import React, { useState, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { VoiceAssistantButton } from "@/components/voice-assistant-button";
import { VoiceFeedbackBubble } from "@/components/voice-feedback-bubble";
import { VoiceCommandHints, type CommandHint } from "@/components/voice-command-hints";

export interface StoryPage {
  text: string;
  number: number;
}

export interface StoryVoiceReaderProps {
  episode: {
    id: number;
    title: string;
    pages: StoryPage[];
    characters: string[];
    setting: string;
  };
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onStoryModified: (newText: string) => void;
  childId: number;
  childProfile: {
    name: string;
    age: number;
    interests?: string[];
    fears?: string[];
  };
}

export function StoryVoiceReader({
  episode,
  currentPage,
  onPageChange,
  onStoryModified,
  childId,
  childProfile,
}: StoryVoiceReaderProps) {
  const [feedback, setFeedback] = useState<{
    command?: string;
    response: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const currentPageData = episode.pages[currentPage - 1];
  const previousPages = episode.pages
    .slice(0, currentPage - 1)
    .map((p) => p.text);

  const voiceAssistant = useVoiceAssistant({
    episodeId: episode.id,
    pageNumber: currentPage,
    childId,
    storyContext: {
      title: episode.title,
      currentPageText: currentPageData?.text || "",
      previousPages,
      characters: episode.characters,
      setting: episode.setting,
    },
    childProfile,
  });

  // Handle transcript completion from voice button
  const handleTranscriptComplete = useCallback(
    async (transcript: string) => {
      const result = await voiceAssistant.handleTranscriptComplete(transcript);

      if (!result) {
        return;
      }

      // Handle different response types
      switch (result.type) {
        case "story_modification":
          if (result.modifiedText) {
            onStoryModified(result.modifiedText);
            setFeedback({
              command: transcript,
              response: result.content,
              type: "success",
            });
          }
          break;

        case "answer":
          setFeedback({
            command: transcript,
            response: result.content,
            type: "info",
          });
          break;

        case "navigation":
          if (result.pageNumber && result.pageNumber !== currentPage) {
            onPageChange(result.pageNumber);
          }
          setFeedback({
            command: transcript,
            response: result.content,
            type: "success",
          });
          break;

        case "interaction_effect":
          setFeedback({
            command: transcript,
            response: result.content,
            type: "info",
          });
          break;

        case "error":
          setFeedback({
            command: transcript,
            response: result.content,
            type: "error",
          });
          break;
      }
    },
    [voiceAssistant, currentPage, onPageChange, onStoryModified]
  );

  // Generate contextual command hints
  const getContextualHints = (): CommandHint[] => {
    const hints: CommandHint[] = [];

    // Always include navigation hints
    if (currentPage < episode.pages.length) {
      hints.push({
        text: "Next page",
        category: "navigation",
      });
    }
    if (currentPage > 1) {
      hints.push({
        text: "Go back",
        category: "navigation",
      });
    }

    // Add story modification based on age
    if (childProfile.age >= 5) {
      hints.push({
        text: "Make it funny",
        category: "fun_interactions",
      });
    }

    // Add question hints
    hints.push({
      text: "What happens next?",
      category: "questions",
    });

    // Add character-specific hints
    if (episode.characters.length > 0) {
      const firstChar = episode.characters[0];
      hints.push({
        text: `Tell me about ${firstChar}`,
        category: "questions",
      });
    }

    return hints;
  };

  return (
    <View className="flex-1">
      {/* Story text */}
      <ScrollView className="flex-1 p-4">
        {currentPageData && (
          <View className="gap-4">
            <Text className="text-lg font-semibold text-gray-800">
              {episode.title}
            </Text>
            <Text className="text-base text-gray-700 leading-6">
              {currentPageData.text}
            </Text>
            <Text className="text-xs text-gray-500 text-right">
              Page {currentPage} of {episode.pages.length}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Voice feedback */}
      {feedback && (
        <VoiceFeedbackBubble
          command={feedback.command}
          response={feedback.response}
          type={feedback.type}
          autoHideDuration={4000}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* Voice assistant button */}
      <VoiceAssistantButton
        onTranscriptComplete={handleTranscriptComplete}
        enabled={voiceAssistant.isVoiceEnabled}
      />

      {/* Command hints */}
      <VoiceCommandHints
        hints={getContextualHints()}
        onSelectHint={handleTranscriptComplete}
        enabled={voiceAssistant.showCommandHints}
      />
    </View>
  );
}
