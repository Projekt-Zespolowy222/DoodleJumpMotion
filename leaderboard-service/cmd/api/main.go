package main

import (
	"doodlejump-backend/leaderboard-service/internal/config"
	"doodlejump-backend/leaderboard-service/internal/database"
	"doodlejump-backend/leaderboard-service/internal/handlers"
	"doodlejump-backend/leaderboard-service/internal/models"
	"doodlejump-backend/leaderboard-service/internal/redis"
	"doodlejump-backend/leaderboard-service/internal/repository"
	"doodlejump-backend/leaderboard-service/internal/services"
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	cfg := config.LoadConfig()
	godotenv.Load()
	
	db, err := database.Connect(cfg)
	if err != nil {
		panic(fmt.Sprintf("failed to connect database: %v", err))
	}
	
	err = db.AutoMigrate(&models.LeaderboardUserModel{})
	if err != nil {
		panic(fmt.Sprintf("failed to migrate users table: %v", err))
	}
	fmt.Println("Users table migrated successfully!")

	rdb := redis.NewClient(cfg)

	pgRepo := repository.NewLeaderboardRepository()
	redisRepo := repository.NewRedisLeaderboardRepository(rdb, pgRepo)

	service := services.NewLeaderboardService(pgRepo, redisRepo)

	go func() {
		if err := services.SyncUsersFromUserService(service); err != nil {
			log.Printf("❌ failed to sync users: %v", err)
		} else {
			log.Println("✅ users synced successfully")
		}
	}()

	handler := handlers.NewLeaderboardHandler(service)

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
	}))

	r.GET("/leaderboard/top", handler.GetTopHandler)
	r.POST("/leaderboard/update", handler.UpdateAndSaveCup)
	r.Run(":" + cfg.AppPort)
}
