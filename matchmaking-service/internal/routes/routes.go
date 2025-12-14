package routes

import (
	"matchmaking-service/internal/handlers"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, h *handlers.EnqueueHandler) {
	r.POST("/enqueue", h.Handle)
}