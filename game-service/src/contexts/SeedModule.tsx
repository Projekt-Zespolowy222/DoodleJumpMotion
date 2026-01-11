export const GAME_SEED =
  (typeof window !== "undefined" ? (window as any).GAME_SEED : 0) ?? 0;

export const USER_ID =
  (typeof window !== "undefined" ? (window as any).USER_ID : 0) ?? 0;

const PARENT_ORIGIN =
  process.env.EXPO_PUBLIC_PARENT_ORIGIN || "http://localhost:3000";

// Функция отправки счета
export function publishScore(score: number) {
  const message = {
    type: "score",
    value: score,
  };

  const socket = (window as any).socket;

  // ЛОГ ДЛЯ ПРОВЕРКИ: Видим ли мы сокет в момент прыжка?
  console.log(
    `[SeedModule] Publishing score: ${score}, Socket OK: ${
      !!socket && socket.readyState === 1
    }`
  );

  // 1. Отправка на сервер через WebSocket
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }

  // 2. Отправка в родительское окно (на всякий случай для UI)
  if (typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(message, PARENT_ORIGIN);
  }
}

// Функция отправки смерти
export function publishDeath(userId: number) {
  const message = {
    type: "player_death",
    value: userId,
  };

  const socket = (window as any).socket;
  console.log(`[SeedModule] Player ${userId} died. Sending to WS...`);

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }

  if (typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(message, PARENT_ORIGIN);
  }
}
