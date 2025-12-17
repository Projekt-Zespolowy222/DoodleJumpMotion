package services

import (
	"context"
	"log"
	"matchmaking-service/internal/models"
	"matchmaking-service/internal/repositories"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

type QueueService struct {
	repo *repositories.QueueRepo
}

var items = struct {
	sync.Mutex
	data map[string]models.QueueItem
}{data: make(map[string]models.QueueItem)}

func NewQueueService(repo *repositories.QueueRepo) *QueueService {
	return &QueueService{repo: repo}
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
			"seed":       item.Seed, // заполняем при создании сессии
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "waiting"})
}

func (s *QueueService) Enqueue(ctx context.Context, item models.QueueItem) error {
	items.Lock()
	items.data[item.RequestID] = item
	items.Unlock()
	log.Printf("[DEBUG] Enqueued requestID=%s, playerID=%d", item.RequestID, item.PlayerID)

	items.Lock()
	if _, ok := items.data[item.RequestID]; ok {
		log.Printf("[DEBUG] Confirmed: requestID=%s found in sync.Map after Store", item.RequestID)
	} else {
		log.Printf("[ERROR] requestID=%s NOT found in sync.Map after Store", item.RequestID)
	}
	items.Unlock()

	return s.repo.Add(ctx, item)
}

func (s *QueueService) GetItem(requestID string) (models.QueueItem, bool) {
	items.Lock()
	item, ok := items.data[requestID]
	items.Unlock()
	if !ok { return models.QueueItem{}, false }
	return item, true
}

func (s *QueueService) DequeuePair(ctx context.Context, arena, bucket, delta int) ([]string, error) {
	return s.repo.PopPair(ctx, arena, bucket, delta)
}

func (s *QueueService) SetSession(requestID string, sessionID uint, seed int64) {
	items.Lock()
	defer items.Unlock()

	log.Printf("[DEBUG] SetSession called with requestID=%s", requestID)

	if item, ok := items.data[requestID]; ok {
		item.SessionID = sessionID
		item.Seed      = seed
		items.data[item.RequestID] = item
		log.Printf("[DEBUG] SetSession OK for requestID=%s, sessionID=%d, seed=%d", requestID, sessionID, seed)
		return
	}
	
	for key, value := range items.data {
		log.Printf("[DEBUG] - key=%s, value=%+v", key, value)
	}

	log.Printf("[WARN-CHANGED!] SetSession FAILED: requestID=%s not found in sync.Map", requestID)
	log.Printf("%s",requestID)
}