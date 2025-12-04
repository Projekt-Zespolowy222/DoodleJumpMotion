package handlers

import (
	"net/http"
	"session-service/internal/database"
	"session-service/internal/dto"
	"session-service/internal/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type MatchHandler struct{}

func NewMatchHandler() *MatchHandler {
	return &MatchHandler{}
}

func (h *MatchHandler) CreateMatch(c *gin.Context) {
	var dto dto.CreateMatchDTO

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	match := models.MatchResult{
		SessionID:     dto.SessionID,
		Player1ID:     dto.Player1ID,
		Player2ID:     dto.Player2ID,
		Player1Score:  dto.Player1Score,
		Player2Score:  dto.Player2Score,
		Player1CupDiff: dto.Player1CupDiff,
		Player2CupDiff: dto.Player2CupDiff,
		WinnerID:      dto.WinnerID,
		PlayedAt:      time.Now(),
	}

	if err := database.DB.Create(&match).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, match)
}

func (h *MatchHandler) GetMatch(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid match ID"})
		return
	}

	var match models.MatchResult
	if err := database.DB.First(&match, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	c.JSON(http.StatusOK, match)
}

func (h *MatchHandler) CreateMatchDirect(dto dto.CreateMatchDTO) (*models.MatchResult, error) {
    match := models.MatchResult{
        SessionID:     dto.SessionID,
        Player1ID:     dto.Player1ID,
        Player2ID:     dto.Player2ID,
        Player1Score:  dto.Player1Score,
        Player2Score:  dto.Player2Score,
        Player1CupDiff: dto.Player1CupDiff,
        Player2CupDiff: dto.Player2CupDiff,
        WinnerID:      dto.WinnerID,
        PlayedAt:      time.Now(),
    }

    if err := database.DB.Create(&match).Error; err != nil {
        return nil, err
    }
    return &match, nil
}