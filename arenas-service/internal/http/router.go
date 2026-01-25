package http

import (
	"arenas-service/internal/http/handlers"

	"github.com/gin-gonic/gin"
) 

func SetupRouter(arenaHandler *handlers.ArenaHandler) *gin.Engine {
	r := gin.Default()

	r.Use(LoggerMiddleware()) // general logger
	r.Use(AuthMiddleware())
	
	// general GET
	r.GET("/arena/:cups", arenaHandler.GetArenaByCups)
	r.GET("/api/arena/:cups", arenaHandler.GetArenaByCups)
	r.GET("/arenas", arenaHandler.GetAllArenas)
	r.GET("/:cups", arenaHandler.GetArenaByCups)

	// secure endpoints
	auth := r.Group("/")
	auth.Use(AuthMiddleware())

	// only the admin can create/edit/delete arenas.
	admin := auth.Group("/")
	admin.Use(AdminOnlyMiddleware())
	admin.POST("/arena", arenaHandler.CreateArena)
	admin.PUT("/arena/:id", arenaHandler.UpdateArena)
	admin.DELETE("/arena/:id", arenaHandler.DeleteArena)

	return r
}