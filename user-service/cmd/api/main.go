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

	var users []domain.User
	db.Find(&users)
	for _, u := range users {
    	if u.CurrentArenaID == 0 && u.CupCount >= 0 {
        	u.CurrentArenaID = http.CalculateArenaByCups(u.CupCount)
        	db.Save(&u)
    	}
	}

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

	r.Use(func(c *gin.Context) {
    fmt.Printf("🔥 REQUEST: %s %s | Auth: %s\n", 
        c.Request.Method, 
        c.Request.URL.Path,
        c.GetHeader("Authorization"))
		c.Next()
		fmt.Printf("✅ RESPONSE: %d\n", c.Writer.Status())
	})
	
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	http.RegisterRoutes(db, r)

	adminToken, _ := services.GenerateAdminJWT(7, "admin1")
	fmt.Println("=== ETERNAL ADMIN TOKEN ===")
	fmt.Println(adminToken)
	fmt.Println("===========================")

	if err := r.Run(":8080"); err != nil {
		panic(fmt.Sprintf("failed to run server: %v", err))
	}
}
