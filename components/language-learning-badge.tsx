/**
 * Language Learning Badge Component
 *
 * Shows:
 * - How many words learned in target language
 * - Available languages for a story
 * - Progress ring showing mastery level
 * - Language flags and names
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLanguageLearning } from "@/lib/language-store";
import { getLanguageFlag, formatLanguageName, formatLearningBadge } from "@/server/_core/bilingualFormatter";
import { SUPPORTED_LANGUAGES } from "@/server/_core/languageService";

interface LanguageLearningBadgeProps {
  wordCount: number;
  targetLanguage: string;
  masteryLevel?: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export function LanguageLearningBadge({
  wordCount,
  targetLanguage,
  masteryLevel = 0,
  size = "medium",
  showLabel = true,
}: LanguageLearningBadgeProps) {
  const badgeInfo = formatLearningBadge(wordCount, targetLanguage, masteryLevel);
  const language = SUPPORTED_LANGUAGES[targetLanguage];

  if (!language) return null;

  const sizeStyles = {
    small: { badgeSize: 40, fontSize: 11, flagSize: 16 },
    medium: { badgeSize: 60, fontSize: 13, flagSize: 24 },
    large: { badgeSize: 80, fontSize: 15, flagSize: 32 },
  };

  const currentSize = sizeStyles[size];
  const radius = currentSize.badgeSize / 2;
  const circumference = 2 * Math.PI * (radius - 8);
  const strokeDashoffset = circumference - (masteryLevel / 100) * circumference;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: currentSize.badgeSize,
            height: currentSize.badgeSize,
            borderRadius: radius,
          },
        ]}
      >
        {/* Background Circle (Mastery Ring) */}
        <View
          style={[
            styles.masteryRing,
            {
              width: currentSize.badgeSize,
              height: currentSize.badgeSize,
              borderRadius: radius,
              borderWidth: 3,
              borderColor: `rgba(33, 150, 243, ${0.2 + (masteryLevel / 100) * 0.8})`,
            },
          ]}
        />

        {/* Flag and Count */}
        <View style={styles.badgeContent}>
          <Text style={[styles.flag, { fontSize: currentSize.flagSize }]}>
            {getLanguageFlag(targetLanguage)}
          </Text>
          {size !== "small" && (
            <Text
              style={[
                styles.wordCount,
                {
                  fontSize: currentSize.fontSize,
                },
              ]}
            >
              {wordCount}
            </Text>
          )}
        </View>
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: currentSize.fontSize - 2 }]}>
            {language.nativeName}
          </Text>
          {masteryLevel > 0 && (
            <Text style={[styles.masteryText, { fontSize: currentSize.fontSize - 3 }]}>
              {masteryLevel}% mastery
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Language Availability Badge
 *
 * Shows available languages for a story
 */
export function LanguageAvailabilityBadge({
  availableLanguages,
  primaryLanguage,
}: {
  availableLanguages: string[];
  primaryLanguage: string;
}) {
  return (
    <View style={styles.availabilityContainer}>
      <Text style={styles.availabilityLabel}>Available in</Text>
      <View style={styles.languageFlags}>
        {availableLanguages.slice(0, 5).map((lang) => (
          <View
            key={lang}
            style={[
              styles.languageFlag,
              lang === primaryLanguage && styles.primaryLanguageFlag,
            ]}
            title={SUPPORTED_LANGUAGES[lang]?.name}
          >
            <Text style={styles.flagEmoji}>{getLanguageFlag(lang)}</Text>
          </View>
        ))}
        {availableLanguages.length > 5 && (
          <View style={styles.moreLanguages}>
            <Text style={styles.moreLanguagesText}>+{availableLanguages.length - 5}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Vocabulary Progress Ring
 *
 * Shows progress toward vocabulary goals
 */
export function VocabularyProgressRing({
  wordsLearned,
  wordsGoal = 100,
  targetLanguage,
  showPercentage = true,
}: {
  wordsLearned: number;
  wordsGoal?: number;
  targetLanguage: string;
  showPercentage?: boolean;
}) {
  const percentage = Math.min((wordsLearned / wordsGoal) * 100, 100);
  const language = SUPPORTED_LANGUAGES[targetLanguage];

  if (!language) return null;

  return (
    <View style={styles.progressRingContainer}>
      <View style={styles.ringContent}>
        <Text style={styles.ringFlag}>{getLanguageFlag(targetLanguage)}</Text>
        <View style={styles.ringText}>
          <Text style={styles.ringNumber}>{wordsLearned}</Text>
          <Text style={styles.ringLabel}>words</Text>
        </View>
      </View>

      <View style={styles.ringStats}>
        <View style={styles.statItem}>
          <View
            style={[
              styles.statBar,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>
        {showPercentage && (
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Learning Streak Badge
 *
 * Shows learning consistency
 */
export function LearningStreakBadge({
  streakDays,
  longestStreak,
  targetLanguage,
}: {
  streakDays: number;
  longestStreak: number;
  targetLanguage: string;
}) {
  const language = SUPPORTED_LANGUAGES[targetLanguage];

  if (!language) return null;

  return (
    <View style={styles.streakBadgeContainer}>
      <View style={styles.streakContent}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <View style={styles.streakText}>
          <Text style={styles.streakNumber}>{streakDays}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>
      <View style={styles.streakDivider} />
      <View style={styles.longestStreakText}>
        <Text style={styles.longestStreakNumber}>{longestStreak}</Text>
        <Text style={styles.longestStreakLabel}>longest</Text>
      </View>
    </View>
  );
}

/**
 * Language Learning Progress Summary
 *
 * Shows overview of learning progress across languages
 */
export function LanguageLearningProgressSummary({
  learningProgress,
}: {
  learningProgress: Record<string, { wordsLearned: number; masteryLevel: number }>;
}) {
  const languages = Object.entries(learningProgress).sort(
    (a, b) => b[1].wordsLearned - a[1].wordsLearned
  );

  if (languages.length === 0) {
    return (
      <View style={styles.emptySummary}>
        <Text style={styles.emptySummaryText}>Start learning a language to track progress!</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Learning Progress</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {languages.map(([langCode, progress]) => (
          <View key={langCode} style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
              <Text style={styles.progressCardFlag}>{getLanguageFlag(langCode)}</Text>
              <Text style={styles.progressCardLanguage}>
                {SUPPORTED_LANGUAGES[langCode]?.name}
              </Text>
            </View>

            <View style={styles.progressCardBody}>
              <Text style={styles.progressCardWords}>{progress.wordsLearned} words</Text>

              <View style={styles.progressCardBar}>
                <View
                  style={[
                    styles.progressCardBarFill,
                    {
                      width: `${progress.masteryLevel}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressCardMastery}>{progress.masteryLevel}% mastery</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },

  badge: {
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  masteryRing: {
    position: "absolute",
  },

  badgeContent: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },

  flag: {
    fontWeight: "700",
  },

  wordCount: {
    fontWeight: "700",
    color: "#2196f3",
  },

  labelContainer: {
    alignItems: "center",
  },

  label: {
    fontWeight: "600",
    color: "#333",
  },

  masteryText: {
    color: "#999",
    marginTop: 2,
  },

  availabilityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },

  availabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  languageFlags: {
    flexDirection: "row",
    gap: 6,
  },

  languageFlag: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  primaryLanguageFlag: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
    borderWidth: 2,
  },

  flagEmoji: {
    fontSize: 18,
  },

  moreLanguages: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },

  moreLanguagesText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },

  progressRingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  ringContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },

  ringFlag: {
    fontSize: 32,
  },

  ringText: {
    flex: 1,
  },

  ringNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },

  ringLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  ringStats: {
    gap: 8,
  },

  statItem: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },

  statBar: {
    height: "100%",
    backgroundColor: "#2196f3",
    borderRadius: 4,
  },

  percentageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2196f3",
    textAlign: "right",
  },

  streakBadgeContainer: {
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },

  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  streakEmoji: {
    fontSize: 28,
  },

  streakText: {
    flex: 1,
  },

  streakNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ff6f00",
  },

  streakLabel: {
    fontSize: 12,
    color: "#f57c00",
    fontWeight: "500",
  },

  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#ffe0b2",
  },

  longestStreakText: {
    alignItems: "center",
    marginLeft: 12,
  },

  longestStreakNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ff6f00",
  },

  longestStreakLabel: {
    fontSize: 11,
    color: "#f57c00",
    fontWeight: "500",
  },

  summaryContainer: {
    paddingVertical: 12,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginLeft: 16,
    marginRight: 8,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  progressCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },

  progressCardFlag: {
    fontSize: 20,
  },

  progressCardLanguage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },

  progressCardBody: {
    gap: 6,
  },

  progressCardWords: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2196f3",
  },

  progressCardBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },

  progressCardBarFill: {
    height: "100%",
    backgroundColor: "#2196f3",
  },

  progressCardMastery: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  emptySummary: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  emptySummaryText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
