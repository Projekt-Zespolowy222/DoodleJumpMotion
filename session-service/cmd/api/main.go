package main

import (
	"log"
	"session-service/config"
	"session-service/internal/database"
	"session-service/internal/handlers"
	"session-service/internal/middleware"
	"session-service/internal/repositories"
	"session-service/internal/routes"
	"session-service/internal/services"
	"session-service/internal/ws"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	database.Connect(cfg)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
        "https://164-68-111-100.sslip.io", // Основной домен (Nginx)
        "http://164.68.111.100",           // Прямой IP (HTTP)
        "http://164.68.111.100:3000",      // Фронтенд напрямую
        "http://164.68.111.100:8079",      // Игра напрямую
        "http://localhost:3000",           // Локалка фронт
        "http://localhost:8079",           // Локалка игра
        "http://127.0.0.1:5500",           // Live Server VS Code
    	},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	hub := ws.NewHub()
	repo := repositories.NewSessionRepository()
	sessionService := services.NewSessionService(repo)
	matchHandler := handlers.NewMatchHandler()
	sessionScore := ws.NewSessionScores()


	routes.RegisterRoutes(r, hub)

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	r.GET("/ws", middleware.AuthMiddleware(hub, sessionService), ws.WSHandler(hub, sessionService, matchHandler, sessionScore))

	log.Println("🚀 Session Service running on port " + cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
