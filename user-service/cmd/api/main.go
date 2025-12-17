package main

import (
	"doodlejump-backend/user-service/internal/config"
	"doodlejump-backend/user-service/internal/domain"
	"doodlejump-backend/user-service/internal/http"
	"doodlejump-backend/user-service/internal/services"
	"fmt"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	cfg := config.NewConfig()
	godotenv.Load()
	token := os.Getenv("INTERNAL_API_TOKEN")
	fmt.Println("Loaded internal token:", token)

	db, err := config.ConnectDB(cfg)
	if err != nil {
		panic(fmt.Sprintf("failed to connect database: %v", err))
	}

	err = db.AutoMigrate(&domain.User{})
	if err != nil {
		panic(fmt.Sprintf("failed to migrate users table: %v", err))
	}
	fmt.Println("Users table migrated successfully!")

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://127.0.0.1:5500",
			"http://localhost:8079",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	http.RegisterRoutes(db, r)

	adminToken, _ := services.GenerateAdminJWT(7, "admin1")
	fmt.Println("=== ETERNAL ADMIN TOKEN ===")
	fmt.Println(adminToken)
	fmt.Println("===========================")

	if err := r.Run(":8080"); err != nil {
		panic(fmt.Sprintf("failed to run server: %v", err))
	}
}
