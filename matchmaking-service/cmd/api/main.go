package main

import (
	"context"
	"log"
	"matchmaking-service/config"
	"matchmaking-service/internal/clients"
	"matchmaking-service/internal/handlers"
	"matchmaking-service/internal/repositories"
	"matchmaking-service/internal/routes"
	"matchmaking-service/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	rdb := clients.NewRedis(cfg)
	nc, _ := clients.NewNats(cfg.NatsURL)

	userCli := clients.NewUserClient("http://user-service:8080", cfg.JWTAdmin)

	qr := repositories.NewQueueRepo(rdb)
	qs := services.NewQueueService(qr)
	nP := services.NewNatsPublisher(nc)
	eh := handlers.NewEnqueueHandler(qs, userCli)
	sh := handlers.NewStatusHandler(qs)
	sc := services.NewScannerService(qs, nP, clients.NewSessionClient(cfg))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go sc.Start(ctx)

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
	AllowMethods:     []string{"GET", "POST", "OPTIONS"},
	AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
	ExposeHeaders:    []string{"Content-Length"},
	AllowCredentials: true,
	}))
	routes.Setup(r, eh, sh)

	log.Println("matchmaker on :8084")
	r.Run(":" + cfg.AppPort)
}