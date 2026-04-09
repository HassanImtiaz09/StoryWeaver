import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { TextStyles, FontFamily, getStoryTextExtras } from '@/lib/typography';
import { useThemeContext } from '@/lib/theme-provider';
import { Colors } from '@/lib/_core/theme';
import { useTypography } from '@/hooks/use-typography';

interface StyledTextProps extends TextProps {
  color?: string;
  children: React.ReactNode;
}

// ─── Story Title (Baloo 2 Bold, theme primary) ──────────────
export function StoryTitle({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.screenTitle, { color: color || colors.primary }, style]}
    />
  );
}

// ─── Screen Title (Baloo 2 Bold, large, theme primary) ──────
export function ScreenTitle({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.screenTitle, { color: color || colors.primary }, style]}
    />
  );
}

// ─── Section Header (Baloo 2 SemiBold) ──────────────────────
export function SectionHeader({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.sectionHeader, { color: color || colors.foreground }, style]}
    />
  );
}

// ─── Body Text (Quicksand Regular) ──────────────────────────
export function BodyText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.bodyRegular, { color: color || colors.text }, style]}
    />
  );
}

// ─── Large Body Text ────────────────────────────────────────
export function BodyTextLarge({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.bodyLarge, { color: color || colors.text }, style]}
    />
  );
}

// ─── Small Body Text ────────────────────────────────────────
export function BodyTextSmall({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.bodySmall, { color: color || colors.textSecondary }, style]}
    />
  );
}

// ─── Story Narrative (PatrickHand, with word-spacing) ───────
interface StoryNarrativeProps extends StyledTextProps {
  /** Optional child age for age-adaptive sizing (3-5 gets larger text) */
  childAge?: number;
}

export function StoryNarrative({ color, style, childAge, ...props }: StoryNarrativeProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts, storyExtras } = useTypography(childAge);

  return (
    <Text
      {...props}
      style={[
        ts.storyText,
        {
          color: color || colors.foreground,
          wordSpacing: storyExtras.wordSpacing,
        },
        style,
      ]}
    />
  );
}

// ─── Large Story Narrative ──────────────────────────────────
export function StoryNarrativeLarge({ color, style, childAge, ...props }: StoryNarrativeProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts, storyExtras } = useTypography(childAge);

  return (
    <Text
      {...props}
      style={[
        ts.storyTextLarge,
        {
          color: color || colors.foreground,
          wordSpacing: storyExtras.wordSpacing,
        },
        style,
      ]}
    />
  );
}

// ─── Fun Text (BubblegumSans, for badges) ───────────────────
export function FunText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.badge, { color: color || colors.primary }, style]}
    />
  );
}

// ─── Celebration Text ───────────────────────────────────────
export function CelebrationText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.celebration, { color: color || colors.primary }, style]}
    />
  );
}

// ─── Streak Count ───────────────────────────────────────────
export function StreakCount({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.streakCount, { color: color || colors.primary }, style]}
    />
  );
}

// ─── Button Text (Baloo 2 SemiBold) ─────────────────────────
export function ButtonText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.buttonPrimary, { color: color || colors.foreground }, style]}
    />
  );
}

// ─── Button Text Secondary ──────────────────────────────────
export function ButtonTextSecondary({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.buttonSecondary, { color: color || colors.text }, style]}
    />
  );
}

// ─── Caption Text ───────────────────────────────────────────
export function CaptionText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.caption, { color: color || colors.textSecondary }, style]}
    />
  );
}

// ─── Metadata Text ──────────────────────────────────────────
export function MetadataText({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.metadata, { color: color || colors.muted }, style]}
    />
  );
}

// ─── Card Title ─────────────────────────────────────────────
export function CardTitle({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.cardTitle, { color: color || colors.foreground }, style]}
    />
  );
}

// ─── Tab Label ──────────────────────────────────────────────
export function TabLabel({ color, style, ...props }: StyledTextProps) {
  const { colorScheme } = useThemeContext();
  const colors = Colors[colorScheme];
  const { styles: ts } = useTypography();

  return (
    <Text
      {...props}
      style={[ts.tabLabel, { color: color || colors.tabIconDefault }, style]}
    />
  );
}
