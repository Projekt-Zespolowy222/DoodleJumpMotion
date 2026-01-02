export interface ArenaConfig {
  id: string;
  physics: {
    gravity: number;
    jumpHeight: number;
    moveSpeed: number;
  };
  generation: {
    minDistance: number;
    maxDistance: number;
  };
  styles: {
    backgroundColor: string;
    platformColor: string; // В будущем можно заменить на URL текстуры
  };
}

export const ARENAS: Record<string, ArenaConfig> = {
  earth: {
    id: "earth",
    physics: { gravity: 0.35, jumpHeight: 12, moveSpeed: 5 },
    generation: { minDistance: 50, maxDistance: 90 },
    styles: { backgroundColor: "#87CEEB", platformColor: "#5DB971" },
  },
  moon: {
    id: "moon",
    physics: { gravity: 0.15, jumpHeight: 10, moveSpeed: 7 }, // Низкая гравитация
    generation: { minDistance: 80, maxDistance: 140 }, // Прыжки выше — платформы дальше
    styles: { backgroundColor: "#1A1A2E", platformColor: "#A6A6A6" },
  },
};
