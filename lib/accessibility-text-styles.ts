import { TextStyle, Platform } from "react-native";
import { useAccessibilityStore } from "./accessibility-store";

/**
 * Computed text styles based on accessibility settings
 */
export function getAccessibleTextStyle(
  baseSize: number = 16
): TextStyle {
  const store = useAccessibilityStore();
  const {
    fontMode,
    textSize,
    lineSpacing,
    letterSpacing,
    contrastMode,
  } = store;

  // Base font size with scaling
  const scaledSize = baseSize * textSize;

  // Font family selection with fallbacks
  let fontFamily: string;
  switch (fontMode) {
    case "dyslexia":
      // Use OpenDyslexic if available, else system
      fontFamily = Platform.select({
        ios: "OpenDyslexic",
        android: "OpenDyslexic",
        default: "System",
      }) || "System";
      break;
    case "large-print":
      fontFamily = Platform.select({
        ios: "Georgia",
        android: "serif",
        default: "serif",
      });
      break;
    default:
      fontFamily = Platform.select({
        ios: "System",
        android: "Roboto",
        default: "System",
      });
  }

  // Color selection based on contrast mode
  let color: string;
  switch (contrastMode) {
    case "high-contrast":
      color = "#000000";
      break;
    case "dark":
      color = "#FFFFFF";
      break;
    case "sepia":
      color = "#3E2723";
      break;
    default:
      color = "#1F2937";
  }

  return {
    fontSize: scaledSize,
    lineHeight: scaledSize * lineSpacing,
    letterSpacing,
    fontFamily,
    color,
  };
}

/**
 * Get heading styles with accessibility adjustments
 */
export function getAccessibleHeadingStyle(
  level: 1 | 2 | 3 = 1
): TextStyle {
  const headingSizes: Record<number, number> = {
    1: 28,
    2: 24,
    3: 20,
  };
  return {
    ...getAccessibleTextStyle(headingSizes[level]),
    fontWeight: "700" as const,
  };
}

/**
 * Get body text styles
 */
export function getAccessibleBodyStyle(): TextStyle {
  return getAccessibleTextStyle(16);
}

/**
 * Get caption/small text styles
 */
export function getAccessibleCaptionStyle(): TextStyle {
  return {
    ...getAccessibleTextStyle(12),
    fontWeight: "400" as const,
  };
}

/**
 * Color palette based on contrast mode
 */
export interface AccessibleColorPalette {
  text: string;
  textSecondary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  destructive: string;
  border: string;
  muted: string;
}

export function getAccessibleColorPalette(
  contrastMode: "normal" | "high-contrast" | "dark" | "sepia"
): AccessibleColorPalette {
  const palettes: Record<string, AccessibleColorPalette> = {
    normal: {
      text: "#1F2937",
      textSecondary: "#6B7280",
      background: "#FFFFFF",
      surface: "#F8F9FA",
      surfaceAlt: "#F3F4F6",
      primary: "#FFD700",
      secondary: "#FF6B6B",
      accent: "#48C9B0",
      success: "#10B981",
      warning: "#F59E0B",
      destructive: "#EF4444",
      border: "#E5E7EB",
      muted: "#9CA3AF",
    },
    "high-contrast": {
      text: "#000000",
      textSecondary: "#000000",
      background: "#FFFFFF",
      surface: "#F0F0F0",
      surfaceAlt: "#E0E0E0",
      primary: "#0000FF",
      secondary: "#FF0000",
      accent: "#008000",
      success: "#006400",
      warning: "#FF4500",
      destructive: "#FF0000",
      border: "#000000",
      muted: "#333333",
    },
    dark: {
      text: "#FFFFFF",
      textSecondary: "#D1D5DB",
      background: "#0A0E1A",
      surface: "#1A1E2E",
      surfaceAlt: "#1F2937",
      primary: "#60A5FA",
      secondary: "#FB7185",
      accent: "#10B981",
      success: "#34D399",
      warning: "#FBBF24",
      destructive: "#F87171",
      border: "#374151",
      muted: "#9CA3AF",
    },
    sepia: {
      text: "#3E2723",
      textSecondary: "#5D4037",
      background: "#F5E6D3",
      surface: "#EDD5C4",
      surfaceAlt: "#E8CDB8",
      primary: "#D2691E",
      secondary: "#BC6C25",
      accent: "#8B6F47",
      success: "#6B5344",
      warning: "#A0522D",
      destructive: "#8B4513",
      border: "#A1887F",
      muted: "#8D6E63",
    },
  };

  return palettes[contrastMode] || palettes.normal;
}

/**
 * Get styles for story text with all accessibility features applied
 */
export function getStoryTextStyle(
  fontMode: "standard" | "dyslexia" | "large-print",
  textSize: number,
  lineSpacing: number,
  letterSpacing: number,
  contrastMode: "normal" | "high-contrast" | "dark" | "sepia"
): TextStyle {
  const baseStyle = getAccessibleTextStyle(16);
  const colors = getAccessibleColorPalette(contrastMode);

  return {
    ...baseStyle,
    color: colors.text,
    paddingHorizontal: 16,
    marginVertical: 4,
  };
}

/**
 * Check if accessibility settings require special handling
 */
export function hasAccessibilityNeeds(
  fontMode: string,
  contrastMode: string,
  textSize: number,
  readingGuide: boolean,
  colorOverlay: string | null
): boolean {
  return (
    fontMode !== "standard" ||
    contrastMode !== "normal" ||
    textSize !== 1.0 ||
    readingGuide ||
    colorOverlay !== null
  );
}
