import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const CameraTestScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");

  // Пока загружается разрешение
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Загрузка...</Text>
      </View>
    );
  }

  // Если нет разрешения на камеру
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

  // Основной экран с камерой
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>✅ Камера работает!</Text>
            <Text style={styles.infoText}>
              • Камера: {facing === "front" ? "Фронтальная" : "Задняя"}
            </Text>
            <Text style={styles.infoText}>
              • Разрешение экрана: {screenWidth}x{screenHeight}
            </Text>
            <Text style={styles.infoText}>• Платформа: iOS/Android</Text>
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
      </CameraView>
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
  camera: {
    width: screenWidth,
    height: screenHeight,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
  },
  message: {
    color: "#fff",
    fontSize: 18,
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
  flipButton: {
    alignSelf: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 50,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  flipButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  instructionsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
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
  instructionsText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 24,
  },
});
