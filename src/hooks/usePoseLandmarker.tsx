// src/hooks/usePoseLandmarker.tsx
import {
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function usePoseLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setTorsoCoords?: (coords: { x: number; y: number }) => void
) {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(
    null
  );

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
          },
          runningMode: "VIDEO",
        });

        setPoseLandmarker(landmarker);
      } catch (err) {
        console.error("Ошибка инициализации PoseLandmarker:", err);
      }
    }

    init();

    return () => landmarker?.close();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!poseLandmarker || !videoRef.current) return;

    const video = videoRef.current;
    let animationFrameId: number;

    const detectPose = async () => {
      if (!video || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(detectPose);
        return;
      }

      try {
        const results: PoseLandmarkerResult = poseLandmarker.detectForVideo(
          video,
          performance.now()
        );

        if (results.landmarks?.[0] && setTorsoCoords) {
          const landmarks: NormalizedLandmark[] = results.landmarks[0]; // массив NormalizedLandmark

          const leftShoulder = landmarks[11];
          const rightShoulder = landmarks[12];

          if (leftShoulder && rightShoulder) {
            const torsoX = (leftShoulder.x + rightShoulder.x) / 2;
            const torsoY = (leftShoulder.y + rightShoulder.y) / 2;
            setTorsoCoords({ x: torsoX, y: torsoY });
          }
        }
      } catch (err) {
        console.error("Ошибка детекции позы:", err);
      }

      animationFrameId = requestAnimationFrame(detectPose);
    };

    animationFrameId = requestAnimationFrame(detectPose);

    return () => cancelAnimationFrame(animationFrameId);
  }, [poseLandmarker, videoRef, setTorsoCoords]);
}
