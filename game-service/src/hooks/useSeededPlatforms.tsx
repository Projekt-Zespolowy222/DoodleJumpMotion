// src/hooks/useSeededPlatforms.ts
import { useMemo } from "react";
import { height, PLATFORM_WIDTH, width } from "../constants/config";
import { SeededRandom } from "../utils/SeededRandom";

const PLATFORM_COUNT = 20;
const MAX_DISTANCE = 90;
const MIN_DISTANCE = 50;

export function useSeededPlatforms(seed?: number | null) {
  return useMemo(() => {
    if (seed == null) return [];
    const rnd = new SeededRandom(seed);

    const positions: { x: number; y: number }[] = [];

    /* 1-я платформа – жёстко центр + низ экрана */
    positions.push({
      x: width / 2 - PLATFORM_WIDTH / 2,
      y: height - 100, // 100 pt от дна – можно подстроить
    });

    let currentY =
      positions[0].y -
      (rnd?.range(MIN_DISTANCE, MAX_DISTANCE) ??
        Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE);

    /* остальные 19 – как раньше, через seeded/random */
    for (let i = 1; i < PLATFORM_COUNT; i++) {
      const platformX = rnd
        ? rnd.range(20, width - PLATFORM_WIDTH - 10)
        : Math.random() * (width - PLATFORM_WIDTH - 20) + 10;

      positions.push({ x: platformX, y: currentY });

      currentY -= rnd
        ? rnd.range(MIN_DISTANCE, MAX_DISTANCE)
        : Math.random() * (MAX_DISTANCE - MIN_DISTANCE) + MIN_DISTANCE;
    }
    return positions;
  }, [seed]);
}
