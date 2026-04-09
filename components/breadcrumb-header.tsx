import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeIn } from "react-native-reanimated";

export interface BreadcrumbItem {
  label: string;
  /** Route to navigate to when tapped. If omitted, the item is the current page (non-tappable). */
  route?: string;
  /** Route params */
  params?: Record<string, string>;
}

interface BreadcrumbHeaderProps {
  /** Title shown prominently below the breadcrumb trail */
  title: string;
  /** Breadcrumb trail from root to current screen */
  crumbs: BreadcrumbItem[];
  /** Optional right-side action */
  rightAction?: React.ReactNode;
}

/**
 * Breadcrumb navigation header for deep screens.
 *
 * Usage:
 * ```tsx
 * <BreadcrumbHeader
 *   title="Language Settings"
 *   crumbs={[
 *     { label: "Home", route: "/(tabs)" },
 *     { label: "Settings", route: "/settings" },
 *     { label: "Language Settings" },
 *   ]}
 * />
 * ```
 */
export function BreadcrumbHeader({
  title,
  crumbs,
  rightAction,
}: BreadcrumbHeaderProps) {
  const router = useRouter();
  const colors = useColors();

  const handleBack = () => {
    router.back();
  };

  const handleCrumbPress = (crumb: BreadcrumbItem) => {
    if (!crumb.route) return;
    router.push({
      pathname: crumb.route as any,
      params: crumb.params,
    });
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Top row: back button + breadcrumb trail */}
      <View style={styles.topRow}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.crumbTrail}>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            const isTappable = !!crumb.route && !isLast;

            return (
              <View key={index} style={styles.crumbItem}>
                {index > 0 && (
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={colors.muted}
                    style={styles.crumbSeparator}
                  />
                )}
                {isTappable ? (
                  <Pressable
                    onPress={() => handleCrumbPress(crumb)}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text
                      style={[styles.crumbText, { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {crumb.label}
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={[
                      styles.crumbText,
                      styles.crumbTextCurrent,
                      { color: colors.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {crumb.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {rightAction ? (
          <View style={styles.rightAction}>{rightAction}</View>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Title row */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  crumbTrail: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  crumbItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  crumbSeparator: {
    marginHorizontal: 4,
  },
  crumbText: {
    fontSize: 12,
    fontWeight: "600",
  },
  crumbTextCurrent: {
    fontWeight: "400",
  },
  rightAction: {
    width: 28,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    paddingLeft: 32,
  },
});
