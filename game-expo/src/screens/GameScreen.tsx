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

import { useGameSettings, Difficulty } from "@/src/context/GameSettingsContext";

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
  medium: {
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

// ====== POMOCNICZE FUNKCJE ======

const getRandomPlatformX = () => {
  const margin = 20;
  return margin + Math.random() * (width - PLATFORM_WIDTH - margin * 2);
};

const isTooCloseToOtherPlatforms = (
  newX: number,
  newY: number,
  platforms: PlatformData[]
) => {
  const minVerticalGap = PLATFORM_HEIGHT * 0.8;
  const minHorizontalGap = PLATFORM_WIDTH * 0.4;

  return platforms.some((p) => {
    const dy = Math.abs(p.y - newY);
    if (dy > minVerticalGap) return false;

    const centerNew = newX + PLATFORM_WIDTH / 2;
    const centerOld = p.x + PLATFORM_WIDTH / 2;
    const dx = Math.abs(centerNew - centerOld);

    return dx < minHorizontalGap;
  });
};

// ====== ANIMOWANA POJEDYNCZA PLATFORMA ======

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

// ====== GŁÓWNY EKRAN GRY ======

export const GameScreen: React.FC = () => {
  const { difficulty } = useGameSettings();

  const safeDifficulty: Difficulty = difficulty ?? "medium";
  const config: DifficultyConfig =
    difficultySettings[safeDifficulty] ?? DEFAULT_CONFIG;

  const PLATFORM_COUNT = config.platformCount;
  const MAX_DISTANCE = config.maxDistance;
  const MIN_DISTANCE = config.minDistance;

  const GRAVITY = BASE_GRAVITY * config.gravityMultiplier;
  const JUMP_HEIGHT = BASE_JUMP_HEIGHT * config.jumpMultiplier;
  const MOVE_SPEED = BASE_MOVE_SPEED * config.moveMultiplier;

  const createInitialPlatforms = (): PlatformData[] => {
    const positions: PlatformData[] = [];
    let currentY = height - 100;

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

  const spawnPlatformAbove = (
    current: PlatformData[],
    excludeIndex?: number
  ): PlatformData => {
    const filtered =
      typeof excludeIndex === "number"
        ? current.filter((_, idx) => idx !== excludeIndex)
        : current;

    const highestY = Math.min(...filtered.map((p) => p.y));
    const verticalDistance = Math.random() * 40 + 60;
    const newY = highestY - verticalDistance;

    let x = getRandomPlatformX();
    let attempts = 0;
    while (attempts < 50 && isTooCloseToOtherPlatforms(x, newY, filtered)) {
      x = getRandomPlatformX();
      attempts++;
    }

    return { x, y: newY };
  };

  // ====== STANY GRY ======

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

  const doodleStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value + cameraOffset.value,
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
    position: "absolute",
  }));

  // ====== MAIN LOOP ======

  useEffect(() => {
    if (gameOver.current) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Ruch poziomy
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - MOVE_SPEED);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(width - DOODLE_SIZE, x.value + MOVE_SPEED);
      }

      // Grawitacja
      velocityY.value += GRAVITY;
      y.value += velocityY.value;

      // Kamera
      const targetOffset = Math.max(0, height * 0.5 - y.value);
      cameraOffset.value += (targetOffset - cameraOffset.value) * 0.15;

      // Recykling platform
      if (cameraOffset.value > 5) {
        const updated = [...platforms.value];
        let changed = false;

        updated.forEach((p, i) => {
          const realY = p.y + cameraOffset.value;
          if (realY > height + 150) {
            updated[i] = spawnPlatformAbove(updated, i);
            changed = true;
          }
        });

        if (changed) platforms.value = updated;

        scrollOffset.current = Math.max(
          scrollOffset.current,
          cameraOffset.value
        );
        setScore(Math.floor(scrollOffset.current / 10));
      }

      // Skok z platformy
      const MIN_INTERVAL = 200;
      const canJump = now - lastJumpTime.current > MIN_INTERVAL;

      if (velocityY.value > 0 && canJump) {
        const doodleBottom = y.value + DOODLE_SIZE;

        let closestIndex = -1;
        let closestDistance = 999;

        platforms.value.forEach((p, index) => {
          const platformTop = p.y;
          if (platformTop < doodleBottom - 5) return;

          const aligned =
            x.value + DOODLE_SIZE > p.x + 15 &&
            x.value < p.x + PLATFORM_WIDTH - 15;

          if (!aligned) return;

          const dist = platformTop - doodleBottom;
          if (dist >= 0 && dist < 20 && dist < closestDistance) {
            closestIndex = index;
            closestDistance = dist;
          }
        });

        if (closestIndex >= 0) {
          const pl = platforms.value[closestIndex];
          lastJumpTime.current = now;
          y.value = pl.y - DOODLE_SIZE;
          velocityY.value = -JUMP_HEIGHT;
        }
      }

      // Game Over
      if (y.value > height + DOODLE_SIZE) {
        gameOver.current = true;
        clearInterval(interval);
        Alert.alert("Game Over", `Your score: ${score}`);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [GRAVITY, JUMP_HEIGHT, MOVE_SPEED, safeDifficulty, score]);

  // ====== RENDER ======

  return (
    <View style={styles.container}>
      <Score y={score} />

      <Animated.View style={doodleStyle}>
        <Doodle x={0} y={0} size={DOODLE_SIZE} />
      </Animated.View>

      {Array.from({ length: PLATFORM_COUNT }).map((_, i) => (
        <PlatformAnimated
          key={i}
          index={i}
          platforms={platforms}
          cameraOffset={cameraOffset}
        />
      ))}

      {/* Sterowanie dotykowe */}
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

// ====== STYLE ======

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
    position: "relative",
  },
  leftControl: {
    position: "absolute",
    left: 0,
    top: 0,
    width: width / 2,
    height: height,
  },
  rightControl: {
    position: "absolute",
    right: 0,
    top: 0,
    width: width / 2,
    height: height,
  },
});
