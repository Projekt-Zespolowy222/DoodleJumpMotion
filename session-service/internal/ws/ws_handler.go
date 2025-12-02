package ws

import (
	"net/http"
	"session-service/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Upgrader для WebSocket
var Upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    Subprotocols:    []string{},
}

// WSHandler обрабатывает WS соединения
func WSHandler(hub *Hub, sessionService *services.SessionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем userID из middleware
		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user_id missing"})
			return
		}
		userID := userIDInterface.(int64)

		// Получаем sessionID из query params
		sessionIDStr := c.Query("session_id")
		sessionID64, err := strconv.ParseUint(sessionIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id"})
			return
		}
		sessionID := uint(sessionID64)

		// Проверяем, что userID участвует в этой сессии
		session, err := sessionService.GetSession(sessionID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}

		if session.Player1ID != uint(userID) && session.Player2ID != uint(userID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "not participant of this session"})
			return
		}

		// Апгрейдим соединение
		conn, err := Upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		client := &Client{
			UserID: uint(userID),
			Conn:   conn,
			Send:   make(chan []byte),
		}

		// Регистрируем клиента
		hub.Register(sessionID, client)
		defer hub.Unregister(sessionID, client.UserID)

		// Горутина для отправки сообщений
		go func() {
			for msg := range client.Send {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					break
				}
			}
		}()

		// Чтение сообщений, просто чтобы держать соединение
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}
}
