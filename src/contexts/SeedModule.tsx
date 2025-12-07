// src/contexts/SeedModule.tss  (или просто модуль)
export const GAME_SEED =
  (typeof window !== "undefined" ? (window as any).GAME_SEED : 0) ?? 0;

export const USER_ID =
  (typeof window !== "undefined" ? (window as any).USER_ID : 0) ?? 0;

// когда счёт изменился
export function publishScore(score: number) {
  (window.parent as any).postMessage({ type: "score", value: score }, "*");
}

// когда умерли
export function publishDeath(userId: number) {
  (window.parent as any).postMessage({ type: "death", value: userId }, "*");
}
