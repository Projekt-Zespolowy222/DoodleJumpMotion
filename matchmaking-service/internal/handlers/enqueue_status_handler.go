package handlers

import (
	"log"
	"matchmaking-service/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type StatusHandler struct {
	qs *services.QueueService
}

func NewStatusHandler(qs *services.QueueService) *StatusHandler {
	return &StatusHandler{qs: qs}
}

func (h *StatusHandler) Handle(c *gin.Context) {
	reqID := c.Param("requestId")
	item, ok := h.qs.GetItem(reqID) // см. ниже
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	// если матч уже создан – отдаём sessionId и seed
	if item.SessionID != 0 {
		c.JSON(http.StatusOK, gin.H{
			"status":     "found",
			"session_id": item.SessionID,
			"seed":       item.Seed,
		})
		return
	}
	log.Printf("SessionID: %d for requestID=%s", item.SessionID, reqID)
	c.JSON(http.StatusOK, gin.H{"status": "waiting"})
}