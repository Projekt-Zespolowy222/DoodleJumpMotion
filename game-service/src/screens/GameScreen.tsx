import React, {
  Ref,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
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
import { arenaAssets } from "../constants/arenaAssets";

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

const arenaConfig1 = {
  gravity: 0.5,
  jumpHeight: 20,
  moveSpeed: 15,
  platformWidth: 160,
  platformHeight: 32,
  doodleSize: 40,
};
const arenaConfig2 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig3 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig4 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig5 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig6 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig7 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig8 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig9 = {
  gravity: 0.8,
  jumpHeight: 15,
  moveSpeed: 8,
  platformWidth: 60,
  platformHeight: 20,
  doodleSize: 40,
};
const arenaConfig10 = {
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
  const arenaConfigs = [
    arenaConfig1,
    arenaConfig2,
    arenaConfig3,
    arenaConfig4,
    arenaConfig5,
    arenaConfig6,
    arenaConfig7,
    arenaConfig8,
    arenaConfig9,
    arenaConfig10,
  ];

  const [isCameraActive, setIsCameraActive] = useState(true);

  const assets = arenaAssets[arenaId] ?? arenaAssets["1"];

  const arenaConfig = arenaConfigs[parseInt(arenaId, 10) - 1] ?? arenaConfig1;
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
  const { platforms } = useManagePlatforms(platformsData, seed);
  const { x, y, velocityY } = useManageCharacter(platformsData, seed);

  // 6. Запуск "Двигателей" (Хуки логики)

  // Управление прыжком
  useManageInput(isJumping, torsoCoords, velocityY, isOnPlatform, arenaConfig);

  // Функция для создания новых платформ при бесконечном цикле
  const createNewPlatform = (platform: PlatformType) => {
    const highestY = Math.min(...platforms.map((p) => p.y.value));
    const safeJumpDistance = arenaConfig.jumpHeight * 4;
    const gap = rndRef.current.range(50, Math.max(60, safeJumpDistance));
    platform.y.value = highestY - gap;
    platform.x.value = rndRef.current.range(
      30,
      width - arenaConfig.platformWidth - 30
    );
  };

  const moveSpeed = useRef(arenaConfig.moveSpeed);

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
    createNewPlatform,
    moveSpeed
  );

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Проверяем нажатие клавиши C (английская или русская раскладка)
      if (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "с") {
        setIsCameraActive((prev) => !prev);
        console.log("DEBUG: Camera toggled:", !isCameraActive);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isCameraActive]);

  // 7. Обработка направления движения из координат камеры
  useEffect(() => {
    if (torsoCoords.x === 0) return;
    const centerX = 0.5;
    const deadZone = 0.05;
    const leanFactor = 0.5;

    if (torsoCoords.x < centerX - deadZone) {
      moveDirection.current = "right";
      const leanAmount = (centerX - torsoCoords.x) / centerX;
      // ИСПОЛЬЗУЕМ arenaConfig и записываем в реф .current
      moveSpeed.current = arenaConfig.moveSpeed * leanAmount * leanFactor;
    } else if (torsoCoords.x > centerX + deadZone) {
      moveDirection.current = "left";
      const leanAmount = (torsoCoords.x - centerX) / centerX;
      moveSpeed.current = arenaConfig.moveSpeed * leanAmount * leanFactor;
    } else {
      moveDirection.current = null;
      moveSpeed.current = arenaConfig.moveSpeed; // Сброс на стандартную
    }
  }, [torsoCoords.x, arenaConfig]);

  useEffect(() => {
    if (score > 0) {
      publishScore(score);
    }
  }, [score]);

  // 7.5 Запуск камеры и детекции
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function toggleCam() {
      // Если камера активна и всё готово
      if (isCameraActive && isReady && videoRef.current) {
        try {
          console.log("DEBUG: Requesting camera access...");
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 160 },
              height: { ideal: 120 },
              frameRate: { ideal: 10 },
            },
          });
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startDetection();
          };
        } catch (err) {
          console.error("Camera access denied", err);
        }
      } else {
        // Если камеру выключили
        stopDetection();
        if (videoRef.current && videoRef.current.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        // Сбрасываем координаты, чтобы персонаж не "залип" в одну сторону при выключении
        setTorsoCoords({ x: 0.5, y: 0.5 });
      }
    }

    toggleCam();

    return () => {
      stopDetection();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [isReady, isCameraActive]); // Добавили зависимость от isCameraActive

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
      {/* Добавляем фон арены */}
      <ImageBackground
        source={assets.background}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Скрытое видео для работы MediaPipe */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          width: 1, // Минимальный размер, чтобы не мешать
          height: 1,
          opacity: 0, // Полностью прозрачное
        }}
        playsInline
        muted
      />

      <Score y={score} />

      <Animated.View style={[styles.doodleContainer, doodleStyle]}>
        {/* Передаем текстуру в Doodle */}
        <Doodle size={arenaConfig.doodleSize} texture={assets.doodle} />
      </Animated.View>

      {platforms.map((p, i) => (
        <PlatformRenderer
          key={i}
          platform={p}
          offset={cameraOffset}
          config={arenaConfig}
          texture={assets.platform} // Передаем текстуру платформы
        />
      ))}
    </View>
  );
};

// Вспомогательный компонент для отрисовки платформы (чтобы не плодить хуки в цикле)
const PlatformRenderer = ({
  platform,
  offset,
  config,
  texture,
}: {
  platform: PlatformType;
  offset: SharedValue<number>;
  config: ArenaConfig;
  texture: any;
}) => {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: platform.x.value },
      { translateY: platform.y.value + offset.value },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <Image
        source={texture}
        style={{
          width: config.platformWidth,
          height: config.platformHeight,
        }}
        resizeMode="stretch"
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
    bottom: 10, // перенеси вниз
    right: 10, // в угол
    width: 160, // дай реальный размер для просчета
    height: 120,
    opacity: 0.01, // почти невидимая, но "отрисовываемая"
    zIndex: -1,
  },
  doodleContainer: {
    position: "absolute",
    width: 40,
    height: 40,
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

export const useManagePlatforms = (
  platformsData: { x: number; y: number }[] | undefined,
  seed: number
) => {
  // 1. Создаем фиксированный массив SharedValues.
  // Это ЕДИНСТВЕННЫЙ безопасный способ инициализировать массив хуков.
  // Мы создаем их один раз, и они не меняются между рендерами.
  const p0 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p1 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p2 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p3 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p4 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p5 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p6 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p7 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p8 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p9 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p10 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p11 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p12 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p13 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p14 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p15 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p16 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p17 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p18 = { x: useSharedValue(0), y: useSharedValue(0) };
  const p19 = { x: useSharedValue(0), y: useSharedValue(0) };

  // Группируем их в массив через useMemo, чтобы ссылка на сам массив была стабильной
  const platforms = useMemo(
    () => [
      p0,
      p1,
      p2,
      p3,
      p4,
      p5,
      p6,
      p7,
      p8,
      p9,
      p10,
      p11,
      p12,
      p13,
      p14,
      p15,
      p16,
      p17,
      p18,
      p19,
    ],
    []
  );

  // 2. Инициализация данными с сервера
  useEffect(() => {
    if (platformsData && platformsData.length > 0) {
      // Заполняем столько платформ, сколько пришло (но не больше 20)
      platformsData.forEach((data, index) => {
        if (platforms[index]) {
          platforms[index].x.value = data.x;
          platforms[index].y.value = data.y;
        }
      });
      console.log(
        `[GAME] Initialized ${platformsData.length} platforms with seed: ${seed}`
      );
    }
  }, [platformsData]);

  // 3. Возвращаем массив для рендеринга и функцию для бесконечной логики
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
  moveDirection: React.RefObject<"left" | "right" | null>,
  isOnPlatform: React.RefObject<boolean>,
  lastPlatformHit: React.RefObject<number | null>,
  started: React.RefObject<boolean>,
  gameOver: React.RefObject<boolean>,
  config: any,
  userId: number,
  score: number,
  setScore: (s: number) => void,
  createNewPlatform: (p: PlatformType) => void,
  moveSpeed: any
) => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver.current) {
        clearInterval(interval);
        return;
      }

      // 1. Плавная камера (делаем в самом начале кадра)
      const TARGET_SCREEN_Y = height * 0.75; // нижняя четверть экрана
      const CAMERA_SMOOTHING = 0.12;

      if (y.value < TARGET_SCREEN_Y) {
        const diff = TARGET_SCREEN_Y - y.value;
        const step = diff * CAMERA_SMOOTHING;

        cameraOffset.value += step;
        y.value += step; // важно: двигаем игрока вместе с миром

        const newScore = Math.floor(cameraOffset.value / 10);
        if (newScore > score) setScore(newScore);
      }

      // 2. Горизонтальное движение
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - moveSpeed.current);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(
          width - config.doodleSize,
          x.value + moveSpeed.current
        );
      }

      // 3. Физика падения
      const nextVelocityY = velocityY.value + config.gravity;
      const nextY = y.value + nextVelocityY;

      // 4. Проверка столкновения
      let foundCollision = false;

      // Проверяем столкновение только при движении вниз
      if (nextVelocityY > 0) {
        const doodleBottomCurrent = y.value + config.doodleSize;
        const doodleBottomNext = nextY + config.doodleSize;
        const doodleLeft = x.value;
        const doodleRight = x.value + config.doodleSize;

        platforms.forEach((p, index) => {
          if (foundCollision) return;

          // ВАЖНО: используем актуальный cameraOffset.value
          const pTop = p.y.value + cameraOffset.value;
          const pLeft = p.x.value;
          const pRight = pLeft + config.platformWidth;

          const wasAbove = doodleBottomCurrent <= pTop + 2; // Увеличили допуск до 2px
          const willBeBelow = doodleBottomNext >= pTop;
          const isWithinHorizontal =
            doodleRight > pLeft + 5 && doodleLeft < pRight - 5;

          if (wasAbove && willBeBelow && isWithinHorizontal) {
            y.value = pTop - config.doodleSize;
            velocityY.value = 0;
            (isOnPlatform as any).current = true;
            (lastPlatformHit as any).current = index;
            foundCollision = true;
          }
        });
      }

      // 5. Обновление позиции, если не упали на платформу
      if (!foundCollision) {
        y.value = nextY;
        velocityY.value = nextVelocityY;
        (isOnPlatform as any).current = false;
      }

      // 6. Цикл платформ
      platforms.forEach((p) => {
        if (p.y.value + cameraOffset.value > height + 100) {
          createNewPlatform(p);
        }
      });

      // 7. Смерть
      if (y.value > height + 100) {
        // Даем чуть больше места внизу
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
