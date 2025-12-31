import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Doodle } from "../components/Doodle";
import { Platform as PlatformComponent } from "../components/Platform";
import { Score } from "../components/Score";
import {
  DOODLE_SIZE,
  GRAVITY,
  height,
  JUMP_HEIGHT,
  MOVE_SPEED,
  PLATFORM_HEIGHT,
  PLATFORM_WIDTH,
  width,
} from "../constants/config";
import { usePose } from "../contexts/PoseContext";
import { publishDeath, publishScore } from "../contexts/SeedModule";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { useSeededPlatforms } from "../hooks/useSeededPlatforms";
import { SeededRandom } from "../utils/SeededRandom";

interface PlatformType {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

//const SEED = 1792108570;
// const SEED = (window as any).GAME_SEED ?? 0;
// const userId = (window as any).USER_ID ?? 0;

export const GameScreen = ({ seed }: { seed: number }) => {
  const platformPositions = useSeededPlatforms(seed);
  const rawPlatformPositions = useSeededPlatforms(seed);
  const platformsData = useMemo(() => {
    if (rawPlatformPositions && rawPlatformPositions.length >= 20) {
      return rawPlatformPositions;
    }
    // Заглушка из 20 элементов с нулями
    return Array(20).fill({ x: 0, y: 0 });
  }, [platformPositions]);

  const [userId, setUserId] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const gameSeed = (window as any).GAME_SEED;
      const userId = (window as any).USER_ID;
      if (userId) {
        setUserId(userId);
      }
    }
  }, []);
  const seedRef = useRef(seed); // текущий seed
  const rndRef = useRef<SeededRandom | null>(null);

  const x = useSharedValue(width / 2 - DOODLE_SIZE / 2);
  const y = useSharedValue(
    platformsData[0].y !== 0 ? platformsData[0].y - DOODLE_SIZE - 2 : 0
  );

  const velocityY = useSharedValue(0);

  const [score, setScore] = useState(0);
  const moveDirection = useRef<"left" | "right" | null>(null);
  const started = useRef(false);
  const gameOver = useRef(false);
  const lastPlatformHit = useRef<number | null>(null);
  const scrollOffset = useRef(0);
  const lastJumpTime = useRef(0);
  const cameraOffset = useSharedValue(0);
  const isOnPlatform = useRef(true); // Стартуем НА платформе

  const {
    torsoCoords,
    isJumping,
    setTorsoCoords,
    setIsJumping,
    isCameraEnabled,
    setIsCameraEnabled,
  } = usePose();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const { startDetection, stopDetection } = usePoseLandmarker(
    videoRef,
    setTorsoCoords,
    setIsJumping
  );

  // Инициализация камеры при монтировании компонента
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          startDetection();
        }
      } catch (err) {
        console.error("Ошибка инициализации камеры:", err);
        setCameraActive(false);
      }
    };

    if (isCameraEnabled) {
      initializeCamera();
    } else {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      stopDetection();
      setCameraActive(false);
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      stopDetection();
      setCameraActive(false);
    };
  }, [isCameraEnabled]);

  useEffect(() => {
    if (torsoCoords.x === 0 && torsoCoords.y === 0) {
      moveDirection.current = null;
      return;
    }

    const centerX = 0.5;
    const deadZone = 0.15;

    if (torsoCoords.x < centerX - deadZone) {
      moveDirection.current = "right";
    } else if (torsoCoords.x > centerX + deadZone) {
      moveDirection.current = "left";
    } else {
      moveDirection.current = null;
    }
  }, [torsoCoords.x, torsoCoords.y]);

  useEffect(() => {
    if (torsoCoords.x === 0 && torsoCoords.y === 0) {
      return;
    }

    if (isJumping && !gameOver.current) {
      const currentTime = Date.now();
      const MIN_JUMP_INTERVAL = 400;

      if (
        currentTime - lastJumpTime.current > MIN_JUMP_INTERVAL &&
        isOnPlatform.current
      ) {
        const jumpStrength = Math.min(
          1.5,
          1 + Math.max(0, 0.5 - torsoCoords.y) * 2
        );
        velocityY.value = -JUMP_HEIGHT * jumpStrength;
        lastJumpTime.current = currentTime;
        isOnPlatform.current = false;

        console.log("🚀 JUMP! Strength:", jumpStrength.toFixed(2));
      }
    }
  }, [isJumping, torsoCoords.y, torsoCoords.x]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "c") {
        setIsCameraEnabled(!isCameraEnabled);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCameraEnabled]);

  // const platformPositions = useMemo(() => {
  //   const positions: { x: number; y: number }[] = [];
  //   const MAX_DISTANCE = 90;
  //   const MIN_DISTANCE = 50;

  //   const startPlatformY = height - 100;
  //   const startPlatformX = width / 2 - PLATFORM_WIDTH / 2;

  //   positions.push({
  //     x: startPlatformX,
  //     y: startPlatformY,
  //   });

  //   let currentY =
  //     startPlatformY -
  //     (Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE);

  //   for (let i = 1; i < PLATFORM_COUNT; i++) {
  //     const platformX = Math.random() * (width - PLATFORM_WIDTH - 40) + 20;

  //     positions.push({
  //       x: platformX,
  //       y: currentY,
  //     });

  //     currentY -= Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE;
  //   }

  //   return positions;
  // }, []);

  //const platformPositions = useSeededPlatforms(SEED);

  // Создаем shared values для всех 20 платформ
  const platform0X = useSharedValue(platformsData[0].x);
  const platform0Y = useSharedValue(platformsData[0].y);
  const platform1X = useSharedValue(platformsData[1].x);
  const platform1Y = useSharedValue(platformsData[1].y);
  const platform2X = useSharedValue(platformsData[2].x);
  const platform2Y = useSharedValue(platformsData[2].y);
  const platform3X = useSharedValue(platformsData[3].x);
  const platform3Y = useSharedValue(platformsData[3].y);
  const platform4X = useSharedValue(platformsData[4].x);
  const platform4Y = useSharedValue(platformsData[4].y);
  const platform5X = useSharedValue(platformsData[5].x);
  const platform5Y = useSharedValue(platformsData[5].y);
  const platform6X = useSharedValue(platformsData[6].x);
  const platform6Y = useSharedValue(platformsData[6].y);
  const platform7X = useSharedValue(platformsData[7].x);
  const platform7Y = useSharedValue(platformsData[7].y);
  const platform8X = useSharedValue(platformsData[8].x);
  const platform8Y = useSharedValue(platformsData[8].y);
  const platform9X = useSharedValue(platformsData[9].x);
  const platform9Y = useSharedValue(platformsData[9].y);
  const platform10X = useSharedValue(platformsData[10].x);
  const platform10Y = useSharedValue(platformsData[10].y);
  const platform11X = useSharedValue(platformsData[11].x);
  const platform11Y = useSharedValue(platformsData[11].y);
  const platform12X = useSharedValue(platformsData[12].x);
  const platform12Y = useSharedValue(platformsData[12].y);
  const platform13X = useSharedValue(platformsData[13].x);
  const platform13Y = useSharedValue(platformsData[13].y);
  const platform14X = useSharedValue(platformsData[14].x);
  const platform14Y = useSharedValue(platformsData[14].y);
  const platform15X = useSharedValue(platformsData[15].x);
  const platform15Y = useSharedValue(platformsData[15].y);
  const platform16X = useSharedValue(platformsData[16].x);
  const platform16Y = useSharedValue(platformsData[16].y);
  const platform17X = useSharedValue(platformsData[17].x);
  const platform17Y = useSharedValue(platformsData[17].y);
  const platform18X = useSharedValue(platformsData[18].x);
  const platform18Y = useSharedValue(platformsData[18].y);
  const platform19X = useSharedValue(platformsData[19].x);
  const platform19Y = useSharedValue(platformsData[19].y);

  // const platforms = useMemo<PlatformType[]>(
  //   () => [
  //     { x: platform0X, y: platform0Y },
  //     { x: platform1X, y: platform1Y },
  //     { x: platform2X, y: platform2Y },
  //     { x: platform3X, y: platform3Y },
  //     { x: platform4X, y: platform4Y },
  //     { x: platform5X, y: platform5Y },
  //     { x: platform6X, y: platform6Y },
  //     { x: platform7X, y: platform7Y },
  //     { x: platform8X, y: platform8Y },
  //     { x: platform9X, y: platform9Y },
  //     { x: platform10X, y: platform10Y },
  //     { x: platform11X, y: platform11Y },
  //     { x: platform12X, y: platform12Y },
  //     { x: platform13X, y: platform13Y },
  //     { x: platform14X, y: platform14Y },
  //     { x: platform15X, y: platform15Y },
  //     { x: platform16X, y: platform16Y },
  //     { x: platform17X, y: platform17Y },
  //     { x: platform18X, y: platform18Y },
  //     { x: platform19X, y: platform19Y },
  //   ],
  //   [
  //     platform0X,
  //     platform0Y,
  //     platform1X,
  //     platform1Y,
  //     platform2X,
  //     platform2Y,
  //     platform3X,
  //     platform3Y,
  //     platform4X,
  //     platform4Y,
  //     platform5X,
  //     platform5Y,
  //     platform6X,
  //     platform6Y,
  //     platform7X,
  //     platform7Y,
  //     platform8X,
  //     platform8Y,
  //     platform9X,
  //     platform9Y,
  //     platform10X,
  //     platform10Y,
  //     platform11X,
  //     platform11Y,
  //     platform12X,
  //     platform12Y,
  //     platform13X,
  //     platform13Y,
  //     platform14X,
  //     platform14Y,
  //     platform15X,
  //     platform15Y,
  //     platform16X,
  //     platform16Y,
  //     platform17X,
  //     platform17Y,
  //     platform18X,
  //     platform18Y,
  //     platform19X,
  //     platform19Y,
  //   ]
  // );

  const platforms = useMemo<PlatformType[]>(
    () => [
      { x: platform0X, y: platform0Y },
      { x: platform1X, y: platform1Y },
      { x: platform2X, y: platform2Y },
      { x: platform3X, y: platform3Y },
      { x: platform4X, y: platform4Y },
      { x: platform5X, y: platform5Y },
      { x: platform6X, y: platform6Y },
      { x: platform7X, y: platform7Y },
      { x: platform8X, y: platform8Y },
      { x: platform9X, y: platform9Y },
      { x: platform10X, y: platform10Y },
      { x: platform11X, y: platform11Y },
      { x: platform12X, y: platform12Y },
      { x: platform13X, y: platform13Y },
      { x: platform14X, y: platform14Y },
      { x: platform15X, y: platform15Y },
      { x: platform16X, y: platform16Y },
      { x: platform17X, y: platform17Y },
      { x: platform18X, y: platform18Y },
      { x: platform19X, y: platform19Y },
    ],
    [
      platform0X,
      platform0Y,
      platform1X,
      platform1Y,
      platform2X,
      platform2Y,
      platform3X,
      platform3Y,
      platform4X,
      platform4Y,
      platform5X,
      platform5Y,
      platform6X,
      platform6Y,
      platform7X,
      platform7Y,
      platform8X,
      platform8Y,
      platform9X,
      platform9Y,
      platform10X,
      platform10Y,
      platform11X,
      platform11Y,
      platform12X,
      platform12Y,
      platform13X,
      platform13Y,
      platform14X,
      platform14Y,
      platform15X,
      platform15Y,
      platform16X,
      platform16Y,
      platform17X,
      platform17Y,
      platform18X,
      platform18Y,
      platform19X,
      platform19Y,
    ]
  );

  const doodleStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value + cameraOffset.value,
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
    position: "absolute",
  }));

  const platformStyles = platforms.map((p) =>
    useAnimatedStyle(() => ({
      left: p.x.value,
      top: p.y.value + cameraOffset.value,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      position: "absolute",
    }))
  );

  const createNewPlatform = (platform: PlatformType) => {
    if (!rndRef.current) return;

    const highestY = Math.min(...platforms.map((p) => p.y.value));

    const verticalDistance = rndRef.current.range(60, 100); // 60-100 вместо 40-60
    const newY = highestY - verticalDistance;

    const newX = rndRef.current.range(30, width - PLATFORM_WIDTH - 30);

    platform.y.value = newY;
    platform.x.value = newX;
  };

  // Основной игровой цикл
  useEffect(() => {
    if (gameOver.current) return;

    const interval = setInterval(() => {
      // === Управление движением ===
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - MOVE_SPEED);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(width - DOODLE_SIZE, x.value + MOVE_SPEED);
      }

      // === Физика ===
      velocityY.value += GRAVITY;
      y.value += velocityY.value;

      // === Логика камеры ===
      const SCROLL_THRESHOLD = height * 0.5;
      const targetOffset = Math.max(0, SCROLL_THRESHOLD - y.value);
      cameraOffset.value += (targetOffset - cameraOffset.value) * 0.15;

      // === Генерация платформ ===
      if (cameraOffset.value > 5) {
        platforms.forEach((p) => {
          const realY = p.y.value + cameraOffset.value;
          if (realY > height + PLATFORM_HEIGHT + 100) {
            createNewPlatform(p);
            p.y.value -= cameraOffset.value;
          }
        });
        scrollOffset.current = cameraOffset.value;
        const newScore = Math.floor(scrollOffset.current / 10);
        if (newScore !== score) {
          setScore(newScore);
          publishScore(newScore); // ← отправили один раз
        }
      }

      // === Логика приземления (БЕЗ автоматического прыжка) ===
      if (velocityY.value > 0) {
        // Падаем вниз
        const doodleBottom = y.value + DOODLE_SIZE;
        const doodleLeft = x.value;
        const doodleRight = x.value + DOODLE_SIZE;

        let foundPlatform = false;

        platforms.forEach((p, index) => {
          // Если уже нашли платформу, выходим
          if (foundPlatform) return;

          const platformTop = p.y.value;
          const platformBottom = platformTop + PLATFORM_HEIGHT;
          const platformLeft = p.x.value;
          const platformRight = platformLeft + PLATFORM_WIDTH;

          // Проверяем вертикальное пересечение
          const willIntersectVertically =
            doodleBottom <= platformBottom &&
            doodleBottom + velocityY.value >= platformTop;

          // Проверяем горизонтальное пересечение
          const isHorizontallyAligned =
            doodleRight > platformLeft && doodleLeft < platformRight;

          if (willIntersectVertically && isHorizontallyAligned) {
            // Приземляемся на платформу
            y.value = platformTop - DOODLE_SIZE;
            velocityY.value = 0;
            isOnPlatform.current = true;
            lastPlatformHit.current = index;
            foundPlatform = true;

            console.log("✅ LANDED on platform", index);
          }
        });

        // Если не нашли платформу для приземления
        if (!foundPlatform) {
          isOnPlatform.current = false;
        }
      } else {
        // Если летим вверх - точно не на платформе
        isOnPlatform.current = false;
      }

      if (!started.current && y.value < height - 150) {
        started.current = true;
      }
      // === Game Over проверка ===
      if (y.value > height + DOODLE_SIZE) {
        gameOver.current = true;
        clearInterval(interval);
        publishDeath(userId); // ← новая строка
        Alert.alert("Game Over", `Your score: ${score}`, [
          { text: "OK", onPress: () => {} },
        ]);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [platforms, score]);

  useEffect(() => {
    if (seed != null) {
      seedRef.current = seed;
      rndRef.current = new SeededRandom(seed);
    }
  }, [seed]);

  if (!rawPlatformPositions || rawPlatformPositions.length < 20) {
    return (
      <View style={[styles.container, { backgroundColor: "red" }]}>
        <Text style={{ fontSize: 50, color: "white" }}>
          WAITING FOR DATA...
        </Text>
      </View>
    );
  }
  if (!seed) {
    return <Text>Loading level...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Скрытая камера для обработки позы */}
      {Platform.OS === "web" && (
        <video
          ref={videoRef}
          style={styles.hiddenCamera}
          autoPlay
          playsInline
          muted
        />
      )}

      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Camera: X: {torsoCoords.x.toFixed(2)} Y: {torsoCoords.y.toFixed(2)}
        </Text>
        <Text style={styles.debugText}>
          Direction: {moveDirection.current || "CENTER"}
        </Text>
        <Text style={styles.debugText}>
          Jumping: {isJumping ? "YES" : "NO"}
        </Text>
        <Text style={styles.debugText}>
          On Platform: {isOnPlatform.current ? "YES" : "NO"}
        </Text>
        <Text style={styles.debugText}>
          Camera Active: {cameraActive ? "YES" : "NO"}
        </Text>
        <Text style={styles.debugText}>
          Camera Valid:{" "}
          {torsoCoords.x !== 0 || torsoCoords.y !== 0 ? "YES" : "NO"}
        </Text>
        <Text style={styles.debugText}>
          VelocityY: {velocityY.value.toFixed(1)}
        </Text>
      </View>

      <Score y={score} />

      <Animated.View style={doodleStyle}>
        <View style={styles.doodleInner}>
          <Doodle x={0} y={0} size={DOODLE_SIZE} />
        </View>
      </Animated.View>

      {platforms.map((_, i) => (
        <Animated.View key={i} style={platformStyles[i]}>
          <PlatformComponent
            x={0}
            y={0}
            width={PLATFORM_WIDTH}
            height={PLATFORM_HEIGHT}
          />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  doodleInner: {
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
  },
  debugInfo: {
    position: "absolute",
    top: 50,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
  },
  debugText: {
    color: "white",
    fontSize: 12,
    fontFamily: "monospace",
  },
  hiddenCamera: {
    position: "absolute",
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
