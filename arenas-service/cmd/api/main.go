package main

import (
	"arenas-service/internal/config"
	"arenas-service/internal/domain"
	httpRouter "arenas-service/internal/http"
	"arenas-service/internal/http/handlers"
	"arenas-service/internal/repository"
	"arenas-service/internal/services"
	"log"
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
	userService := services.NewUserServiceHTTP("http://localhost:8080")
	service := services.NewArenaService(repo, userService)
	arenaHandler := handlers.NewArenaHandler(service)

	arena, err := service.GetArenaByCups(250)
	if err != nil {
    	log.Fatalf("Error getting arena: %v", err)
	}
	log.Println("Arena for 250 cups:", arena.Name)


	r := httpRouter.SetupRouter(arenaHandler)
	log.Println("Arenas service running on :8081")
	r.Run(":8081")

}
