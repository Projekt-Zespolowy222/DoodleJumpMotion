import React, { useEffect, useMemo, useRef, useState } from "react";
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
  DOODLE_SIZE,
  GRAVITY,
  height,
  JUMP_HEIGHT,
  MOVE_SPEED,
  PLATFORM_HEIGHT,
  PLATFORM_WIDTH,
  width,
} from "../constants/config";

interface PlatformType {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

export const GameScreen = () => {
  const PLATFORM_COUNT = 20; // Увеличили количество платформ

  // Позиция Doodle (top координаты, 0 = верх экрана)
  const x = useSharedValue(width / 2 - DOODLE_SIZE / 2);
  const y = useSharedValue(height - 200); // Начинаем внизу
  const velocityY = useSharedValue(0); // Скорость по Y (положительная = вниз, отрицательная = вверх)

  const [score, setScore] = useState(0);
  const moveDirection = useRef<"left" | "right" | null>(null);
  const started = useRef(false);
  const gameOver = useRef(false);
  const lastPlatformHit = useRef<number | null>(null);
  const scrollOffset = useRef(0); // Общий сдвиг камеры
  const lastJumpTime = useRef(0); // Время последнего прыжка
  const cameraOffset = useSharedValue(0); // Плавное смещение камеры

  // Создаем начальные позиции платформ (обычный массив)
  const platformPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const MAX_DISTANCE = 90; // Максимальное расстояние между платформами
    const MIN_DISTANCE = 50; // Минимальное расстояние

    // Первая платформа - гарантированно по центру под персонажем
    const startPlatformY = height - 100; // Y координата стартовой платформы
    const startPlatformX = width / 2 - PLATFORM_WIDTH / 2; // X координата по центру

    positions.push({
      x: startPlatformX,
      y: startPlatformY,
    });

    let currentY =
      startPlatformY -
      (Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE);

    // Остальные платформы генерируем случайно (начинаем с i = 1, так как 0-я уже добавлена)
    for (let i = 1; i < PLATFORM_COUNT; i++) {
      const platformX = Math.random() * (width - PLATFORM_WIDTH - 40) + 20;

      positions.push({
        x: platformX,
        y: currentY,
      });

      currentY -= Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE; // Поднимаемся вверх
    }

    return positions;
  }, []);
  // Создаем shared values для каждой платформы
  const platform0X = useSharedValue(platformPositions[0].x);
  const platform0Y = useSharedValue(platformPositions[0].y);
  const platform1X = useSharedValue(platformPositions[1].x);
  const platform1Y = useSharedValue(platformPositions[1].y);
  const platform2X = useSharedValue(platformPositions[2].x);
  const platform2Y = useSharedValue(platformPositions[2].y);
  const platform3X = useSharedValue(platformPositions[3].x);
  const platform3Y = useSharedValue(platformPositions[3].y);
  const platform4X = useSharedValue(platformPositions[4].x);
  const platform4Y = useSharedValue(platformPositions[4].y);
  const platform5X = useSharedValue(platformPositions[5].x);
  const platform5Y = useSharedValue(platformPositions[5].y);
  const platform6X = useSharedValue(platformPositions[6].x);
  const platform6Y = useSharedValue(platformPositions[6].y);
  const platform7X = useSharedValue(platformPositions[7].x);
  const platform7Y = useSharedValue(platformPositions[7].y);
  const platform8X = useSharedValue(platformPositions[8].x);
  const platform8Y = useSharedValue(platformPositions[8].y);
  const platform9X = useSharedValue(platformPositions[9].x);
  const platform9Y = useSharedValue(platformPositions[9].y);
  const platform10X = useSharedValue(platformPositions[10].x);
  const platform10Y = useSharedValue(platformPositions[10].y);
  const platform11X = useSharedValue(platformPositions[11].x);
  const platform11Y = useSharedValue(platformPositions[11].y);
  const platform12X = useSharedValue(platformPositions[12].x);
  const platform12Y = useSharedValue(platformPositions[12].y);
  const platform13X = useSharedValue(platformPositions[13].x);
  const platform13Y = useSharedValue(platformPositions[13].y);
  const platform14X = useSharedValue(platformPositions[14].x);
  const platform14Y = useSharedValue(platformPositions[14].y);
  const platform15X = useSharedValue(platformPositions[15].x);
  const platform15Y = useSharedValue(platformPositions[15].y);
  const platform16X = useSharedValue(platformPositions[16].x);
  const platform16Y = useSharedValue(platformPositions[16].y);
  const platform17X = useSharedValue(platformPositions[17].x);
  const platform17Y = useSharedValue(platformPositions[17].y);
  const platform18X = useSharedValue(platformPositions[18].x);
  const platform18Y = useSharedValue(platformPositions[18].y);
  const platform19X = useSharedValue(platformPositions[19].x);
  const platform19Y = useSharedValue(platformPositions[19].y);

  // Собираем все платформы в массив
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
    []
  );

  // Анимации Doodle (используем top вместо bottom) с учётом смещения камеры
  const doodleStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value + cameraOffset.value,
    width: DOODLE_SIZE,
    height: DOODLE_SIZE,
    position: "absolute",
  }));

  // Анимации платформ (используем top вместо bottom) с учётом смещения камеры
  const platformStyles = platforms.map((p) =>
    useAnimatedStyle(() => ({
      left: p.x.value,
      top: p.y.value + cameraOffset.value,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      position: "absolute",
    }))
  );

  // Функция для создания новой платформы наверху
  const createNewPlatform = (platform: PlatformType) => {
    // Находим самую высокую (минимальную Y) платформу
    const highestY = Math.min(...platforms.map((p) => p.y.value));

    // Создаем новую платформу выше на безопасном расстоянии
    const verticalDistance = Math.random() * 40 + 60; // 60-100 пикселей
    const newY = highestY - verticalDistance;

    // Генерируем X позицию (не слишком близко к краям)
    const newX = Math.random() * (width - PLATFORM_WIDTH - 60) + 30;

    platform.y.value = newY;
    platform.x.value = newX;
  };

  // Игровой цикл
  useEffect(() => {
    if (gameOver.current) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();

      // Движение Doodle по X
      if (moveDirection.current === "left") {
        x.value = Math.max(0, x.value - MOVE_SPEED);
      } else if (moveDirection.current === "right") {
        x.value = Math.min(width - DOODLE_SIZE, x.value + MOVE_SPEED);
      }

      // Применяем гравитацию (увеличиваем скорость падения)
      velocityY.value += GRAVITY;

      // Двигаем персонажа (положительная velocityY = вниз)
      y.value += velocityY.value;

      // Плавная прокрутка камеры когда персонаж поднимается высоко
      const SCROLL_THRESHOLD = height * 0.5;
      const targetOffset = Math.max(0, SCROLL_THRESHOLD - y.value);

      // Плавно интерполируем смещение камеры (0.15 = скорость интерполяции)
      cameraOffset.value += (targetOffset - cameraOffset.value) * 0.15;

      // Если камера сместилась, проверяем платформы
      if (cameraOffset.value > 5) {
        platforms.forEach((p) => {
          // Реальная позиция платформы с учётом смещения
          const realY = p.y.value + cameraOffset.value;

          // Если платформа ушла за нижнюю границу
          if (realY > height + PLATFORM_HEIGHT + 100) {
            createNewPlatform(p);
            // Корректируем позицию новой платформы с учётом текущего смещения
            p.y.value -= cameraOffset.value;
          }
        });

        // Обновляем счет на основе смещения камеры
        scrollOffset.current = cameraOffset.value;
        setScore(Math.floor(scrollOffset.current / 10));
      }

      // Проверка столкновений - только если падаем И прошло минимум 200ms с последнего прыжка
      const MIN_JUMP_INTERVAL = 200; // Минимальное время между прыжками в миллисекундах
      const canJumpNow = currentTime - lastJumpTime.current > MIN_JUMP_INTERVAL;

      if (velocityY.value > 0 && canJumpNow) {
        const doodleBottom = y.value + DOODLE_SIZE;

        // Ищем ближайшую платформу под персонажем
        let closestPlatformIndex: number = -1;
        let closestDistance: number = 999;

        platforms.forEach((p, index) => {
          const platformTop = p.y.value;

          // Проверяем, что платформа ниже персонажа
          if (platformTop < doodleBottom - 5) return;

          // Проверяем горизонтальное выравнивание
          const isHorizontallyAligned =
            x.value + DOODLE_SIZE > p.x.value + 15 &&
            x.value < p.x.value + PLATFORM_WIDTH - 15;

          if (!isHorizontallyAligned) return;

          const distance = platformTop - doodleBottom;

          // Обновляем ближайшую платформу если эта ближе
          if (distance >= 0 && distance < 20 && distance < closestDistance) {
            closestPlatformIndex = index;
            closestDistance = distance;
          }
        });

        // Если нашли подходящую платформу - прыгаем
        if (closestPlatformIndex >= 0) {
          const closestPlatform = platforms[closestPlatformIndex];
          lastJumpTime.current = currentTime;
          lastPlatformHit.current = closestPlatformIndex;
          y.value = closestPlatform.y.value - DOODLE_SIZE;
          velocityY.value = -JUMP_HEIGHT;
        }
      }

      // Сбрасываем lastPlatformHit когда летим вверх
      if (velocityY.value < -5) {
        lastPlatformHit.current = null;
      }

      // Game Over - если упали за нижнюю границу
      if (y.value > height + DOODLE_SIZE) {
        gameOver.current = true;
        clearInterval(interval);
        Alert.alert("Game Over", `Your score: ${score}`, [
          {
            text: "OK",
            onPress: () => {},
          },
        ]);
      }

      // Старт игры
      if (!started.current && y.value < height - 150) {
        started.current = true;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [platforms, score]);

  return (
    <View style={styles.container}>
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
