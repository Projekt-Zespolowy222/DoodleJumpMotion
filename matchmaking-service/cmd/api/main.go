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

	userCli := clients.NewUserClient("http://host.docker.internal:8080", cfg.JWTAdmin)

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
	AllowOrigins:     []string{"*"},
	AllowMethods:     []string{"GET", "POST", "OPTIONS"},
	AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
	ExposeHeaders:    []string{"Content-Length"},
	AllowCredentials: true,
	}))
	routes.Setup(r, eh, sh)

	log.Println("matchmaker on :8084")
	r.Run(":" + cfg.AppPort)
}