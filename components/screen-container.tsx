import React from "react";
import { SafeAreaView, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";

interface ScreenContainerProps extends ViewProps {
  containerClassName?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  children: React.ReactNode;
  /** Optional child age for age-adaptive background theming */
  childAge?: number;
}

export function ScreenContainer({
  containerClassName,
  edges = ["top", "bottom", "left", "right"],
  className = "",
  children,
  childAge,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors(childAge);

  return (
    <SafeAreaView
      edges={edges}
      className={containerClassName}
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: edges.includes("top") ? 0 : insets.top,
        paddingBottom: edges.includes("bottom") ? 0 : insets.bottom,
        paddingLeft: edges.includes("left") ? 0 : insets.left,
        paddingRight: edges.includes("right") ? 0 : insets.right,
      }}
    >
      <View className={`flex-1 ${className}`} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
