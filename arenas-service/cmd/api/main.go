package main

import (
	"arenas-service/internal/config"
	"arenas-service/internal/domain"
	httpRouter "arenas-service/internal/http"
	"arenas-service/internal/http/handlers"
	"arenas-service/internal/repository"
	"arenas-service/internal/services"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
)


func main() {
	cfg := config.LoadConfig()
	db := config.ConnectDB(cfg)

	// migrations of Arena table
	err := db.AutoMigrate(&domain.Arena{})
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected and Arena table migrated successfully")

	// repo := repository.NewArenaRepository(db)
	// arena := &domain.Arena{Name: "Test arena", MinCups: 0, MaxCups: 499, Theme: "Forrest and lands"}
	// err = repo.CreateArena(arena)
	// if err != nil {
    // 	log.Fatalf("Failed to create arena: %v", err)
	// }
	// log.Println("Arena created:", arena)

	repo := repository.NewArenaRepository(db)
	userServiceURL := os.Getenv("USER_SERVICE_URL")
	if userServiceURL == "" {
		userServiceURL = "http://164.68.111.100:8080" // fallback для локального запуска
	}
	userService := services.NewUserServiceHTTP(userServiceURL)
	service := services.NewArenaService(repo, userService)
	arenaHandler := handlers.NewArenaHandler(service)

	arena, err := service.GetArenaByCups(250)
	if err != nil {
    	log.Fatalf("Error getting arena: %v", err)
	}
	log.Println("Arena for 250 cups:", arena.Name)


	r := httpRouter.SetupRouter(arenaHandler)
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://127.0.0.1:5500", // frontend
			"http://localhost:8079", // Expo Web
			"http://164.68.111.100:3000",
			"http://164.68.111.100:8079",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	log.Println("Arenas service running on :8081")
	r.Run(":8081")
}
