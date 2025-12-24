// src/components/Platform.tsx
import React from "react";
import { View, StyleSheet } from "react-native";

interface PlatformProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Platform: React.FC<PlatformProps> = ({ x, y, width, height }) => {
  return (
    <View style={[styles.platform, { left: x, bottom: y, width, height }]} />
  );
};

const styles = StyleSheet.create({
  platform: {
    position: "absolute",
    backgroundColor: "brown",
  },
});
