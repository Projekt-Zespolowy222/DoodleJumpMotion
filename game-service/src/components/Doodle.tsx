// src/components/Doodle.tsx
import React from "react";
import { View, StyleSheet } from "react-native";

interface DoodleProps {
  x: number;
  y: number;
  size: number;
}

export const Doodle: React.FC<DoodleProps> = ({ x, y, size }) => {
  return (
    <View
      style={[styles.doodle, { left: x, bottom: y, width: size, height: size }]}
    />
  );
};

const styles = StyleSheet.create({
  doodle: {
    position: "absolute",
    backgroundColor: "green",
    borderRadius: 10,
  },
});
