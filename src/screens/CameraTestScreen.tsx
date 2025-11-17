import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const CameraTestScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [torsoCoords, setTorsoCoords] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ Хук вызываем на верхнем уровне, внутри него проверка Platform.OS
  usePoseLandmarker(videoRef, setTorsoCoords);

  // Запуск камеры на Web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!permission?.granted || !videoRef.current) return;

    const video = videoRef.current;

    const startCameraAndPose = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });

        // Только после того как видео запущено
        usePoseLandmarker(videoRef, setTorsoCoords);
      } catch (err) {
        console.error("Не удалось получить камеру:", err);
      }
    };

    startCameraAndPose();
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Загрузка...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.title}>📷 Нужен доступ к камере</Text>
          <Text style={styles.subtitle}>
            Для тестирования управления необходим доступ к камере
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Разрешить доступ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <video
          ref={videoRef}
          style={styles.camera}
          autoPlay
          playsInline
          muted
        />
      ) : (
        <CameraView style={styles.camera} facing={facing} />
      )}

      <View style={styles.overlay}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ Камера работает!</Text>
          <Text style={styles.infoText}>
            • Камера: {facing === "front" ? "Фронтальная" : "Задняя"}
          </Text>
          <Text style={styles.infoText}>
            • Разрешение экрана: {screenWidth}x{screenHeight}
          </Text>
          <Text style={styles.infoText}>• Платформа: {Platform.OS}</Text>
          {Platform.OS === "web" && (
            <Text style={styles.infoText}>
              • Торс X: {torsoCoords.x.toFixed(2)}, Y:{" "}
              {torsoCoords.y.toFixed(2)}
            </Text>
          )}
        </View>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Инструкции:</Text>
          <Text style={styles.instructionsText}>
            1. Используйте фронтальную камеру{"\n"}
            2. Встаньте на расстоянии 1-2 метра{"\n"}
            3. Убедитесь, что торс виден полностью{"\n"}
            4. Проверьте освещение (должно быть светло)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: { width: screenWidth, height: screenHeight },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
  },
  message: { color: "#fff", fontSize: 18 },
  permissionBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    maxWidth: 350,
    margin: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  infoBox: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  instructionsBox: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  instructionsText: { fontSize: 15, color: "#555", lineHeight: 24 },
});
