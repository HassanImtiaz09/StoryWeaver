import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load custom fonts - these are optional and can fail gracefully
  let fontsLoaded = true;
  try {
    const result = useFonts({
      "Baloo2-Regular": require("@/assets/fonts/Baloo2-Regular.ttf"),
      "Baloo2-Bold": require("@/assets/fonts/Baloo2-Bold.ttf"),
      "Baloo2-SemiBold": require("@/assets/fonts/Baloo2-SemiBold.ttf"),
      "Quicksand-Regular": require("@/assets/fonts/Quicksand-Regular.ttf"),
      "Quicksand-Bold": require("@/assets/fonts/Quicksand-Bold.ttf"),
      "PatrickHand-Regular": require("@/assets/fonts/PatrickHand-Regular.ttf"),
      "BubblegumSans-Regular": require("@/assets/fonts/BubblegumSans-Regular.ttf"),
    });
    fontsLoaded = result[0];
  } catch (error) {
    // Fonts not available - use system fonts instead
    fontsLoaded = true;
    console.warn("Custom fonts not available, using system fonts");
  }

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {/* Tabs layout */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Modal screens */}
        <Stack.Screen
          name="story-detail"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="new-story"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="settings"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="achievements"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="language-settings"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="offline-settings"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="analytics"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="parent-tools"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="print-book"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="create-character"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="collaborative-story"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen
          name="story-share"
          options={{
            presentation: "card",
            headerShown: false,
            animationEnabled: true,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
