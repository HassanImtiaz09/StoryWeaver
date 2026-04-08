import { Ionicons } from "@expo/vector-icons";
import React from "react";

type IconSymbolProps = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
  style?: any;
};

export const IconSymbol: React.FC<IconSymbolProps> = ({
  name,
  size = 24,
  color = "black",
  style,
}) => {
  return <Ionicons name={name} size={size} color={color} style={style} />;
};
