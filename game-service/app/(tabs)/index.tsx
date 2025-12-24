// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GameScreen } from "../../src/screens/GameScreen"; // путь к твоему экрану

export default function HomeScreen() {
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSeed = params.get("seed");

      const globalSeed = urlSeed || (window.parent as any).GAME_SEED;
      if (globalSeed) {
        console.log("✅ Seed found:", globalSeed);
        setSeed(Number(globalSeed));
      }
    }

    const HandleMessage = (event: any) => {
      if (event.data && event.data.type === "seed") {
        console.log("React получил seed через postMessage:", event.data.value);
        setSeed(Number(event.data.seed));
      }
    };

    window.addEventListener("message", HandleMessage);

    return () => {
      window.removeEventListener("message", HandleMessage);
    };
  }, []);

  if (!seed) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading level...</Text>
      </View>
    );
  }

  return <GameScreen key={seed} seed={seed} />;
}
