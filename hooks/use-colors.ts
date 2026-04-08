import { useColorScheme } from "react-native";

interface Colors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  card: string;
  destructive: string;
  success: string;
  warning: string;
}

export function useColors(): Colors {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    primary: "#FFD700", // Gold
    secondary: "#FF6B6B", // Coral
    accent: "#48C9B0", // Teal
    background: isDark ? "#0A0E1A" : "#FFFFFF",
    surface: isDark ? "#1A1E2E" : "#F8F9FA",
    foreground: isDark ? "#FFFFFF" : "#0A0E1A",
    text: isDark ? "#FFFFFF" : "#1F2937",
    textSecondary: isDark ? "#9CA3AF" : "#6B7280",
    muted: isDark ? "#6B7280" : "#9CA3AF",
    border: isDark ? "#374151" : "#E5E7EB",
    card: isDark ? "#1F2937" : "#FFFFFF",
    destructive: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
  };
}
