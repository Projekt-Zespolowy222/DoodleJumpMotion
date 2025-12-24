// src/components/Score.tsx
import React, { useEffect, useState } from "react";
import { Text, StyleSheet, Platform as RNPlatform } from "react-native";

interface ScoreProps {
  y: number; // текущий счет
}

const fontFamily = RNPlatform.select({ ios: "Helvetica", default: "serif" });

export const Score: React.FC<ScoreProps> = ({ y }) => {
  return <Text style={styles.score}>Score: {y}</Text>;
};

const styles = StyleSheet.create({
  score: {
    position: "absolute",
    left: 16,
    top: 50,
    fontSize: 18,
    color: "white",
    fontFamily,
    zIndex: 100,
  },
});
