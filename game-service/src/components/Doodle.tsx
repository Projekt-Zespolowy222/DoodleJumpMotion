// src/components/Doodle.tsx
import React from "react";
import { View, StyleSheet, Image } from "react-native";

interface DoodleProps {
  size: number;
}

export const Doodle = ({ size, texture }: { size: number; texture: any }) => (
  <Image
    source={texture}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

const styles = StyleSheet.create({
  doodle: {
    position: "absolute",
    backgroundColor: "green",
    borderRadius: 10,
  },
});
