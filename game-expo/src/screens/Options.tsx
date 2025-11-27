// src/screens/OptionsScreen.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type Difficulty = "easy" | "medium" | "hard";

export const OptionsScreen = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ImageBackground style={styles.container} imageStyle={styles.bgImage}>
        {/* Tytuł */}
        <View style={styles.header}>
          <Text style={styles.title}>Wybierz poziom trudności:</Text>
        </View>

        {/* Sekcja: poziom trudności */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}></Text>
          <View style={styles.difficultyRow}>
            <DifficultyCloud
              label="easy"
              description="wolniej, więcej platform"
              selected={difficulty === "easy"}
              onPress={() => setDifficulty("easy")}
            />
            <DifficultyCloud
              label="medium"
              description="standardowy poziom"
              selected={difficulty === "medium"}
              onPress={() => setDifficulty("medium")}
            />
            <DifficultyCloud
              label="hard"
              description="szybciej, mniej platform"
              selected={difficulty === "hard"}
              onPress={() => setDifficulty("hard")}
            />
          </View>
        </View>

        {/* Podpowiedź */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            wybierz poziom trudności i wróć do menu,
            {"\n"}
            następnie naciśnij <Text style={styles.footerBold}>play</Text>
          </Text>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

type DifficultyCloudProps = {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
};

const DifficultyCloud: React.FC<DifficultyCloudProps> = ({
  label,
  description,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.cloud, selected && styles.cloudSelected]}
    >
      <Text style={[styles.cloudLabel, selected && styles.cloudLabelSelected]}>
        {label}
      </Text>
      {description ? (
        <Text
          style={[
            styles.cloudDescription,
            selected && styles.cloudDescriptionSelected,
          ]}
        >
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#bfe9ff", // błękitne tło
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  bgImage: {
    resizeMode: "cover",
    opacity: 0.25,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "#2b2b2b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#222",
  },
  difficultyRow: {
    flexDirection: "column",
    gap: 12,
  },
  cloud: {
    borderWidth: 2,
    borderColor: "#1b6fa8",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#e7f5ff",
  },
  cloudSelected: {
    backgroundColor: "#ffffff",
    borderColor: "#0e4c80",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 2,
  },
  cloudLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0e4c80",
    textAlign: "center",
  },
  cloudLabelSelected: {
    color: "#082a47",
  },
  cloudDescription: {
    fontSize: 12,
    color: "#3d7fa8",
    textAlign: "center",
    marginTop: 2,
  },
  cloudDescriptionSelected: {
    color: "#1b4f70",
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
    color: "#1e3747",
  },
  footerBold: {
    fontWeight: "bold",
  },
});
