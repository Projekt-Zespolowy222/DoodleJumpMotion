package middleware

import (
	"net/http"
	"session-service/internal/services"
	"session-service/internal/ws"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var jwtSecret = []byte("supersecretkey")

func AuthMiddleware(hub *ws.Hub, sessionService *services.SessionService) gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenStr := c.Request.Header.Get("Authorization")
        if tokenStr == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "user_id missing"})
            c.Abort()
            return
        }

        parts := strings.Split(tokenStr, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token format"})
            c.Abort()
            return
        }

        userID, err := ws.ParseJWT(parts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            c.Abort()
            return
        }

        sessionIDStr := strings.TrimSpace(c.Query("session_id"))
        sessionID, err := strconv.Atoi(sessionIDStr)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session_id"})
            c.Abort()
            return
        }

        session, err := sessionService.GetSession(uint(sessionID))
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
            c.Abort()
            return
        }

        // Проверяем участника
        if session.Player1ID != uint(userID) && session.Player2ID != uint(userID) {
            c.JSON(http.StatusForbidden, gin.H{"error": "not participant"})
            c.Abort()
            return
        }

        c.Set("user_id", uint(userID))
        c.Next()
    }
}