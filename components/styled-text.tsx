import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { TextStyles, FontFamily } from '@/lib/typography';
import { useThemeContext } from '@/lib/theme-provider';
import { Colors } from '@/lib/_core/theme';

interface StyledTextProps extends TextProps {
  color?: string;
  children: React.ReactNode;
}

// Story Title - for story names (Baloo 2 Bold, gold)
export function StoryTitle({ color, style, ...props }: StyledTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.storyTitle,
        TextStyles.screenTitle,
        color && { color },
        style,
      ]}
    />
  );
}

// Section Header - for section headings (Baloo 2 SemiBold)
export function SectionHeader({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.sectionHeader,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

// Body Text - for regular text (Quicksand Regular)
export function BodyText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.bodyRegular,
        { color: color || colors.text },
        style,
      ]}
    />
  );
}

// Large Body Text variant
export function BodyTextLarge({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.bodyLarge,
        { color: color || colors.text },
        style,
      ]}
    />
  );
}

// Small Body Text variant
export function BodyTextSmall({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.bodySmall,
        { color: color || colors.textSecondary },
        style,
      ]}
    />
  );
}

// Story Narrative - for story reading (Patrick Hand)
export function StoryNarrative({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.storyText,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

// Large Story Narrative variant
export function StoryNarrativeLarge({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.storyTextLarge,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

// Fun Text - for badges/celebrations (Bubblegum Sans)
export function FunText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.badge,
        { color: color || colors.primary },
        style,
      ]}
    />
  );
}

// Celebration Text - larger fun text
export function CelebrationText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.celebration,
        { color: color || colors.primary },
        style,
      ]}
    />
  );
}

// Streak Count - largest fun text
export function StreakCount({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.streakCount,
        { color: color || colors.primary },
        style,
      ]}
    />
  );
}

// Button Text - for button labels (Baloo 2 SemiBold)
export function ButtonText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.buttonPrimary,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

// Button Text Secondary variant
export function ButtonTextSecondary({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.buttonSecondary,
        { color: color || colors.text },
        style,
      ]}
    />
  );
}

// Caption Text - for small labels (Quicksand Regular, small)
export function CaptionText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.caption,
        { color: color || colors.textSecondary },
        style,
      ]}
    />
  );
}

// Metadata Text - for timestamps/metadata
export function MetadataText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.metadata,
        { color: color || colors.muted },
        style,
      ]}
    />
  );
}

// Card Title - for card headers
export function CardTitle({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.cardTitle,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

// Tab Label - for navigation tabs
export function TabLabel({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.tabLabel,
        { color: color || colors.tabIconDefault },
        style,
      ]}
    />
  );
}

// Screen Title - for screen headings (Baloo 2 Bold, large)
export function ScreenTitle({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];

  return (
    <Text
      {...props}
      style={[
        TextStyles.screenTitle,
        { color: color || colors.foreground },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  storyTitle: {
    // Additional styles for story title if needed
  },
});
