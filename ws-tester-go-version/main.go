package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type TestClient struct {
	baseURL string
	userID  uint
}

// NewTestClient создает нового клиента для тестирования
func NewTestClient(baseURL string, userID uint) *TestClient {
	return &TestClient{
		baseURL: baseURL,
		userID:  userID,
	}
}

// Enqueue отправляет запрос на поиск матча
func (c *TestClient) Enqueue(arena int, trophies int) (string, error) {
	url := fmt.Sprintf("%s/enqueue", c.baseURL)
	body, _ := json.Marshal(map[string]interface{}{
		"trophies": trophies,
		"arena":    arena,
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", "your_jwt_token"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return "", fmt.Errorf("enqueue failed with status %d", resp.StatusCode)
	}

	var response struct {
		RequestID string `json:"request_id"`
		Status    string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", err
	}

	return response.RequestID, nil
}

// JoinSession подключается к сессии через WebSocket
func (c *TestClient) JoinSession(sessionID uint) (*websocket.Conn, error) {
	url := fmt.Sprintf("%s/ws?session_id=%d", c.baseURL, sessionID)
	header := http.Header{}
	header.Set("Authorization", fmt.Sprintf("Bearer %s", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjczOTM3OTYsInJvbGUiOiJwbGF5ZXIiLCJ1c2VyX2lkIjoyMCwidXNlcm5hbWUiOiJoYXJyeSJ9.IVSyXt6dlOTfEx1QhVvHyaXtsxIawXpsveB0JubCUdI"))

	conn, _, err := websocket.DefaultDialer.Dial(url, header)
	if err != nil {
		return nil, err
	}

	return conn, nil
}

// SendScore отправляет очки через WebSocket
func (c *TestClient) SendScore(conn *websocket.Conn, score int) error {
	msg := map[string]interface{}{
		"type":  "score",
		"value": score,
	}
	data, _ := json.Marshal(msg)

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return err
	}

	return nil
}

// LeaveSession отправляет сигнал о выходе из сессии
func (c *TestClient) LeaveSession(conn *websocket.Conn) error {
	msg := map[string]interface{}{
		"type":  "player_death",
		"value": c.userID,
	}
	data, _ := json.Marshal(msg)

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return err
	}

	return nil
}

func main() {
	// Настройка клиента для тестирования
	testClient := NewTestClient("http://localhost:8088", 20) // Замените на свой URL и userID

	// Шаг 1: Запрос на поиск матча
	requestID, err := testClient.Enqueue(1, 1000)
	if err != nil {
		log.Fatalf("Failed to enqueue: %v", err)
	}
	fmt.Printf("Enqueued with requestID: %s\n", requestID)

	// Шаг 2: Подождать, пока матч не будет найден
	time.Sleep(15 * time.Second) // Замените на реальную логику ожидания

	// Шаг 3: Подключение к сессии через WebSocket
	sessionID := uint(1) // Замените на реальный идентификатор сессии
	conn, err := testClient.JoinSession(sessionID)
	if err != nil {
		log.Fatalf("Failed to join session: %v", err)
	}
	defer conn.Close()
	fmt.Printf("Joined session with ID: %d\n", sessionID)

	// Шаг 4: Симуляция игры (отправка очков)
	if err := testClient.SendScore(conn, 500); err != nil {
		log.Fatalf("Failed to send score: %v", err)
	}
	fmt.Println("Sent score: 500")

	// Шаг 5: Завершение игры (отправка сигнала о смерти)
	if err := testClient.LeaveSession(conn); err != nil {
		log.Fatalf("Failed to leave session: %v", err)
	}
	fmt.Println("Left session")
}