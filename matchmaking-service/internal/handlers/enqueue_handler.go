package handlers

import (
	"bytes"
	"io"
	"log"
	"matchmaking-service/internal/clients"
	"matchmaking-service/internal/dto"
	"matchmaking-service/internal/models"
	"matchmaking-service/internal/services"
	"matchmaking-service/internal/utils"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/gin-gonic/gin"
)

type EnqueueHandler struct {
	qs *services.QueueService
	userCli  *clients.UserClient
}

func NewEnqueueHandler(qs *services.QueueService, userCli *clients.UserClient) *EnqueueHandler {
	return &EnqueueHandler{qs: qs, userCli: userCli}
}

func (h *EnqueueHandler) Handle(c *gin.Context) {
	raw, _ := io.ReadAll(c.Request.Body)
	log.Printf("[DEBUG] raw body: %s", raw)

	c.Request.Body = io.NopCloser(bytes.NewReader(raw))
	
	var req dto.EnqueueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DEBUG] bind error=%v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[DEBUG] parsed req=%+v", req)
	
	// arenaID, err := req.Arena //convert arena string to int
	// if err !=nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "invalid arena"})
	// 	return
	// }
	userID, err := utils.Parse(c.GetHeader("Authorization")[7:])
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "bad token"})
		return
	}
	realTrophies, err := h.userCli.GetUserTrophies(c.Request.Context(), userID)
	if err != nil {
		log.Printf("[ERROR] failed to get trophies for user %d: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user data"})
		return
	}
	log.Printf("[DEBUG] Real trophies for user %d: %d", userID, realTrophies)

	item := models.QueueItem{
		RequestID: uuid.New().String(),
		PlayerID:  userID,
		Trophies:  realTrophies,
		Arena:     req.Arena,
		CreatedAt: time.Now().Unix(),
	}
	if err := h.qs.Enqueue(c, item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, dto.EnqueueResponse{RequestID: item.RequestID, Status: "waiting"})
}
