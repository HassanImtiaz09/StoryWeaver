// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface GalleryFiltersProps {
  onThemeChange: (theme?: string) => void;
  onAgeGroupChange: (ageGroup?: string) => void;
  onSortChange: (sortBy: "popular" | "recent" | "liked") => void;
  onSearchChange: (query?: string) => void;
  currentTheme?: string;
  currentAgeGroup?: string;
  currentSort?: "popular" | "recent" | "liked";
  currentSearch?: string;
}

const THEMES = ["Space", "Ocean", "Forest", "Fairy", "Adventure", "Bedtime", "Mystery"];
const AGE_GROUPS = ["All Ages", "2-4", "5-7", "8-10", "11-13"];
const SORT_OPTIONS: Array<{ id: "popular" | "recent" | "liked"; label: string }> = [
  { id: "recent", label: "Recent" },
  { id: "popular", label: "Popular" },
  { id: "liked", label: "Most Liked" },
];

export const GalleryFilters: React.FC<GalleryFiltersProps> = ({
  onThemeChange,
  onAgeGroupChange,
  onSortChange,
  onSearchChange,
  currentTheme,
  currentAgeGroup,
  currentSort = "recent",
  currentSearch = "",
}) => {
  const colors = useColors();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState(currentSearch);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearchChange(text.length > 0 ? text : undefined);
  };

  const handleThemePress = (theme: string) => {
    if (currentTheme === theme) {
      onThemeChange();
    } else {
      onThemeChange(theme.toLowerCase());
    }
  };

  const handleAgeGroupPress = (ageGroup: string) => {
    if (currentAgeGroup === ageGroup) {
      onAgeGroupChange();
    } else {
      onAgeGroupChange(ageGroup === "All Ages" ? undefined : ageGroup);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stories..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch("")}>
            <Text style={styles.clearButton}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sort by</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.chip,
                currentSort === option.id && styles.chipActive,
              ]}
              onPress={() => onSortChange(option.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  currentSort === option.id && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Theme Filters */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Themes</Text>
          <Pressable onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={styles.toggleText}>
              {showAdvanced ? "Less" : "More"}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {THEMES.slice(0, showAdvanced ? THEMES.length : 4).map((theme) => (
            <Pressable
              key={theme}
              style={[
                styles.chip,
                currentTheme === theme.toLowerCase() && styles.chipActive,
              ]}
              onPress={() => handleThemePress(theme)}
            >
              <Text
                style={[
                  styles.chipText,
                  currentTheme === theme.toLowerCase() && styles.chipTextActive,
                ]}
              >
                {theme}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Age Group Filters */}
      {showAdvanced && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Age Group</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {AGE_GROUPS.map((ageGroup) => (
              <Pressable
                key={ageGroup}
                style={[
                  styles.chip,
                  (currentAgeGroup === ageGroup ||
                    (ageGroup === "All Ages" && !currentAgeGroup)) &&
                    styles.chipActive,
                ]}
                onPress={() => handleAgeGroupPress(ageGroup)}
              >
                <Text
                  style={[
                    styles.chipText,
                    (currentAgeGroup === ageGroup ||
                      (ageGroup === "All Ages" && !currentAgeGroup)) &&
                      styles.chipTextActive,
                  ]}
                >
                  {ageGroup}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reset Button */}
      {(currentTheme || currentAgeGroup || searchQuery || currentSort !== "recent") && (
        <Pressable
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery("");
            onThemeChange();
            onAgeGroupChange();
            onSortChange("recent");
            onSearchChange();
          }}
        >
          <Text style={styles.resetButtonText}>Reset Filters</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  clearButton: {
    fontSize: 18,
    color: "#9CA3AF",
    padding: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  toggleText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  resetButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
});
