package main

import (
	"log"
	"session-service/config"
	"session-service/internal/database"
	"session-service/internal/middleware"
	"session-service/internal/repositories"
	"session-service/internal/routes"
	"session-service/internal/services"
	"session-service/internal/ws"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	database.Connect(cfg)

	r := gin.Default()

	hub := ws.NewHub()
	repo := repositories.NewSessionRepository()
	sessionService := services.NewSessionService(repo)

	routes.RegisterRoutes(r, hub)

	r.GET("/ws", middleware.AuthMiddleware(hub, sessionService), ws.WSHandler(hub, sessionService))

	log.Println("🚀 Session Service running on port " + cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
