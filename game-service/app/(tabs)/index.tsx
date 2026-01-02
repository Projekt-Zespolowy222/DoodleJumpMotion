// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GameScreen } from "../../src/screens/GameScreen"; // путь к твоему экрану

interface GameScreenProps {
  seed: number;
  arenaId: string;
}

export default function HomeScreen() {
  const [gameData, setGameData] = useState<{
    seed: number;
    arenaId: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlSeed = params.get("seed");
      const urlArena = params.get("arenaId");

      if (urlSeed && urlArena) {
        setGameData({ seed: Number(urlSeed), arenaId: urlArena });
      }

      const globalSeed = urlSeed || (window.parent as any).GAME_SEED;
      if (globalSeed) {
        console.log("✅ Seed found:", globalSeed);
        setGameData({ seed: Number(globalSeed), arenaId: "default" });
      }
    }

    const HandleMessage = (event: any) => {
      if (event.data && event.data.type === "seed") {
        console.log("React get seed from postMessage:", event.data.value);
        setGameData({ seed: Number(event.data.seed), arenaId: "default" });
      }
    };

    window.addEventListener("message", HandleMessage);

    return () => {
      window.removeEventListener("message", HandleMessage);
    };
  }, []);

  if (!gameData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading level...</Text>
      </View>
    );
  }

  return (
    <GameScreen
      key={gameData.seed}
      seed={gameData.seed}
      arenaId={gameData.arenaId}
    />
  );
}
