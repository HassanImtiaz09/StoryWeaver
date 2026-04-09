import React, { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  interpolate,
  cancelAnimation,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getSettings, type AppSettings } from "@/lib/settings-store";

// ─── Animated Tab Icon wrapper ────────────────────────────────
function AnimatedTabIcon({
  icon,
  focused,
  reduceMotion,
}: {
  icon: React.ReactNode;
  focused: boolean;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);

  useEffect(() => {
    if (!reduceMotion) {
      if (focused) {
        scale.value = withSpring(1.15, { damping: 10, stiffness: 200, mass: 0.8 });
        translateY.value = withSpring(-2, { damping: 10, stiffness: 200 });
      } else {
        scale.value = withSpring(1, { damping: 10, stiffness: 200, mass: 0.8 });
        translateY.value = withSpring(0, { damping: 10, stiffness: 200 });
      }
    } else {
      scale.value = focused ? 1.15 : 1;
      translateY.value = focused ? -2 : 0;
    }
  }, [focused, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{icon}</Animated.View>;
}

// ─── Badge indicator component ─────────────────────────────────
function TabBadge({ count, colors }: { count: number; colors: any }) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.error || "#DC2626" },
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ─── Floating Action Button (Create) ──────────────────────────
function CreateFAB({ colors }: { colors: any }) {
  const router = useRouter();
  const scale = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    // Bouncy entrance animation
    scale.value = withSpring(1, {
      damping: 8,
      stiffness: 120,
      mass: 0.8,
    });

    // Gentle glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.8], [1.0, 1.35]) }],
  }));

  const handlePress = () => {
    // Bounce on press
    scale.value = withSequence(
      withSpring(0.85, { damping: 15, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    router.push("/(tabs)/create");
  };

  return (
    <View style={styles.fabWrapper}>
      {/* Gold glow layer */}
      <Animated.View
        style={[
          styles.fabGlow,
          { backgroundColor: colors.primary },
          glowStyle,
        ]}
      />
      {/* Main FAB */}
      <Animated.View style={[styles.fabContainer, fabStyle]}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
          ]}
          accessibilityLabel="Create a new story"
          accessibilityRole="button"
          accessibilityHint="Opens the story creation screen"
        >
          <Ionicons name="add" size={32} color="#0A0E1A" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main Tab Layout ───────────────────────────────────────────
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const [navMode, setNavMode] = useState<"parent" | "child">("parent");
  const [libraryBadge, setLibraryBadge] = useState(0);
  const [galleryBadge, setGalleryBadge] = useState(0);

  // Load nav mode setting on focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const settings = await getSettings();
        setNavMode(settings.navMode || "parent");
      })();
    }, [])
  );

  // Simulate badge counts (in a real app these come from the server)
  // This provides the hook for real badge data to slot in
  useEffect(() => {
    // Placeholder: check for unread stories and new gallery items
    // In production, these would come from tRPC queries or push notification state
    const checkBadges = async () => {
      try {
        // Library: count of unread/new story episodes
        // Gallery: count of new community stories since last visit
        // For now, store the last-viewed timestamps and compare
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const lastLibraryVisit = await AsyncStorage.getItem("sw_last_library_visit");
        const lastGalleryVisit = await AsyncStorage.getItem("sw_last_gallery_visit");

        // If user has never visited, show a welcome badge
        if (!lastLibraryVisit) setLibraryBadge(0);
        if (!lastGalleryVisit) setGalleryBadge(0);
      } catch {
        // Badge counts are non-critical
      }
    };
    checkBadges();
  }, []);

  const isChildMode = navMode === "child";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: (isChildMode ? 72 : 64) + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: isChildMode ? 15 : 13,
          fontWeight: "600",
          marginTop: isChildMode ? 2 : 4,
        },
        headerShown: false,
        tabBarShowLabel: true,
        // Smooth tab transition animation (fade when switching screens)
        animation: "shift" as any,
        lazy: false, // Pre-render all tabs for smoother transitions
      }}
    >
      {/* Home / Stories Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: isChildMode ? "Stories" : "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              reduceMotion={reduceMotion}
              icon={
                <Ionicons
                  name="home"
                  color={color}
                  size={isChildMode ? size + 4 : size}
                />
              }
            />
          ),
          tabBarLabel: isChildMode ? "Stories" : "Home",
        }}
      />

      {/* Library Tab - hidden in child mode */}
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              reduceMotion={reduceMotion}
              icon={
                <View>
                  <Ionicons name="book-outline" color={color} size={size} />
                  <TabBadge count={libraryBadge} colors={colors} />
                </View>
              }
            />
          ),
          tabBarLabel: "Library",
          ...(isChildMode
            ? {
                tabBarButton: () => null,
                href: null,
              }
            : {}),
        }}
        listeners={{
          tabPress: () => {
            setLibraryBadge(0);
            // Mark visit timestamp
            try {
              const AsyncStorage = require("@react-native-async-storage/async-storage").default;
              AsyncStorage.setItem("sw_last_library_visit", new Date().toISOString());
            } catch {}
          },
        }}
      />

      {/* Create Tab - FAB in parent mode, large icon in child mode */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, focused }) =>
            isChildMode ? (
              <AnimatedTabIcon
                focused={focused}
                reduceMotion={reduceMotion}
                icon={
                  <Ionicons
                    name={focused ? "add-circle" : "add-circle-outline"}
                    color={color}
                    size={32}
                  />
                }
              />
            ) : null,
          tabBarLabel: isChildMode ? "Create" : () => null,
          ...(isChildMode
            ? {}
            : {
                tabBarButton: () => <CreateFAB colors={colors} />,
              }),
        }}
      />

      {/* Gallery Tab - hidden in child mode */}
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              reduceMotion={reduceMotion}
              icon={
                <View>
                  <Ionicons name="images-outline" color={color} size={size} />
                  <TabBadge count={galleryBadge} colors={colors} />
                </View>
              }
            />
          ),
          tabBarLabel: "Gallery",
          ...(isChildMode
            ? {
                tabBarButton: () => null,
                href: null,
              }
            : {}),
        }}
        listeners={{
          tabPress: () => {
            setGalleryBadge(0);
            try {
              const AsyncStorage = require("@react-native-async-storage/async-storage").default;
              AsyncStorage.setItem("sw_last_gallery_visit", new Date().toISOString());
            } catch {}
          },
        }}
      />

      {/* Family / Me Tab */}
      <Tabs.Screen
        name="family"
        options={{
          title: isChildMode ? "Me" : "Family",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              reduceMotion={reduceMotion}
              icon={
                <Ionicons
                  name={isChildMode ? "person" : "people-outline"}
                  color={color}
                  size={isChildMode ? size + 4 : size}
                />
              }
            />
          ),
          tabBarLabel: isChildMode ? "Me" : "Family",
        }}
      />
    </Tabs>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Badge
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#0A0E1A",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
  },

  // FAB
  fabWrapper: {
    position: "relative",
    top: -20,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  fabGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
