import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  AccessibilityInfo,
} from "react-native";
import * as Speech from "expo-speech";
import { useColors } from "@/hooks/use-colors";
import { useGrandparentStore } from "@/lib/grandparent-store";

interface StoryPage {
  content: string;
  audioUrl?: string;
}

interface GrandparentStoryViewProps {
  title: string;
  pages: StoryPage[];
  onRecord?: (pageNumber: number) => Promise<void>;
  isLoading?: boolean;
  highContrast?: boolean;
}

export default function GrandparentStoryView({
  title,
  pages,
  onRecord,
  isLoading = false,
  highContrast = false,
}: GrandparentStoryViewProps) {
  const colors = useColors();
  const { fontSize } = useGrandparentStore();
  const { width } = useWindowDimensions();
  const [currentPage, setCurrentPage] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const scaledFontSize = (size: number) => Math.round(size * fontSize);
  const effectiveContrast = highContrast || fontSize > 1.3;

  const backgroundColor = effectiveContrast ? colors.surface : colors.background;
  const textColor = effectiveContrast ? colors.text : colors.text;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleSpeak = async () => {
    if (pages[currentPage] && !isSpeaking) {
      try {
        setIsSpeaking(true);
        await Speech.speak(pages[currentPage].content, {
          language: "en",
          rate: 0.85,
          pitch: 1.1,
        });
      } catch (error) {
        console.error("Error speaking:", error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  const handleStopSpeaking = async () => {
    await Speech.stop();
    setIsSpeaking(false);
  };

  const handleRecord = async () => {
    if (onRecord && !isRecording) {
      try {
        setIsRecording(true);
        await onRecord(currentPage);
      } catch (error) {
        console.error("Error recording:", error);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  const currentPageData = pages[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: effectiveContrast ? colors.primary : colors.surface,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: scaledFontSize(22),
            fontWeight: "700",
            color: effectiveContrast ? "white" : colors.text,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>

      {/* Story Content */}
      <ScrollView
        style={{ flex: 1, padding: 16 }}
        scrollEnabled
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        {isLoading ? (
          <View style={{ justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                marginTop: 16,
                fontSize: scaledFontSize(16),
                color: colors.textSecondary,
              }}
            >
              Loading story...
            </Text>
          </View>
        ) : currentPageData ? (
          <Text
            style={{
              fontSize: scaledFontSize(24),
              lineHeight: scaledFontSize(36),
              color: textColor,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {currentPageData.content}
          </Text>
        ) : (
          <Text
            style={{
              fontSize: scaledFontSize(16),
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            No pages available
          </Text>
        )}
      </ScrollView>

      {/* Page Indicator */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: scaledFontSize(14),
            color: colors.textSecondary,
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Page {currentPage + 1} of {pages.length}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        {/* Narration Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={isSpeaking ? handleStopSpeaking : handleSpeak}
            disabled={!currentPageData || isLoading}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: isSpeaking ? colors.warning : colors.secondary,
              opacity: !currentPageData || isLoading ? 0.5 : 1,
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
              {isSpeaking ? "Stop Reading" : "Read Aloud"}
            </Text>
          </TouchableOpacity>

          {onRecord && (
            <TouchableOpacity
              onPress={handleRecord}
              disabled={isRecording || !currentPageData || isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                // @ts-expect-error - type mismatch from schema
                backgroundColor: isRecording ? colors.error : colors.primary,
                opacity: !currentPageData || isLoading ? 0.5 : 1,
              }}
            >
              {isRecording ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={{
                    fontSize: scaledFontSize(14),
                    fontWeight: "700",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  🎤 Record Voice
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={isFirstPage || isLoading}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderRadius: 8,
              // @ts-expect-error - type mismatch from schema
              backgroundColor: isFirstPage ? colors.disabled : colors.primary,
              opacity: isFirstPage ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: scaledFontSize(24),
                color: "white",
                textAlign: "center",
                fontWeight: "700",
              }}
            >
              ← Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={isLastPage || isLoading}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderRadius: 8,
              // @ts-expect-error - type mismatch from schema
              backgroundColor: isLastPage ? colors.disabled : colors.primary,
              opacity: isLastPage ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: scaledFontSize(24),
                color: "white",
                textAlign: "center",
                fontWeight: "700",
              }}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
