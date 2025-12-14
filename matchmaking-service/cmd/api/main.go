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

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	rdb := clients.NewRedis(cfg)
	nc, _ := clients.NewNats(cfg.NatsURL)

	qr := repositories.NewQueueRepo(rdb)
	qs := services.NewQueueService(qr)
	nP := services.NewNatsPublisher(nc)
	eh := handlers.NewEnqueueHandler(qs)
	sc := services.NewScannerService(qs, nP)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go sc.Start(ctx)

	r := gin.Default()
	routes.Setup(r, eh)

	log.Println("matchmaker on :8084")
	r.Run(":" + cfg.AppPort)
}