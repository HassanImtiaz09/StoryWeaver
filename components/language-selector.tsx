/**
 * Language Selector Component
 *
 * Dropdown/modal for selecting primary and secondary languages.
 * Shows language names in both English and native form.
 * Supports search/filter for quick finding.
 */
// @ts-nocheck


import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useLanguageStore } from "@/lib/language-store";
import { useColors } from "@/hooks/use-colors";
import { SUPPORTED_LANGUAGES } from "@/server/_core/languageService";
import { formatLanguageName, getLanguageFlag } from "@/server/_core/bilingualFormatter";

interface LanguageSelectorProps {
  title?: string;
  type: "primary" | "secondary" | "learning";
  onLanguageSelected?: (languageCode: string) => void;
  showBilingualToggle?: boolean;
}

export function LanguageSelector({
  title = "Select Language",
  type,
  onLanguageSelected,
  showBilingualToggle = false,
}: LanguageSelectorProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const {
    primaryLanguage,
    secondaryLanguage,
    bilingualMode,
    setPrimaryLanguage,
    setSecondaryLanguage,
    toggleBilingualMode,
  } = useLanguageStore();

  // Get currently selected language
  const currentLanguage =
    type === "primary"
      ? primaryLanguage
      : type === "secondary"
        ? secondaryLanguage
        : primaryLanguage;

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    const searchLower = searchText.toLowerCase();
    return Object.values(SUPPORTED_LANGUAGES).filter((lang) => {
      return (
        lang.code.includes(searchLower) ||
        lang.name.toLowerCase().includes(searchLower) ||
        lang.nativeName.toLowerCase().includes(searchLower)
      );
    });
  }, [searchText]);

  // Get recently used languages
  const recentLanguages = useMemo(() => {
    const recent = [primaryLanguage];
    if (secondaryLanguage && secondaryLanguage !== primaryLanguage) {
      recent.push(secondaryLanguage);
    }
    return recent.filter((code) => SUPPORTED_LANGUAGES[code]);
  }, [primaryLanguage, secondaryLanguage]);

  const handleLanguageSelect = (languageCode: string) => {
    if (type === "primary") {
      setPrimaryLanguage(languageCode);
    } else if (type === "secondary") {
      setSecondaryLanguage(languageCode);
    }

    onLanguageSelected?.(languageCode);
    setIsOpen(false);
    setSearchText("");
  };

  const displayLanguage = SUPPORTED_LANGUAGES[currentLanguage || "en"];

  return (
    <View style={styles.container}>
      {/* Selected Language Button */}
      <Pressable
        style={styles.selectorButton}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.flag}>{getLanguageFlag(currentLanguage || "en")}</Text>
          <View style={styles.languageInfo}>
            <Text style={styles.label}>{title}</Text>
            <Text style={styles.selectedLanguage}>
              {displayLanguage ? formatLanguageName(displayLanguage.code, "both") : "Select..."}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {/* Bilingual Toggle */}
      {showBilingualToggle && type === "primary" && (
        <TouchableOpacity
          style={[styles.bilingualToggle, bilingualMode && styles.bilingualToggleActive]}
          onPress={toggleBilingualMode}
        >
          <Text style={styles.bilingualToggleText}>
            {bilingualMode ? "Bilingual Mode ON" : "Bilingual Mode OFF"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal Selector */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => {
                  setIsOpen(false);
                  setSearchText("");
                }}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Recent Languages */}
            {!searchText && recentLanguages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently Used</Text>
                {recentLanguages.map((code) => {
                  const lang = SUPPORTED_LANGUAGES[code];
                  return (
                    <LanguageOption
                      key={code}
                      language={lang}
                      isSelected={currentLanguage === code}
                      onSelect={() => handleLanguageSelect(code)}
                    />
                  );
                })}
              </View>
            )}

            {/* All Languages */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchText ? "Search Results" : "All Languages"}
              </Text>
              <ScrollView style={styles.languageList}>
                {filteredLanguages.map((lang) => (
                  <LanguageOption
                    key={lang.code}
                    language={lang}
                    isSelected={currentLanguage === lang.code}
                    onSelect={() => handleLanguageSelect(lang.code)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/**
 * Individual language option component
 */
function LanguageOption({
  language,
  isSelected,
  onSelect,
}: {
  language: (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];
  isSelected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <Pressable
      style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
      onPress={onSelect}
    >
      <Text style={styles.flag}>{getLanguageFlag(language.code)}</Text>
      <View style={styles.optionContent}>
        <Text style={[styles.optionNativeName, isSelected && styles.optionNativeNameSelected]}>
          {language.nativeName}
        </Text>
        <Text style={[styles.optionEnglishName, isSelected && styles.optionEnglishNameSelected]}>
          {language.name}
        </Text>
      </View>
      {isSelected && <Text style={styles.checkmark}>✓</Text>}
      {!language.ttsSupported && (
        <Text style={styles.noTTSBadge} title="Text-to-speech not supported">
          no audio
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },

  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  flag: {
    fontSize: 32,
    marginRight: 12,
  },

  languageInfo: {
    flex: 1,
  },

  label: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
    fontWeight: "600",
  },

  selectedLanguage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginTop: 2,
  },

  chevron: {
    fontSize: 24,
    color: "#999",
    marginLeft: 8,
  },

  bilingualToggle: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },

  bilingualToggleActive: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },

  bilingualToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196f3",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#fff",
  },

  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: 28,
    color: "#999",
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  searchInput: {
    height: 40,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#000",
  },

  section: {
    flex: 1,
  },

  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    backgroundColor: "#fafafa",
  },

  languageList: {
    flex: 1,
  },

  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  languageOptionSelected: {
    backgroundColor: "#e3f2fd",
  },

  optionContent: {
    flex: 1,
    marginLeft: 12,
  },

  optionNativeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },

  optionNativeNameSelected: {
    color: "#2196f3",
  },

  optionEnglishName: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  optionEnglishNameSelected: {
    color: "#2196f3",
  },

  checkmark: {
    fontSize: 18,
    color: "#2196f3",
    fontWeight: "700",
    marginRight: 8,
  },

  noTTSBadge: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    marginLeft: 8,
  },
});
