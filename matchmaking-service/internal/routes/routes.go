package routes

import (
	"matchmaking-service/internal/handlers"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, h *handlers.EnqueueHandler, sh *handlers.StatusHandler) {
	r.POST("/enqueue", h.Handle)
	r.GET("/enqueue/:requestId", sh.Handle)
}