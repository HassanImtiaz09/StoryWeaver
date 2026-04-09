// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Dimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import { getAccessibleColorPalette, getStoryTextStyle } from "@/lib/accessibility-text-styles";
import { useColors } from "@/hooks/use-colors";

/**
 * Comprehensive Accessibility Settings Panel
 * Full settings interface with live preview
 */
export function AccessibilityPanel() {
  const accessibility = useAccessibilityStore();
  const colors = useColors();
  const [expandedSection, setExpandedSection] = useState<string | null>("font");

  const previewText =
    "Once upon a time, in a magical forest, there lived a curious little dragon.";

  const previewStyle = getStoryTextStyle(
    accessibility.fontMode,
    accessibility.textSize,
    accessibility.lineSpacing,
    accessibility.letterSpacing,
    accessibility.contrastMode
  );

  const paletteColors = getAccessibleColorPalette(accessibility.contrastMode);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paletteColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Preview Section */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[
          styles.previewSection,
          { backgroundColor: paletteColors.surface, borderColor: paletteColors.border },
        ]}
      >
        <Text
          style={[
            styles.previewLabel,
            { color: paletteColors.textSecondary, fontSize: 12 },
          ]}
        >
          Live Preview
        </Text>
        <Text
          style={[
            previewStyle,
            {
              color: paletteColors.text,
              marginTop: 12,
            },
          ]}
        >
          {previewText}
        </Text>
      </Animated.View>

      {/* Font Mode Section */}
      <SettingSection
        title="Font Style"
        icon="text-outline"
        isExpanded={expandedSection === "font"}
        onToggle={() => setExpandedSection(expandedSection === "font" ? null : "font")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.optionGrid}>
          {(["standard", "dyslexia", "large-print"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => accessibility.setFontMode(mode)}
              style={[
                styles.optionButton,
                {
                  backgroundColor:
                    accessibility.fontMode === mode ? colors.primary : paletteColors.surface,
                  borderColor:
                    accessibility.fontMode === mode ? colors.primary : paletteColors.border,
                  borderWidth: 2,
                },
              ]}
              accessibilityLabel={`Font mode: ${mode}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.fontMode === mode }}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      accessibility.fontMode === mode ? "#0A0E1A" : paletteColors.text,
                    fontWeight: accessibility.fontMode === mode ? "700" : "500",
                  },
                ]}
              >
                {mode === "standard" && "Standard"}
                {mode === "dyslexia" && "Dyslexia"}
                {mode === "large-print" && "Large"}
              </Text>
            </Pressable>
          ))}
        </View>
      </SettingSection>

      {/* Contrast Mode Section */}
      <SettingSection
        title="Contrast & Color"
        icon="contrast-outline"
        isExpanded={expandedSection === "contrast"}
        onToggle={() => setExpandedSection(expandedSection === "contrast" ? null : "contrast")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.optionGrid}>
          {(["normal", "high-contrast", "dark", "sepia"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => accessibility.setContrastMode(mode)}
              style={[
                styles.optionButton,
                {
                  backgroundColor:
                    accessibility.contrastMode === mode ? colors.primary : paletteColors.surface,
                  borderColor:
                    accessibility.contrastMode === mode ? colors.primary : paletteColors.border,
                  borderWidth: 2,
                },
              ]}
              accessibilityLabel={`Contrast mode: ${mode}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: accessibility.contrastMode === mode }}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      accessibility.contrastMode === mode ? "#0A0E1A" : paletteColors.text,
                    fontWeight: accessibility.contrastMode === mode ? "700" : "500",
                  },
                ]}
              >
                {mode === "normal" && "Normal"}
                {mode === "high-contrast" && "High"}
                {mode === "dark" && "Dark"}
                {mode === "sepia" && "Sepia"}
              </Text>
            </Pressable>
          ))}
        </View>
      </SettingSection>

      {/* Text Size Slider */}
      <SettingSection
        title="Text Size"
        icon="text-outline"
        isExpanded={expandedSection === "textsize"}
        onToggle={() => setExpandedSection(expandedSection === "textsize" ? null : "textsize")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0.8}
            maximumValue={2.0}
            step={0.1}
            value={accessibility.textSize}
            onValueChange={(val) => accessibility.setTextSize(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={paletteColors.border}
            accessibilityLabel="Text size slider"
            accessibilityHint={`Current size: ${(accessibility.textSize * 100).toFixed(0)}%`}
          />
          <Text style={[styles.sliderValue, { color: paletteColors.text }]}>
            {(accessibility.textSize * 100).toFixed(0)}%
          </Text>
        </View>
      </SettingSection>

      {/* Line Spacing Slider */}
      <SettingSection
        title="Line Spacing"
        icon="remove-outline"
        isExpanded={expandedSection === "linespacing"}
        onToggle={() =>
          setExpandedSection(expandedSection === "linespacing" ? null : "linespacing")
        }
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={1.0}
            maximumValue={2.5}
            step={0.1}
            value={accessibility.lineSpacing}
            onValueChange={(val) => accessibility.setLineSpacing(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={paletteColors.border}
            accessibilityLabel="Line spacing slider"
            accessibilityHint={`Current spacing: ${accessibility.lineSpacing.toFixed(1)}`}
          />
          <Text style={[styles.sliderValue, { color: paletteColors.text }]}>
            {accessibility.lineSpacing.toFixed(1)}
          </Text>
        </View>
      </SettingSection>

      {/* Letter Spacing Slider */}
      <SettingSection
        title="Letter Spacing"
        icon="code-slash-outline"
        isExpanded={expandedSection === "letterspacing"}
        onToggle={() =>
          setExpandedSection(expandedSection === "letterspacing" ? null : "letterspacing")
        }
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={3}
            step={0.1}
            value={accessibility.letterSpacing}
            onValueChange={(val) => accessibility.setLetterSpacing(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={paletteColors.border}
            accessibilityLabel="Letter spacing slider"
            accessibilityHint={`Current spacing: ${accessibility.letterSpacing.toFixed(1)}`}
          />
          <Text style={[styles.sliderValue, { color: paletteColors.text }]}>
            {accessibility.letterSpacing.toFixed(1)}
          </Text>
        </View>
      </SettingSection>

      {/* Word Spacing Slider */}
      <SettingSection
        title="Word Spacing"
        icon="swap-horizontal-outline"
        isExpanded={expandedSection === "wordspacing"}
        onToggle={() =>
          setExpandedSection(expandedSection === "wordspacing" ? null : "wordspacing")
        }
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={5}
            step={0.1}
            value={accessibility.wordSpacing}
            onValueChange={(val) => accessibility.setWordSpacing(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={paletteColors.border}
            accessibilityLabel="Word spacing slider"
            accessibilityHint={`Current spacing: ${accessibility.wordSpacing.toFixed(1)}`}
          />
          <Text style={[styles.sliderValue, { color: paletteColors.text }]}>
            {accessibility.wordSpacing.toFixed(1)}
          </Text>
        </View>
      </SettingSection>

      {/* TTS Speed Slider */}
      <SettingSection
        title="Reading Speed"
        icon="volume-high-outline"
        isExpanded={expandedSection === "ttsspeed"}
        onToggle={() => setExpandedSection(expandedSection === "ttsspeed" ? null : "ttsspeed")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={accessibility.ttsSpeed}
            onValueChange={(val) => accessibility.setTtsSpeed(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={paletteColors.border}
            accessibilityLabel="Reading speed slider"
            accessibilityHint={`Current speed: ${(accessibility.ttsSpeed * 100).toFixed(0)}%`}
          />
          <Text style={[styles.sliderValue, { color: paletteColors.text }]}>
            {(accessibility.ttsSpeed * 100).toFixed(0)}%
          </Text>
        </View>
        <Pressable
          style={[
            styles.testButton,
            { backgroundColor: colors.primary, marginTop: 12 },
          ]}
          accessibilityLabel="Test reading speed button"
          accessibilityHint="Press to hear a sample sentence"
        >
          <Ionicons name="play-outline" size={16} color="#0A0E1A" />
          <Text style={[styles.testButtonText, { color: "#0A0E1A" }]}>
            Test Reading
          </Text>
        </Pressable>
      </SettingSection>

      {/* Color Overlay Section */}
      <SettingSection
        title="Color Overlay"
        icon="color-filter-outline"
        isExpanded={expandedSection === "overlay"}
        onToggle={() => setExpandedSection(expandedSection === "overlay" ? null : "overlay")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <View style={styles.optionGrid}>
          {(["amber", "blue", "green", "pink", "purple", null] as const).map(
            (overlayColor) => (
              <Pressable
                key={overlayColor || "none"}
                onPress={() => accessibility.setColorOverlay(overlayColor)}
                style={[
                  styles.colorOptionButton,
                  {
                    backgroundColor:
                      accessibility.colorOverlay === overlayColor
                        ? colors.primary
                        : paletteColors.surface,
                    borderColor:
                      accessibility.colorOverlay === overlayColor
                        ? colors.primary
                        : paletteColors.border,
                    borderWidth: 2,
                  },
                ]}
                accessibilityLabel={`Color overlay: ${overlayColor || "none"}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: accessibility.colorOverlay === overlayColor }}
              >
                {overlayColor && (
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: getOverlayColor(overlayColor) },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.colorOptionText,
                    {
                      color:
                        accessibility.colorOverlay === overlayColor
                          ? "#0A0E1A"
                          : paletteColors.text,
                      fontWeight: accessibility.colorOverlay === overlayColor ? "700" : "500",
                    },
                  ]}
                >
                  {overlayColor ? overlayColor.charAt(0).toUpperCase() + overlayColor.slice(1) : "None"}
                </Text>
              </Pressable>
            )
          )}
        </View>
      </SettingSection>

      {/* Toggles Section */}
      <SettingSection
        title="Features & Support"
        icon="accessibility-outline"
        isExpanded={expandedSection === "features"}
        onToggle={() => setExpandedSection(expandedSection === "features" ? null : "features")}
        colors={colors}
        paletteColors={paletteColors}
      >
        <ToggleOption
          label="Auto-highlight Words"
          hint="Highlight words as they're being read"
          value={accessibility.autoHighlightWords}
          onToggle={(val) => accessibility.setAutoHighlightWords(val)}
          colors={colors}
          paletteColors={paletteColors}
        />

        <ToggleOption
          label="Reduce Animations"
          hint="Disable motion effects for comfort"
          value={accessibility.reduceMotion}
          onToggle={(val) => accessibility.setReduceMotion(val)}
          colors={colors}
          paletteColors={paletteColors}
        />

        <ToggleOption
          label="Reading Guide"
          hint="Show a reading ruler to follow along"
          value={accessibility.readingGuide}
          onToggle={(val) => accessibility.setReadingGuide(val)}
          colors={colors}
          paletteColors={paletteColors}
        />

        <ToggleOption
          label="Syllable Breaks"
          hint="Show syllable breaks in words"
          value={accessibility.syllableBreaks}
          onToggle={(val) => accessibility.setSyllableBreaks(val)}
          colors={colors}
          paletteColors={paletteColors}
        />

        <ToggleOption
          label="Screen Reader Optimized"
          hint="Optimize interface for screen readers"
          value={accessibility.screenReaderOptimized}
          onToggle={(val) => accessibility.setScreenReaderOptimized(val)}
          colors={colors}
          paletteColors={paletteColors}
        />
      </SettingSection>

      {/* Reset Button */}
      <Pressable
        style={[
          styles.resetButton,
          { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: colors.destructive },
        ]}
        onPress={() => {
          accessibility.resetToDefaults();
          accessibility.saveToStorage();
        }}
        accessibilityLabel="Reset to defaults button"
        accessibilityRole="button"
        accessibilityHint="Reset all accessibility settings to default values"
      >
        <Ionicons name="refresh-outline" size={20} color={colors.destructive} />
        <Text style={[styles.resetButtonText, { color: colors.destructive }]}>
          Reset to Defaults
        </Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/**
 * Setting Section Component
 */
function SettingSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  colors,
  paletteColors,
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  colors: any;
  paletteColors: any;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.sectionContainer,
        { backgroundColor: paletteColors.surface, borderColor: paletteColors.border },
      ]}
    >
      <Pressable
        style={styles.sectionHeader}
        onPress={onToggle}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.sectionTitleContainer}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: paletteColors.text }]}>{title}</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={paletteColors.textSecondary}
        />
      </Pressable>

      {isExpanded && <View style={styles.sectionContent}>{children}</View>}
    </Animated.View>
  );
}

/**
 * Toggle Option Component
 */
function ToggleOption({
  label,
  hint,
  value,
  onToggle,
  colors,
  paletteColors,
}: {
  label: string;
  hint: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
  paletteColors: any;
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        { borderBottomColor: paletteColors.border },
      ]}
    >
      <View style={styles.toggleContent}>
        <Text style={[styles.toggleLabel, { color: paletteColors.text }]}>
          {label}
        </Text>
        <Text style={[styles.toggleHint, { color: paletteColors.textSecondary }]}>
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: paletteColors.border, true: colors.primary }}
        thumbColor={value ? "#FFF" : paletteColors.muted}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

/**
 * Get overlay color for preview
 */
function getOverlayColor(color: string): string {
  const colors: Record<string, string> = {
    amber: "rgba(217, 119, 6, 0.2)",
    blue: "rgba(30, 58, 138, 0.2)",
    green: "rgba(20, 83, 45, 0.2)",
    pink: "rgba(190, 24, 93, 0.2)",
    purple: "rgba(88, 28, 135, 0.2)",
  };
  return colors[color] || colors.amber;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  previewLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionContainer: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: "30%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 13,
    textAlign: "center",
  },
  colorOptionButton: {
    flex: 1,
    minWidth: "28%",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginBottom: 6,
  },
  colorOptionText: {
    fontSize: 12,
    textAlign: "center",
  },
  sliderContainer: {
    gap: 8,
  },
  slider: {
    height: 40,
    width: "100%",
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 12,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AccessibilityPanel;
