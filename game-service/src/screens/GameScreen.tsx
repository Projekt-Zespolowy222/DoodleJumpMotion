import React, {
  Ref,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

interface ArenaConfig {
  gravity: number;
  jumpHeight: number;
  moveSpeed: number;
  platformWidth: number;
  platformHeight: number;
  doodleSize: number;
}

const arenaConfig = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};

//const SEED = 1792108570;
// const SEED = (window as any).GAME_SEED ?? 0;
// const userId = (window as any).USER_ID ?? 0;

export const GameScreen = ({
  seed,
  arenaId,
}: {
  seed: number;
  arenaId: string;
}) => {
  // 1. Подготовка данных и юзера
  const { platformsData, isReady, userId } = useInitializeGame(seed, arenaId);
  console.log("DEBUG: platformsData is:", platformsData);

  // 2. Рефы для игровых состояний (не вызывают ререндер)
  const moveDirection = useRef<"left" | "right" | null>(null);
  const isOnPlatform = useRef(true);
  const lastPlatformHit = useRef<number | null>(null);
  const started = useRef(false);
  const gameOver = useRef(false);
  const rndRef = useRef(new SeededRandom(seed));

  // 3. Состояние для UI (вызывают ререндер)
  const [score, setScore] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // 4. Подключение Pose (Камера и детекция)
  const {
    torsoCoords,
    isJumping,
    setTorsoCoords,
    setIsJumping,
    isCameraEnabled,
  } = usePose();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { startDetection, stopDetection } = usePoseLandmarker(
    videoRef,
    setTorsoCoords,
    setIsJumping
  );

  // 5. Инициализация Shared Values
  const cameraOffset = useSharedValue(0);
  const { platforms } = useManagePlatforms(platformsData);
  const { x, y, velocityY } = useManageCharacter(platformsData, seed);

  // 6. Запуск "Двигателей" (Хуки логики)

  // Управление прыжком
  useManageInput(isJumping, torsoCoords, velocityY, isOnPlatform, arenaConfig);

  // Функция для создания новых платформ при бесконечном цикле
  const createNewPlatform = (platform: PlatformType) => {
    const highestY = Math.min(...platforms.map((p) => p.y.value));
    platform.y.value = highestY - rndRef.current.range(60, 100);
    platform.x.value = rndRef.current.range(
      30,
      width - arenaConfig.platformWidth - 30
    );
  };

  // Основной физический движок
  useManagePhysics(
    x,
    y,
    velocityY,
    platforms,
    cameraOffset,
    moveDirection,
    isOnPlatform,
    lastPlatformHit,
    started,
    gameOver,
    arenaConfig,
    userId,
    score,
    setScore,
    createNewPlatform
  );

  // 7. Обработка направления движения из координат камеры
  useEffect(() => {
    if (torsoCoords.x === 0) return;
    const centerX = 0.5;
    const deadZone = 0.15;
    if (torsoCoords.x < centerX - deadZone) moveDirection.current = "right";
    else if (torsoCoords.x > centerX + deadZone) moveDirection.current = "left";
    else moveDirection.current = null;
  }, [torsoCoords.x]);

  useEffect(() => {
    if (score > 0) {
      publishScore(score);
    }
  }, [score]);

  // 8. Стили анимации
  const doodleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + cameraOffset.value },
    ],
  }));

  if (!isReady) return <Text>Loading Arena...</Text>;

  return (
    <View style={styles.container}>
      {Platform.OS === "web" && (
        <video
          ref={videoRef}
          style={styles.hiddenCamera}
          autoPlay
          playsInline
          muted
        />
      )}

      <Score y={score} />

      <Animated.View style={[styles.doodleContainer, doodleStyle]}>
        <Doodle size={arenaConfig.doodleSize} />
      </Animated.View>

      {platforms.map((p, i) => (
        <PlatformRenderer
          key={i}
          platform={p}
          offset={cameraOffset}
          config={arenaConfig}
        />
      ))}
    </View>
  );
};

// Вспомогательный компонент для отрисовки платформы (чтобы не плодить хуки в цикле)
const PlatformRenderer = ({ platform, offset, config }: any) => {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: platform.x.value },
      { translateY: platform.y.value + offset.value },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <PlatformComponent
        width={config.platformWidth}
        height={config.platformHeight}
        x={0}
        y={0}
      />
    </Animated.View>
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
  doodleContainer: {
    position: "absolute",
    width: arenaConfig.doodleSize,
    height: arenaConfig.doodleSize,
  },
});

const useInitializeGame = (seed: number, arenaId: string) => {
  const platformPositions = useSeededPlatforms(seed);
  const [userId, setUserId] = useState<number>(0);

  const platformsData = useMemo(() => {
    if (platformPositions && platformPositions.length >= 20) {
      return platformPositions;
    }
    // Заглушка из 20 элементов с нулями
    return [];
  }, [platformPositions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userId = (window as any).USER_ID;
      if (userId) {
        setUserId(userId);
      }
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, userId: id } = event.data;
      if (type === "INIT_GAME" && id) {
        setUserId(id);
      }
    };

    window.addEventListener("message", handleMessage);

    // Проверка на случай, если данные уже есть в window
    if ((window as any).USER_ID) {
      setUserId((window as any).USER_ID);
    }

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // (Будущий шаг) Здесь мы будем доставать конфиг арены по arenaId
  // const arenaConfig = useMemo(() => getArenaConfig(arenaId), [arenaId]);

  return { platformsData, isReady: platformsData.length > 0, userId };
};

const useManagePlatforms = (platformsData: { x: number; y: number }[]) => {
  const platforms = useMemo(() => {
    return platformsData.map((data) => ({
      x: useSharedValue(data.x),
      y: useSharedValue(data.y),
    }));
  }, []);

  useEffect(() => {
    if (
      platformsData &&
      platformsData.length > 0 &&
      platforms &&
      platforms.length === platformsData.length
    ) {
      platformsData.forEach((data, index) => {
        platforms[index].x.value = data.x;
        platforms[index].y.value = data.y;
      });
    }
  }, [platformsData, platforms]);

  return { platforms };
};

const useManageCharacter = (platformsData: any[], seed: number) => {
  const x = useSharedValue(width / 2 - DOODLE_SIZE / 2);
  const y = useSharedValue(0);
  const velocityY = useSharedValue(0);

  useEffect(() => {
    if (platformsData.length > 0) {
      const firstPlatform = platformsData[0];
      x.value = width / 2 - DOODLE_SIZE / 2;
      y.value = firstPlatform.y - DOODLE_SIZE;
      velocityY.value = 0;
    }
  }, [platformsData]);

  return { x, y, velocityY };
};

const useManagePhysics = (
  x: SharedValue<number>,
  y: SharedValue<number>,
  velocityY: SharedValue<number>,
  platforms: PlatformType[],
  cameraOffset: SharedValue<number>,
  // Рефы из GameScreen
  moveDirection: React.RefObject<"left" | "right" | null>,
  isOnPlatform: React.RefObject<boolean>,
  lastPlatformHit: React.RefObject<number | null>,
  started: React.RefObject<boolean>,
  gameOver: React.RefObject<boolean>,
  // Настройки и колбэки
  config: any, // Сюда передадим arenaConfig
  userId: number,
  score: number,
  setScore: (s: number) => void,
  createNewPlatform: (p: PlatformType) => void
) => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver.current) {
        clearInterval(interval);
        return;
      }

      // 1. Движение по горизонтали (X)
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - config.moveSpeed);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(
          width - config.doodleSize,
          x.value + config.moveSpeed
        );
      }

      // 2. Физика падения (Y)
      velocityY.value += config.gravity;
      y.value += velocityY.value;

      // 3. Логика камеры (скролл вверх)
      const SCROLL_THRESHOLD = height * 0.5;
      if (y.value < SCROLL_THRESHOLD) {
        const diff = SCROLL_THRESHOLD - y.value;
        cameraOffset.value += diff; // Сдвигаем камеру
        y.value = SCROLL_THRESHOLD; // Удерживаем персонажа в центре

        // Начисляем очки за подъем
        const newScore = Math.floor(cameraOffset.value / 10);
        if (newScore > score) setScore(newScore);
      }

      // 4. Проверка приземления (только когда падаем вниз)
      if (velocityY.value > 0) {
        const doodleBottom = y.value + config.doodleSize;
        const doodleLeft = x.value;
        const doodleRight = x.value + config.doodleSize;

        let found = false;
        platforms.forEach((p, index) => {
          if (found) return;

          const pTop = p.y.value + cameraOffset.value; // Реальное Y на экране
          const pLeft = p.x.value;

          // Проверка коллизии
          if (
            doodleBottom >= pTop &&
            doodleBottom <= pTop + config.platformHeight + velocityY.value &&
            doodleRight > pLeft &&
            doodleLeft < pLeft + config.platformWidth
          ) {
            // Приземление
            y.value = pTop - config.doodleSize;
            velocityY.value = 0;
            (isOnPlatform as any).current = true;
            (lastPlatformHit as any).current = index;
            found = true;
          }
        });
        if (!found) (isOnPlatform as any).current = false;
      }

      // 5. Переиспользование платформ (Infinite loop)
      platforms.forEach((p) => {
        // Если платформа ушла за нижний край экрана
        if (p.y.value + cameraOffset.value > height + 100) {
          createNewPlatform(p);
        }
      });

      // 6. Проверка смерти (упал ниже экрана)
      if (y.value > height + config.doodleSize) {
        (gameOver as any).current = true;
        publishDeath(userId);
        Alert.alert("Game Over", `Score: ${score}`);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [x, y, velocityY, config, score, userId]);
};

const useManageInput = (
  isJumping: boolean,
  torsoCoords: { x: number; y: number },
  velocityY: SharedValue<number>,
  isOnPlatform: React.RefObject<boolean>,
  config: ArenaConfig
) => {
  const lastJumpTime = useRef(0);

  useEffect(() => {
    if (isJumping && isOnPlatform.current) {
      const currentTime = Date.now();
      if (currentTime - lastJumpTime.current > 400) {
        // кулдаун 400мс
        // Сила прыжка может зависеть от глубины приседа (torsoCoords.y)
        const jumpStrength = config.jumpHeight;
        velocityY.value = -jumpStrength;
        lastJumpTime.current = currentTime;
        (isOnPlatform as any).current = false;
      }
    }
  }, [isJumping]);
};
