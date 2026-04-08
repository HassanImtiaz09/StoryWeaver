/**
 * Language Settings Screen
 *
 * Complete language configuration interface:
 * - Primary story language selection
 * - Bilingual mode setup
 * - Learning language selection
 * - Vocabulary difficulty level
 * - TTS language preferences
 * - Preview of bilingual mode
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguageStore } from "@/lib/language-store";
import { getSettings, saveSettings } from "@/lib/settings-store";
import { LanguageSelector } from "@/components/language-selector";
import { BilingualPageView } from "@/components/bilingual-page-view";
import { LanguageLearningBadge } from "@/components/language-learning-badge";
import { SUPPORTED_LANGUAGES } from "@/server/_core/languageService";

export default function LanguageSettingsScreen() {
  const {
    primaryLanguage,
    secondaryLanguage,
    bilingualMode,
    learningLanguage,
    setPrimaryLanguage,
    setSecondaryLanguage,
    toggleBilingualMode,
  } = useLanguageStore();

  const [vocabularyHighlightsEnabled, setVocabularyHighlightsEnabled] = useState(true);
  const [showLanguageLearningNotes, setShowLanguageLearningNotes] = useState(true);
  const [displayFormat, setDisplayFormat] = useState<"side-by-side" | "stacked">("side-by-side");
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setVocabularyHighlightsEnabled(settings.vocabularyHighlightsEnabled);
    setShowLanguageLearningNotes(settings.showLanguageLearningNotes);
    setDisplayFormat(settings.bilingualDisplayFormat);
  };

  const handleSaveSettings = async () => {
    await saveSettings({
      storyLanguage: primaryLanguage,
      bilingualModeEnabled: bilingualMode,
      learningLanguage,
      vocabularyHighlightsEnabled,
      bilingualDisplayFormat: displayFormat,
      showLanguageLearningNotes,
    });

    Alert.alert("Success", "Language settings saved!");
  };

  const primaryLang = SUPPORTED_LANGUAGES[primaryLanguage];
  const secondaryLang = secondaryLanguage ? SUPPORTED_LANGUAGES[secondaryLanguage] : null;

  // Sample text for preview
  const sampleText =
    "Once upon a time, in a magical forest, there lived a curious little fox named Luna. She loved exploring new paths and making friends with all the creatures in the woods.";

  const sampleTextES =
    "Érase una vez, en un bosque mágico, vivía una pequeña zorra curiosa llamada Luna. Le encantaba explorar nuevos caminos y hacer amigos con todas las criaturas del bosque.";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Language Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure your story language and multilingual features
          </Text>
        </View>

        {/* Primary Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Story Language</Text>
          <Text style={styles.sectionDescription}>
            The language in which your stories will be generated
          </Text>
          <LanguageSelector
            title="Primary Language"
            type="primary"
            showBilingualToggle={true}
            onLanguageSelected={setPrimaryLanguage}
          />
        </View>

        {/* Bilingual Mode Section */}
        {bilingualMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Secondary Language</Text>
            <Text style={styles.sectionDescription}>
              Display stories in two languages simultaneously
            </Text>
            <LanguageSelector
              title="Secondary Language"
              type="secondary"
              onLanguageSelected={setSecondaryLanguage}
            />

            {/* Display Format */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Display Format</Text>
              <View style={styles.formatOptions}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    displayFormat === "side-by-side" && styles.formatButtonActive,
                  ]}
                  onPress={() => setDisplayFormat("side-by-side")}
                >
                  <Text style={styles.formatButtonText}>Side-by-Side</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    displayFormat === "stacked" && styles.formatButtonActive,
                  ]}
                  onPress={() => setDisplayFormat("stacked")}
                >
                  <Text style={styles.formatButtonText}>Stacked</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Learning Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Language</Text>
          <Text style={styles.sectionDescription}>
            The language your child is learning
          </Text>
          <LanguageSelector
            title="Learning Language"
            type="learning"
            onLanguageSelected={(code) => {
              // Update through store if needed
            }}
          />
        </View>

        {/* Vocabulary Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vocabulary Features</Text>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Vocabulary Highlights</Text>
              <Text style={styles.toggleDescription}>
                Highlight educational words in stories
              </Text>
            </View>
            <Switch
              value={vocabularyHighlightsEnabled}
              onValueChange={setVocabularyHighlightsEnabled}
              trackColor={{ false: "#ddd", true: "#81c784" }}
              thumbColor={vocabularyHighlightsEnabled ? "#4caf50" : "#f0f0f0"}
            />
          </View>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Language Learning Notes</Text>
              <Text style={styles.toggleDescription}>
                Show tips for learning the language
              </Text>
            </View>
            <Switch
              value={showLanguageLearningNotes}
              onValueChange={setShowLanguageLearningNotes}
              trackColor={{ false: "#ddd", true: "#81c784" }}
              thumbColor={showLanguageLearningNotes ? "#4caf50" : "#f0f0f0"}
            />
          </View>
        </View>

        {/* TTS Support Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text-to-Speech Support</Text>
          <View style={styles.ttsSupportContainer}>
            {primaryLang && (
              <View style={styles.ttsInfo}>
                <Text style={styles.ttsLanguage}>{primaryLang.name}</Text>
                <Text style={styles.ttsStatus}>
                  {primaryLang.ttsSupported ? "✓ Supported" : "✗ Not Supported"}
                </Text>
              </View>
            )}
            {secondaryLang && (
              <View style={styles.ttsInfo}>
                <Text style={styles.ttsLanguage}>{secondaryLang.name}</Text>
                <Text style={styles.ttsStatus}>
                  {secondaryLang.ttsSupported ? "✓ Supported" : "✗ Not Supported"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Preview Section */}
        {bilingualMode && secondaryLanguage && (
          <View style={styles.section}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <TouchableOpacity
                style={styles.previewToggle}
                onPress={() => setPreviewExpanded(!previewExpanded)}
              >
                <Text style={styles.previewToggleText}>
                  {previewExpanded ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            {previewExpanded && (
              <View style={styles.previewContainer}>
                <BilingualPageView
                  primaryText={sampleText}
                  secondaryText={sampleTextES}
                  primaryLanguageCode={primaryLanguage}
                  secondaryLanguageCode={secondaryLanguage}
                  pageNumber={1}
                  showVocabularyHighlights={false}
                />
              </View>
            )}
          </View>
        )}

        {/* Learning Progress */}
        {learningLanguage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Progress</Text>
            <LanguageLearningBadge
              wordCount={0}
              targetLanguage={learningLanguage}
              masteryLevel={0}
              size="large"
              showLabel={true}
            />
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>About Multilingual Stories</Text>
          <Text style={styles.infoBoxText}>
            StoryWeaver supports 15 languages for story generation and translation. Enable bilingual
            mode to display stories in two languages side-by-side or stacked.
          </Text>
          <Text style={styles.infoBoxText}>
            Vocabulary highlights help children learn new words in their learning language. Save
            words to build a personal vocabulary bank.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        <View style={styles.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  section: {
    backgroundColor: "#fff",
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },

  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },

  settingItem: {
    marginTop: 12,
  },

  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  formatOptions: {
    flexDirection: "row",
    gap: 8,
  },

  formatButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },

  formatButtonActive: {
    backgroundColor: "#2196f3",
    borderColor: "#2196f3",
  },

  formatButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  toggleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  toggleContent: {
    flex: 1,
    marginRight: 12,
  },

  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  toggleDescription: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  ttsSupportContainer: {
    gap: 8,
  },

  ttsInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },

  ttsLanguage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  ttsStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4caf50",
  },

  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  previewToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
  },

  previewToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2196f3",
  },

  previewContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },

  infoBox: {
    backgroundColor: "#e8f5e9",
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },

  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 6,
  },

  infoBoxText: {
    fontSize: 13,
    color: "#558b2f",
    lineHeight: 20,
    marginBottom: 8,
  },

  saveButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#2196f3",
    borderRadius: 8,
    alignItems: "center",
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  spacing: {
    height: 20,
  },
});
