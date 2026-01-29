export const GAME_SEED =
  (typeof window !== "undefined" ? (window as any).GAME_SEED : 0) ?? 0;

export const USER_ID =
  (typeof window !== "undefined" ? (window as any).USER_ID : 0) ?? 0;

// Функция отправки счета
export function publishScore(score: number) {
  const message = {
    type: "score", // gameShell.js ожидает именно "score"
    value: score,
  };

  console.log(`[SeedModule] Publishing score: ${score}`);

  // Отправляем в родительское окно (gameShell.js)
  if (typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(message, "*");
  }
}

// Функция отправки смерти
export function publishDeath(userId: number) {
  const message = {
    type: "death", // ВАЖНО: gameShell.js проверяет type === "death"
    value: userId,
  };

  console.log(`[SeedModule] Player ${userId} died. Sending to parent...`);

  if (typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(message, "*");
  }
}
