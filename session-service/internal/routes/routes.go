package routes

import (
	"session-service/internal/handlers"
	"session-service/internal/ws"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes регистрирует все эндпоинты сервиса
func RegisterRoutes(r *gin.Engine, hub *ws.Hub) {
    // Пример маршрутов для сессий и матчей
    sessionHandler := handlers.NewSessionHandler()
    matchHandler := handlers.NewMatchHandler()

    // Группы маршрутов
    sessionRoutes := r.Group("/sessions")
    {
        sessionRoutes.POST("/", sessionHandler.CreateSession)
        sessionRoutes.GET("/:id", sessionHandler.GetSession)
		sessionRoutes.PATCH("/:id/join", sessionHandler.JoinSession)
		sessionRoutes.POST("/:id/finish", sessionHandler.FinishSession)
        sessionRoutes.POST("/:id/leave", sessionHandler.LeaveSession)
        // Добавишь остальные методы
    }

    matchRoutes := r.Group("/matches")
    {
        matchRoutes.POST("/", matchHandler.CreateMatch)
        matchRoutes.GET("/:id", matchHandler.GetMatch)
        // Добавишь остальные методы
    }
}
