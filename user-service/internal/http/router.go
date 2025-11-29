package http

import (
	"doodlejump-backend/user-service/internal/repository"
	"doodlejump-backend/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	userRepo := repository.NewUserRepository(db)
	userService := services.NewUserService(userRepo)
	authHandler := NewAuthHandler(userService)

	r.POST("/auth/register", authHandler.Register)
	r.GET("/ping", func(c *gin.Context) { c.JSON(200, gin.H{"message": "pong"}) })
	r.POST("/auth/login", authHandler.Login)
	r.GET("/profile", AuthMiddleware(), ProfileHandler)
	r.GET("/users/:id", AuthMiddleware(), GetUserByIDHandler(userService))

	return r
}

