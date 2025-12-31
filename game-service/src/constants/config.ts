import { Dimensions } from "react-native";

export const { width, height } = Dimensions.get("window");

export const DOODLE_SIZE = 40;
export const PLATFORM_WIDTH = 120; // Увеличил ширину платформ
export const PLATFORM_HEIGHT = 20;
export const MOVE_SPEED = 5;
export const GRAVITY = 0.25; // Еще меньше гравитация для более плавных прыжков
export const JUMP_HEIGHT = 14; // Увеличил высоту прыжка
