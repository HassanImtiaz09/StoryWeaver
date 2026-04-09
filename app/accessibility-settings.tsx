// @ts-nocheck
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { AccessibilityPanel } from "@/components/accessibility-panel";
import { useAccessibilityStore } from "@/lib/accessibility-store";
import { getAccessibleColorPalette } from "@/lib/accessibility-text-styles";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BreadcrumbHeader } from "@/components/breadcrumb-header";

/**
 * Accessibility Settings Screen
 * Full screen interface for managing all accessibility settings
 * with explanations and resources
 */
export default function AccessibilitySettingsScreen() {
  const router = useRouter();
  const appColors = useColors();
  const accessibility = useAccessibilityStore();
  const paletteColors = getAccessibleColorPalette(accessibility.contrastMode);

  // Load saved settings on mount
  useEffect(() => {
    accessibility.loadFromStorage();
  }, [accessibility]);

  // Save settings whenever they change
  const handleSettingChange = async () => {
    await accessibility.saveToStorage();
  };

  return (
    <ScreenContainer
      style={{ backgroundColor: paletteColors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb Header */}
        <BreadcrumbHeader
          title="Accessibility"
          crumbs={[
            { label: "Home", route: "/(tabs)" },
            { label: "Settings", route: "/settings" },
            { label: "Accessibility" },
          ]}
        />

        {/* Quick Info Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={[
            styles.infoSection,
            {
              backgroundColor: paletteColors.surface,
              borderColor: paletteColors.border,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={appColors.primary} />
            <Text style={[styles.infoTitle, { color: paletteColors.text }]}>
              About Accessibility Features
            </Text>
          </View>
          <Text style={[styles.infoText, { color: paletteColors.textSecondary }]}>
            StoryWeaver includes comprehensive accessibility features designed to make reading
            enjoyable for every child, including those with dyslexia, visual stress, or other
            reading challenges.
          </Text>
        </Animated.View>

        {/* Main Settings Panel */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={{ marginVertical: 16 }}
        >
          <AccessibilityPanel />
        </Animated.View>

        {/* Feature Explanations */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
        >
          <Text style={[styles.sectionTitle, { color: paletteColors.text }]}>
            Feature Guide
          </Text>

          <FeatureExplanation
            icon="text-outline"
            title="Font Styles"
            description={`Standard: Normal system font.\nDyslexia: OpenDyslexic font designed to improve readability for dyslexic readers.\nLarge: Large, bold serif font for early readers.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="contrast-outline"
            title="Contrast & Color"
            description={`Normal: Standard app colors.\nHigh Contrast: Black text on white background with no gradients.\nDark: Light text on dark background with blue tint for nighttime.\nSepia: Dark brown on warm cream for visual comfort.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="text-outline"
            title="Text Spacing"
            description={`Adjust line spacing, letter spacing, and word spacing to suit your child's reading preferences. Increased spacing can help with tracking and reducing visual stress.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="volume-high-outline"
            title="Reading Speed"
            description={`Control the speed of text-to-speech audio narration. Slower speeds help with comprehension and learning. Test the feature to find the perfect pace.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="highlight-outline"
            title="Auto-Highlight Words"
            description={`When enabled, words are highlighted as they are read aloud. This helps children follow along and improves comprehension of the audio narration.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="eye-off-outline"
            title="Reading Guide"
            description={`Shows a transparent ruler that follows the text. Drag it up and down to help your child maintain focus on one line at a time.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="layers-outline"
            title="Syllable Breaks"
            description={`Shows words broken into syllables (e.g., "ad-ven-ture"). Perfect for early readers learning to decode words and improving phonemic awareness.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="color-filter-outline"
            title="Color Overlay"
            description={`A semi-transparent colored filter to reduce visual stress (Irlen syndrome). Try different colors to find what works best for your child's vision.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="accessibility-outline"
            title="Screen Reader Optimization"
            description={`Optimizes the interface for screen readers and other assistive technologies. Provides additional labels and hints for accessibility.`}
            colors={paletteColors}
            appColors={appColors}
          />

          <FeatureExplanation
            icon="accessibility-outline"
            title="Reduce Animations"
            description={`Disables motion effects and animations throughout the app. Helpful for children sensitive to motion or with vestibular disorders.`}
            colors={paletteColors}
            appColors={appColors}
          />
        </Animated.View>

        {/* Learning Resources */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.resourcesSection}
        >
          <Text style={[styles.sectionTitle, { color: paletteColors.text }]}>
            Learn More
          </Text>

          <ResourceLink
            title="Understanding Dyslexia"
            description="Learn about dyslexia and how font changes can help"
            colors={paletteColors}
            appColors={appColors}
          />

          <ResourceLink
            title="Visual Stress (Irlen Syndrome)"
            description="Information about visual stress and how color overlays help"
            colors={paletteColors}
            appColors={appColors}
          />

          <ResourceLink
            title="Accessibility Best Practices"
            description="Tips for using accessibility features effectively"
            colors={paletteColors}
            appColors={appColors}
          />
        </Animated.View>

        {/* Version Info */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          style={[
            styles.versionSection,
            {
              backgroundColor: paletteColors.surface,
              borderColor: paletteColors.border,
            },
          ]}
        >
          <Text style={[styles.versionText, { color: paletteColors.textSecondary }]}>
            StoryWeaver Accessibility v1.0
          </Text>
          <Text style={[styles.versionSubtext, { color: paletteColors.muted }]}>
            Settings are automatically saved to your device
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Feature Explanation Component
 */
function FeatureExplanation({
  icon,
  title,
  description,
  colors,
  appColors,
}: {
  icon: string;
  title: string;
  description: string;
  colors: any;
  appColors: any;
}) {
  return (
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.featureHeader}>
        <Ionicons name={icon as any} size={20} color={appColors.primary} />
        <Text style={[styles.featureTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

/**
 * Resource Link Component
 */
function ResourceLink({
  title,
  description,
  colors,
  appColors,
}: {
  title: string;
  description: string;
  colors: any;
  appColors: any;
}) {
  return (
    <Pressable
      style={[
        styles.resourceCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      accessibilityLabel={title}
      accessibilityRole="link"
      accessibilityHint={description}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.resourceTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.resourceDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={appColors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  infoSection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 24,
  },
  featureCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  resourcesSection: {
    marginTop: 20,
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 12,
  },
  versionSection: {
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  versionText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 11,
  },
});

export default AccessibilitySettingsScreen;
