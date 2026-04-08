import React from "react";
import { SafeAreaView, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenContainerProps extends ViewProps {
  containerClassName?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  children: React.ReactNode;
}

export function ScreenContainer({
  containerClassName = "bg-white dark:bg-slate-950",
  edges = ["top", "bottom", "left", "right"],
  className = "",
  children,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      edges={edges}
      className={containerClassName}
      style={{
        flex: 1,
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
