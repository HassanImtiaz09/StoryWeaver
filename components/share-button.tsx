import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
} from "react-native";

interface ShareButtonProps {
  onPress: () => void;
  shareCount?: number;
  isLoading?: boolean;
  size?: "small" | "medium" | "large";
  position?: "floating" | "inline";
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  onPress,
  shareCount = 0,
  isLoading = false,
  size = "medium",
  position = "floating",
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const sizeConfig = {
    small: {
      width: 44,
      height: 44,
      fontSize: 12,
      iconSize: 20,
    },
    medium: {
      width: 56,
      height: 56,
      fontSize: 14,
      iconSize: 24,
    },
    large: {
      width: 64,
      height: 64,
      fontSize: 16,
      iconSize: 28,
    },
  };

  const config = sizeConfig[size];

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  const handlePress = () => {
    handlePressOut();
    onPress();
  };

  if (position === "floating") {
    return (
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            width: config.width,
            height: config.height,
          },
          animatedStyle,
        ]}
      >
        <Pressable
          style={[
            styles.floatingButton,
            {
              width: config.width,
              height: config.height,
            },
            isPressed && styles.floatingButtonPressed,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isLoading}
        >
          <Text style={{ fontSize: config.iconSize }}>
            {isLoading ? "⏳" : "📤"}
          </Text>

          {shareCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {shareCount > 99 ? "99+" : shareCount}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // Inline variant
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.inlineButton,
          {
            height: config.height,
          },
          isPressed && styles.inlineButtonPressed,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
      >
        <Text style={{ fontSize: config.iconSize, marginRight: 8 }}>
          {isLoading ? "⏳" : "📤"}
        </Text>
        <Text
          style={[
            styles.inlineButtonText,
            { fontSize: config.fontSize },
          ]}
        >
          Share
        </Text>
        {shareCount > 0 && (
          <Text
            style={[
              styles.shareCountText,
              { fontSize: config.fontSize - 2, marginLeft: 4 },
            ]}
          >
            ({shareCount})
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6366F1",
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  floatingButtonPressed: {
    backgroundColor: "#4F46E5",
  },
  inlineButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  inlineButtonPressed: {
    backgroundColor: "#4F46E5",
  },
  inlineButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  shareCountText: {
    color: "#E0E7FF",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
});
