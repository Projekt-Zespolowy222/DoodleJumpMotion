import React, {
  Ref,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
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

  const [opponentScore, setOpponentScore] = useState(0);

  const [isCameraActive, setIsCameraActive] = useState(true);

  const assets = arenaAssets[arenaId] ?? arenaAssets["1"];

  const arenaConfig = arenaConfigs[parseInt(arenaId, 10) - 1] ?? arenaConfig1;
  // 1. Подготовка данных и юзера
  const { platformsData, isReady, userId } = useInitializeGame(
    seed,
    arenaId,
    setOpponentScore,
  );

  // 2. Рефы для игровых состояний (не вызывают ререндер)
  const moveDirection = useRef<"left" | "right" | null>(null);
  const isOnPlatform = useRef(true);
  const lastPlatformHit = useRef<number | null>(null);
  const started = useRef(false);
  const gameOver = useRef(false);
  const rndRef = useRef(new SeededRandom(seed));
  const minYReached = useRef(0);

  // 3. Состояние для UI (вызывают ререндер)
  const [score, setScore] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // === НОВОЕ: Состояния для Game Over экрана ===
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

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
    setIsJumping,
  );

  // 5. Инициализация Shared Values
  const cameraOffset = useSharedValue(0);
  const { platforms } = useManagePlatforms(platformsData, seed);
  const { x, y, velocityY } = useManageCharacter(platformsData, seed);

  // 6. Запуск "Двигателей" (Хуки логики)

  // Управление прыжком
  useManageInput(isJumping, torsoCoords, velocityY, isOnPlatform, arenaConfig);

  // Функция для создания новых платформ при бесконечном цикле
  const createNewPlatform = useCallback(
    (platform: PlatformType) => {
      const highestY = Math.min(...platforms.map((p) => p.y.value));
      const safeJumpDistance = arenaConfig.jumpHeight * 3.5;
      const gap = rndRef.current.range(60, safeJumpDistance);

      platform.y.value = highestY - gap;
      platform.x.value = rndRef.current.range(
        30,
        width - arenaConfig.platformWidth - 30,
      );
    },
    [platforms, arenaConfig.jumpHeight, arenaConfig.platformWidth],
  );

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
    moveSpeed,
    minYReached,
    setIsGameOver,
    setFinalScore,
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
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
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

      <Score y={score} opponentY={opponentScore} />
      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverBox}>
            <Text style={styles.gameOverTitle}>💀 GAME OVER</Text>
            <Text style={styles.gameOverScore}>Your Score: {finalScore}</Text>
            <TouchableOpacity
              style={styles.restartButton}
              onPress={() => window.location.reload()}
            >
              <Text style={styles.restartButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  gameOverBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    minWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 20,
  },
  gameOverScore: {
    fontSize: 24,
    color: "#2c3e50",
    marginBottom: 30,
    fontWeight: "600",
  },
  restartButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  restartButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

const useInitializeGame = (
  seed: number,
  arenaId: string,
  setOpponentScore: (s: number) => void,
) => {
  const platformPositions = useSeededPlatforms(seed);
  const [userId, setUserId] = useState<number>(0);

  // Исправлено: Добавляем вычисление platformsData
  const platformsData = useMemo(() => {
    if (platformPositions && platformPositions.length >= 20) {
      return platformPositions;
    }
    return [];
  }, [platformPositions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = (window as any).USER_ID;
      if (id) {
        setUserId(id);
      }
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Безопасный парсинг данных
      let data;
      try {
        data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch (e) {
        return; // Игнорируем сообщения, которые не являются JSON
      }

      if (data?.type === "opponent_score") {
        const { user_id, score: remoteScore } = data.value;

        // Принудительно приводим к Number для надежного сравнения
        const myId = Number(userId);
        const fromId = Number(user_id);

        console.log("DEBUG WS:", {
          type: data.type,
          myId,
          fromId,
          remoteScore,
          isDifferent: fromId !== myId,
        });

        // Обновляем счет только если это сообщение от ДРУГОГО игрока
        if (fromId !== myId && myId !== 0) {
          setOpponentScore(remoteScore);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [userId]); // Эффект перезапустится, как только userId изменится с 0 на реальный ID

  // Теперь platformsData существует и его можно вернуть
  return {
    platformsData,
    isReady: platformsData.length > 0,
    userId,
  };
};
export const useManagePlatforms = (
  platformsData: { x: number; y: number }[] | undefined,
  seed: number,
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
    [],
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
        `[GAME] Initialized ${platformsData.length} platforms with seed: ${seed}`,
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
  moveSpeed: any,
  minYReached: React.RefObject<number>,
  setIsGameOver: (v: boolean) => void,
  setFinalScore: (s: number) => void,
) => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver.current) {
        clearInterval(interval);
        return;
      }

      // 1. Плавная следящая камера (ВВЕРХ и ВНИЗ)
      const TARGET_LINE = height * 0.5;
      const doodleScreenY = y.value + cameraOffset.value;
      const diff = TARGET_LINE - doodleScreenY;

      cameraOffset.value += diff * 0.1;

      // ОБНОВЛЕННЫЙ БЛОК СЧЕТА:
      if (y.value < minYReached.current) {
        minYReached.current = y.value;
        const currentHeightScore = Math.floor(
          Math.abs(minYReached.current) / 10,
        );
        if (currentHeightScore > score) {
          setScore(currentHeightScore);
        }
      }

      // 2. Горизонтальное движение
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - moveSpeed.current);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(
          width - config.doodleSize,
          x.value + moveSpeed.current,
        );
      }

      // 3. Физика падения
      const nextVelocityY = velocityY.value + config.gravity;
      const nextY = y.value + nextVelocityY;

      // 4. Проверка столкновения
      let foundCollision = false;

      if (nextVelocityY > 0) {
        const doodleBottomCurrent = y.value + config.doodleSize;
        const doodleBottomNext = nextY + config.doodleSize;
        const doodleLeft = x.value;
        const doodleRight = x.value + config.doodleSize;

        platforms.forEach((p, index) => {
          if (foundCollision) return;

          // Сравниваем МИРОВОЙ Y персонажа с МИРОВЫМ Y платформы
          const pTop = p.y.value;
          const pLeft = p.x.value;
          const pRight = pLeft + config.platformWidth;

          // Проверка: был ли персонаж выше платформы и окажется ли внутри/ниже её
          const wasAbove = doodleBottomCurrent <= pTop + 5;
          const willBeBelow = doodleBottomNext >= pTop;
          const isWithinHorizontal =
            doodleRight > pLeft + 5 && doodleLeft < pRight - 5;

          if (wasAbove && willBeBelow && isWithinHorizontal) {
            // Приземляем персонажа точно на платформу (в мировых координатах)
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

      // 7. Смерть (персонаж ниже видимой области камеры)
      const screenY = y.value + cameraOffset.value;
      if (screenY > height) {
        // Если ушел за нижний край экрана
        gameOver.current = true;
        publishDeath(userId);
        setFinalScore(score);
        setIsGameOver(true);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [
    x,
    y,
    velocityY,
    platforms,
    cameraOffset,
    config,
    score,
    userId,
    createNewPlatform,
  ]);
};

const useManageInput = (
  isJumping: boolean,
  torsoCoords: { x: number; y: number },
  velocityY: SharedValue<number>,
  isOnPlatform: React.RefObject<boolean>,
  config: ArenaConfig,
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
