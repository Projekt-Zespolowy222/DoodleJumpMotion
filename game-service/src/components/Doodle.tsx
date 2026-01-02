// src/components/Doodle.tsx
import React from "react";
import { View, StyleSheet } from "react-native";

interface DoodleProps {
  size: number;
}

export const Doodle: React.FC<DoodleProps> = ({ size }) => {
  return <View style={[styles.doodle, { width: size, height: size }]} />;
};

const styles = StyleSheet.create({
  doodle: {
    position: "absolute",
    backgroundColor: "green",
    borderRadius: 10,
  },
});
