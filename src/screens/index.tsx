// app/(tabs)/index.tsx
import { useRouter } from "expo-router";
import React from "react";
import {
    Image,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

export default function MainMenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Tytuł */}
        <Image
          source={require("../../assets/images/menu/title.png")}
          style={styles.title}
          resizeMode="contain"
        />

        {/* Przycisk PLAY */}
        <TouchableOpacity
          onPress={() => router.push("../screens/GameScreen")}
          activeOpacity={0.8}
        >
          <Image
            source={require("../../assets/images/menu/play.png")}
            style={styles.play}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Środek ekranu – możesz tu dodać np. latające postaci itd. */}
        <View style={styles.spacer} />

        {/* Trampolina + dolne przyciski */}
        <View style={styles.bottomArea}>
          <Image
            source={require("../../assets/images/menu/trampoline.png")}
            style={styles.trampoline}
            resizeMode="contain"
          />

          <View style={styles.bottomButtons}>
            <TouchableOpacity
              onPress={() => router.push("../screens/Scores")}
              activeOpacity={0.8}
            >
              <Image
                source={require("../../assets/images/menu/scores.png")}
                style={styles.bottomIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("../screens/Options")}
              activeOpacity={0.8}
            >
              <Image
                source={require("../../assets/images/menu/options.png")}
                style={styles.bottomIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  title: {
    width: "90%",
    height: 120,
    marginBottom: 24,
  },
  play: {
    width: 220,
    height: 120,
    marginBottom: 40,
  },
  spacer: {
    flex: 1,
  },
  bottomArea: {
    alignItems: "center",
    marginBottom: 24,
  },
  trampoline: {
    width: 260,
    height: 160,
    marginBottom: 16,
  },
  bottomButtons: {
    flexDirection: "row",
    gap: 40,
  },
  bottomIcon: {
    width: 110,
    height: 80,
  },
});
