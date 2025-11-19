import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Doodle } from "../components/Doodle";
import { Platform as PlatformComponent } from "../components/Platform";
import { Score } from "../components/Score";
import {
  GRAVITY as BASE_GRAVITY,
  JUMP_HEIGHT as BASE_JUMP_HEIGHT,
  MOVE_SPEED as BASE_MOVE_SPEED,
  DOODLE_SIZE,
  height,
  PLATFORM_HEIGHT,
  PLATFORM_WIDTH,
  width,
} from "../constants/config";

// ====== TYPY I KONFIG ======

export type Difficulty = "easy" | "normal" | "hard";

type PlatformData = {
  x: number;
  y: number;
};

type DifficultyConfig = {
  platformCount: number;
  maxDistance: number;
  minDistance: number;
  gravityMultiplier: number;
  jumpMultiplier: number;
  moveMultiplier: number;
};

// domyślna konfiguracja, gdy nie ma difficulty (albo jest dziwne)
const DEFAULT_CONFIG: DifficultyConfig = {
  platformCount: 20,
  maxDistance: 90,
  minDistance: 50,
  gravityMultiplier: 1,
  jumpMultiplier: 1,
  moveMultiplier: 1,
};

const difficultySettings: Record<Difficulty, DifficultyConfig> = {
  easy: {
    platformCount: 25,
    maxDistance: 80,
    minDistance: 40,
    gravityMultiplier: 0.9,
    jumpMultiplier: 1.05,
    moveMultiplier: 0.9,
  },
  normal: {
    platformCount: 20,
    maxDistance: 90,
    minDistance: 50,
    gravityMultiplier: 1,
    jumpMultiplier: 1,
    moveMultiplier: 1,
  },
  hard: {
    platformCount: 18,
    maxDistance: 110,
    minDistance: 60,
    gravityMultiplier: 1.15,
    jumpMultiplier: 0.95,
    moveMultiplier: 1.1,
  },
};

// ====== POMOCNICZE FUNKCJE NIEZALEŻNE OD TRUDNOŚCI ======

// losowy X w całej szerokości ekranu (z marginesem)
const getRandomPlatformX = () => {
  const margin = 20;
  return margin + Math.random() * (width - PLATFORM_WIDTH - margin * 2);
};

// czy nowa platforma jest zbyt blisko innych
const isTooCloseToOtherPlatforms = (
  newX: number,
  newY: number,
  platforms: PlatformData[]
) => {
  const minVerticalGap = PLATFORM_HEIGHT * 0.8; // minimalny odstęp w pionie
  const minHorizontalGap = PLATFORM_WIDTH * 0.4; // minimalny odstęp w poziomie (między środkami)

  return platforms.some((p) => {
    const dy = Math.abs(p.y - newY);
    if (dy > minVerticalGap) return false;

    const centerNew = newX + PLATFORM_WIDTH / 2;
    const centerOld = p.x + PLATFORM_WIDTH / 2;
    const dx = Math.abs(centerNew - centerOld);

    return dx < minHorizontalGap; // za blisko siebie
  });
};

// ====== KOMPONENT ANIMOWANEJ PLATFORMY ======

type PlatformAnimatedProps = {
  index: number;
  platforms: SharedValue<PlatformData[]>;
  cameraOffset: SharedValue<number>;
};

const PlatformAnimated: React.FC<PlatformAnimatedProps> = ({
  index,
  platforms,
  cameraOffset,
}) => {
  const style = useAnimatedStyle(() => {
    const p = platforms.value[index];
    if (!p) {
      return {
        position: "absolute",
        left: 0,
        top: height + 100,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
      };
    }

    return {
      position: "absolute",
      left: p.x,
      top: p.y + cameraOffset.value,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
    };
  });

  return (
    <Animated.View style={style}>
      <PlatformComponent
        x={0}
        y={0}
        width={PLATFORM_WIDTH}
        height={PLATFORM_HEIGHT}
      />
    </Animated.View>
  );
};

// ====== GŁÓWNY EKRAN GRY Z TRUDNOŚCIĄ ======

type GameScreenProps = {
  difficulty?: Difficulty; // TERAZ jest opcjonalne
};

export const GameScreen: React.FC<GameScreenProps> = ({ difficulty }) => {
  // jeśli nic nie przyszło → "normal"
  const safeDifficulty: Difficulty = difficulty ?? "normal";

  // bierzemy konfigurację dla danego poziomu albo default
  const config: DifficultyConfig =
    difficultySettings[safeDifficulty] ?? DEFAULT_CONFIG;

  // wartości zależne od trudności
  const PLATFORM_COUNT = config.platformCount;
  const MAX_DISTANCE = config.maxDistance;
  const MIN_DISTANCE = config.minDistance;
  const GRAVITY = BASE_GRAVITY * config.gravityMultiplier;
  const JUMP_HEIGHT = BASE_JUMP_HEIGHT * config.jumpMultiplier;
  const MOVE_SPEED = BASE_MOVE_SPEED * config.moveMultiplier;

  // --- generowanie początkowych platform (zależne od trudności) ---
  const createInitialPlatforms = (): PlatformData[] => {
    const positions: PlatformData[] = [];
    let currentY = height - 100; // pierwsza platforma przy dole

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y =
        i === 0
          ? currentY
          : (currentY -=
              Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE);

      let x = getRandomPlatformX();
      let attempts = 0;

      while (attempts < 50 && isTooCloseToOtherPlatforms(x, y, positions)) {
        x = getRandomPlatformX();
        attempts++;
      }

      positions.push({ x, y });
    }

    return positions;
  };

  // spawn nowej platformy powyżej najwyższej – też z pilnowaniem odstępów
  const spawnPlatformAbove = (
    current: PlatformData[],
    excludeIndex?: number
  ): PlatformData => {
    const filtered =
      typeof excludeIndex === "number"
        ? current.filter((_, idx) => idx !== excludeIndex)
        : current;

    const highestY = Math.min(...filtered.map((p) => p.y));
    const verticalDistance = Math.random() * 40 + 60; // 60–100 px
    const newY = highestY - verticalDistance;

    let x = getRandomPlatformX();
    let attempts = 0;
    while (attempts < 50 && isTooCloseToOtherPlatforms(x, newY, filtered)) {
      x = getRandomPlatformX();
      attempts++;
    }

    return { x, y: newY };
  };

  // --- Doodle i stan gry ---
  const x = useSharedValue(width / 2 - DOODLE_SIZE / 2);
  const y = useSharedValue(height - 200);
  const velocityY = useSharedValue(0);

  const cameraOffset = useSharedValue(0);
  const platforms = useSharedValue<PlatformData[]>(createInitialPlatforms());

  const [score, setScore] = useState(0);

  const moveDirection = useRef<"left" | "right" | null>(null);
  const started = useRef(false);
  const gameOver = useRef(false);
  const scrollOffset = useRef(0);
  const lastJumpTime = useRef(0);

  // styl Doodle
  const doodleStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value + cameraOffset.value,
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
    position: "absolute",
  }));

  // główna pętla gry
  useEffect(() => {
    if (gameOver.current) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // sterowanie poziome
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - MOVE_SPEED);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(width - DOODLE_SIZE, x.value + MOVE_SPEED);
      }

      // grawitacja
      velocityY.value += GRAVITY;
      y.value += velocityY.value;

      // kamera (scroll w górę)
      const SCROLL_THRESHOLD = height * 0.5;
      const targetOffset = Math.max(0, SCROLL_THRESHOLD - y.value);
      cameraOffset.value += (targetOffset - cameraOffset.value) * 0.15;

      // przesuwanie / respawn platform
      if (cameraOffset.value > 5) {
        const current = platforms.value;
        const updated = [...current];

        for (let i = 0; i < updated.length; i++) {
          const realY = updated[i].y + cameraOffset.value;

          if (realY > height + PLATFORM_HEIGHT + 100) {
            updated[i] = spawnPlatformAbove(updated, i);
          }
        }

        platforms.value = updated;
        scrollOffset.current = cameraOffset.value;
        setScore(Math.floor(scrollOffset.current / 10));
      }

      // odbijanie od platform – tylko przy spadaniu + cooldown
      const MIN_JUMP_INTERVAL = 200;
      const canJumpNow = now - lastJumpTime.current > MIN_JUMP_INTERVAL;

      if (velocityY.value > 0 && canJumpNow) {
        const doodleBottom = y.value + DOODLE_SIZE;
        const current = platforms.value;

        let closestIndex = -1;
        let closestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < current.length; i++) {
          const p = current[i];
          const platformTop = p.y;

          // platforma musi być pod spodem
          if (platformTop < doodleBottom - 5) continue;

          // odbijanie od całej szerokości platformy (z marginesem)
          const isHorizontallyAligned =
            x.value + DOODLE_SIZE > p.x - 5 &&
            x.value < p.x + PLATFORM_WIDTH + 5;

          if (!isHorizontallyAligned) continue;

          const distance = platformTop - doodleBottom;
          if (distance >= 0 && distance < 20 && distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        }

        if (closestIndex >= 0) {
          const hitPlatform = platforms.value[closestIndex];
          lastJumpTime.current = now;
          y.value = hitPlatform.y - DOODLE_SIZE;
          velocityY.value = -JUMP_HEIGHT;
        }
      }

      // Game Over – wypadnięcie na dół
      if (y.value > height + DOODLE_SIZE) {
        gameOver.current = true;
        clearInterval(interval);
        Alert.alert("Game Over", `Your score: ${score}`, [
          { text: "OK", onPress: () => {} },
        ]);
      }

      if (!started.current && y.value < height - 150) {
        started.current = true;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [safeDifficulty, score]); // zależność od bezpiecznej trudności

  return (
    <View style={styles.container}>
      <Score y={score} />

      <Animated.View style={doodleStyle}>
        <View style={styles.doodleInner}>
          <Doodle x={0} y={0} size={DOODLE_SIZE} />
        </View>
      </Animated.View>

      {Array.from({ length: PLATFORM_COUNT }).map((_, i) => (
        <PlatformAnimated
          key={i}
          index={i}
          platforms={platforms}
          cameraOffset={cameraOffset}
        />
      ))}

      {/* Sterowanie dotykiem */}
      <View
        style={styles.leftControl}
        onTouchStart={() => (moveDirection.current = "left")}
        onTouchEnd={() => (moveDirection.current = null)}
      />
      <View
        style={styles.rightControl}
        onTouchStart={() => (moveDirection.current = "right")}
        onTouchEnd={() => (moveDirection.current = null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
    position: "relative",
  },
  doodleInner: {
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
  },
  leftControl: {
    position: "absolute",
    left: 0,
    top: 0,
    width: width / 2,
    height: height,
    backgroundColor: "transparent",
  },
  rightControl: {
    position: "absolute",
    right: 0,
    top: 0,
    width: width / 2,
    height: height,
    backgroundColor: "transparent",
  },
});
