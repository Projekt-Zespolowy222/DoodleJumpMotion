package handlers

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"net/http"
	"session-service/internal/clients"
	"session-service/internal/database"
	"session-service/internal/dto"
	"session-service/internal/models"
	"session-service/internal/repositories"
	"session-service/internal/services"
	"session-service/internal/ws"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
    Service *services.SessionService
	userClient *clients.UserClient
	hub     *ws.Hub
}

func NewSessionHandler() *SessionHandler {
	repo := repositories.NewSessionRepository()
	service := services.NewSessionService(repo)
	userClient := clients.NewUserClient()
	return &SessionHandler{Service: service, userClient: userClient}
}

func (h *SessionHandler) CreateSession(c *gin.Context) {
    var input dto.CreateSessionDTO
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    seed, err := GenerateSeed()

    session := models.Session{
        Status:       "waiting",
        Player1ID:    input.Player1ID,
		Player2ID:    input.Player2ID,
        Seed :         seed,
    }
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate seed"})
        return
    }

    if err := h.Service.CreateSession(&session); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, session)
}

func (h *SessionHandler) GetSession(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    session, err := h.Service.GetSession(uint(id))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
        return
    }

    resp := dto.SessionResponse{
        ID:      session.ID,
        Seed:    session.Seed,
        Status:  session.Status,
    }

    c.JSON(http.StatusOK, resp)
}

func (h *SessionHandler) JoinSession(c *gin.Context) {
	var body dto.JoinSessionDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	sessionID := c.Param("id")

	var session models.Session
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Session not found"})
		return
	}

	playerID := body.PlayerID
	now := time.Now()

	if session.Player1ID != playerID && session.Player2ID != playerID {
		c.JSON(400, gin.H{"error": "Player does not belong to this session"})
		return
	}

	if session.Player1ID == playerID {
		if session.Player1JoinedAt != nil {
			c.JSON(400, gin.H{"error": "Player already joined"})
			return
		}

		session.Player1JoinedAt = &now
	}

	if session.Player2ID == playerID {
		if session.Player2JoinedAt != nil {
			c.JSON(400, gin.H{"error": "Player already joined"})
			return
		}

		session.Player2JoinedAt = &now
	}

	if session.Player1JoinedAt != nil && session.Player2JoinedAt != nil {
		session.Status = "active"
		session.StartedAt = &now
	}

	if err := database.DB.Save(&session).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, session)
}

func (h *SessionHandler) LeaveSession(c *gin.Context) {
    var body dto.LeaveSessionDTO
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    sessionIDStr := c.Param("id")
    sessionID, _ := strconv.ParseUint(sessionIDStr, 10, 64)

    if err := h.Service.LeaveSession(uint(sessionID), body.PlayerID); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    if h.hub != nil {
        msg := fmt.Sprintf("Player %d has left the session", body.PlayerID)
        h.hub.Broadcast(uint(sessionID), msg)
        h.hub.Unregister(uint(sessionID), body.PlayerID)
    }

    c.JSON(200, gin.H{"message": "Player left the session successfully"})
}



func (h *SessionHandler) FinishSession(c *gin.Context) {
    var body dto.FinishSessionDTO
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    sessionIDStr := c.Param("id")
    sessionID, err := strconv.Atoi(sessionIDStr)
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid session id"})
        return
    }

    session, err := h.Service.GetSession(uint(sessionID))
    if err != nil {
        c.JSON(404, gin.H{"error": "session not found"})
        return
    }

    if session.Status != "active" {
        c.JSON(400, gin.H{"error": "session is not active"})
        return
    }

    // Определяем победителя
    var winnerID, loserID uint
    var winnerScore, loserScore int

    if body.Player1Score >= body.Player2Score {
        winnerID = session.Player1ID
        loserID = session.Player2ID
        winnerScore = body.Player1Score
        loserScore = body.Player2Score
    } else {
        winnerID = session.Player2ID
        loserID = session.Player1ID
        winnerScore = body.Player2Score
        loserScore = body.Player1Score
    }

    // Рассчёт кубков
    winnerCups, loserCups := services.СalculateCupDiff(winnerScore, loserScore)

    // Обновляем кубки через User Service
    if err := h.userClient.ChangeCups(winnerID, winnerCups); err != nil {
        c.JSON(500, gin.H{"error": "failed to update winner cups"})
        return
    }
    if err := h.userClient.ChangeCups(loserID, -loserCups); err != nil {
        c.JSON(500, gin.H{"error": "failed to update loser cups"})
        return
    }

    // Создаём Match запись
    match := models.MatchResult{
        SessionID:     session.ID,
        Player1ID:     session.Player1ID,
        Player2ID:     session.Player2ID,
        WinnerID:      &winnerID,
        Player1Score:  body.Player1Score,
        Player2Score:  body.Player2Score,
        Player1CupDiff: 0, // потом можно заполнить отдельно
        Player2CupDiff: 0,
        PlayedAt:      time.Now(),
    }

    if winnerID == session.Player1ID {
        match.Player1CupDiff = winnerCups
        match.Player2CupDiff = -loserCups
    } else {
        match.Player2CupDiff = winnerCups
        match.Player1CupDiff = -loserCups
    }

    if err := database.DB.Create(&match).Error; err != nil {
        c.JSON(500, gin.H{"error": "failed to create match"})
        return
    }

    // Меняем статус сессии
    session.Status = "finished"
    session.StartedAt = nil
    session.EndedAt = ptrTime(time.Now()) // helper функция ptrTime(t time.Time) *time.Time
    if err := h.Service.UpdateSession(session); err != nil {
        c.JSON(500, gin.H{"error": "failed to update session"})
        return
    }

    c.JSON(200, gin.H{
        "match": match,
        "winner_cups": winnerCups,
        "loser_cups": loserCups,
    })
}

func ptrTime(t time.Time) *time.Time {
    return &t
}

func GenerateSeed() (uint32, error)  {
    var b [4]byte
    
    if _, err := rand.Read(b[:]); err != nil {
        return 0, err
    }

    return binary.LittleEndian.Uint32(b[:]), nil
}
