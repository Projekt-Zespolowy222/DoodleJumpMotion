import React from "react";
import { Text, StyleSheet, Platform as RNPlatform, View } from "react-native";

interface ScoreProps {
  y: number;
  opponentY?: number;
}

const fontFamily = RNPlatform.select({
  ios: "Helvetica",
  android: "sans-serif",
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: "sans-serif",
});

export const Score: React.FC<ScoreProps> = ({ y, opponentY }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.score}>You: {y}</Text>
      {opponentY !== undefined && (
        <Text style={[styles.score, styles.opponent]}>
          Opponent: {opponentY}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    top: 50,
    zIndex: 100,
  },
  score: {
    fontSize: 18,
    color: "white",
    fontFamily,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  opponent: {
    color: "#FFD700", // Золотистый цвет для оппонента
    marginTop: 4,
  },
});
