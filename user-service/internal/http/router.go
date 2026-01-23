package http

import (
	"doodlejump-backend/user-service/internal/repository"
	"doodlejump-backend/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(db *gorm.DB, r *gin.Engine) {
    userRepo := repository.NewUserRepository(db)
    userService := services.NewUserService(userRepo)
    authHandler := NewAuthHandler(userService)

    r.POST("/auth/register", authHandler.Register)
    r.POST("/auth/login", authHandler.Login)
    r.GET("/profile", IdMiddleware(), ProfileHandler(userService))
    r.GET("/users/:id", AuthMiddleware(), GetUserByIDHandler(userService))

    internal := r.Group("/users")
    internal.Use(AuthMiddleware())
    {
        internal.PUT("/:id/cups", authHandler.UpdateCups)
    }

    info := r.Group("/info")
    info.Use(InternalAuthMiddleware())
    {
        info.GET("/users/all", authHandler.GetAllUsersInfo)
    }
}

