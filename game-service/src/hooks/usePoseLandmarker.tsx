// src/hooks/usePoseLandmarker.tsx
import {
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export function usePoseLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setTorsoCoords?: (coords: { x: number; y: number }) => void,
  setIsJumping?: (jumping: boolean) => void
) {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(
    null
  );
  const [isActive, setIsActive] = useState(false);
  const lastTorsoY = useRef<number>(0);
  const jumpThreshold = 0.05;
  const stableThreshold = 0.02;
  const lastDetectionTimeRef = useRef<number>(0);

  const startDetection = () => {
    console.log("Starting pose detection");
    setIsActive(true);
  };

  const stopDetection = () => {
    console.log("Stopping pose detection");
    setIsActive(false);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let landmarker: PoseLandmarker;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        setPoseLandmarker(landmarker);
      } catch (err) {
        console.error("initialization error PoseLandmarker:", err);
      }
    }

    init();

    return () => landmarker?.close();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!poseLandmarker || !videoRef.current || !isActive) return;

    const video = videoRef.current;
    let animationFrameId: number;

    const DETECTION_INTERVAL = 50;

    const processPoseResults = (landmarks: NormalizedLandmark[]) => {
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      if (leftShoulder && rightShoulder && setTorsoCoords) {
        const torsoX = (leftShoulder.x + rightShoulder.x) / 2;
        const torsoY = (leftShoulder.y + rightShoulder.y) / 2;

        setTorsoCoords({ x: torsoX, y: torsoY });

        if (lastTorsoY.current > 0) {
          const deltaY = lastTorsoY.current - torsoY;

          // Логика прыжка
          if (deltaY > jumpThreshold && setIsJumping) {
            setIsJumping(true);
          } else if (Math.abs(deltaY) < stableThreshold && setIsJumping) {
            setIsJumping(false);
          }
        }
        lastTorsoY.current = torsoY;
      }
    };

    const detectPose = async () => {
      if (!isActive || !poseLandmarker) return;

      const now = performance.now();

      // 1. Пропускаем кадр, если прошло слишком мало времени
      if (now - lastDetectionTimeRef.current < DETECTION_INTERVAL) {
        animationFrameId = requestAnimationFrame(detectPose);
        return;
      }

      // 2. Проверка готовности видео
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          lastDetectionTimeRef.current = now;

          const results = poseLandmarker.detectForVideo(video, now);

          if (results.landmarks?.[0]) {
            processPoseResults(results.landmarks[0]);
          }
        } catch (err) {
          const error = err as Error;
          if (!error.message?.includes("ROI")) {
            console.error("Pose Error:", error);
          }
        }
      }

      animationFrameId = requestAnimationFrame(detectPose);
    };

    animationFrameId = requestAnimationFrame(detectPose);

    return () => cancelAnimationFrame(animationFrameId);
  }, [poseLandmarker, videoRef, setTorsoCoords, setIsJumping, isActive]);

  // ✅ Возвращаем функции
  return { startDetection, stopDetection };
}
