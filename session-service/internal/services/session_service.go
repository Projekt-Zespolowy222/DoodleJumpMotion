package services

import (
	"fmt"
	"session-service/internal/database"
	"session-service/internal/models"
	"session-service/internal/repositories"

	"time"

	"gorm.io/gorm/clause"
)

type SessionService struct {
    repo *repositories.SessionRepository
}

func NewSessionService(repo *repositories.SessionRepository) *SessionService {
    return &SessionService{repo: repo}
}

func (s *SessionService) CreateSession(session *models.Session) error {
    // Здесь можно добавить любую логику, например проверку статусов или лимитов
    return s.repo.Create(session)
}

func (s *SessionService) GetSession(id uint) (*models.Session, error) {
    fmt.Printf("[GET] Getting session %d from DB\n", id)
    session, err := s.repo.GetByID(id)
    if err != nil {
        fmt.Printf("[GET] Error getting session: %v\n", err)
        return nil, err
    }
    fmt.Printf("[GET] From DB: Player1Death='%s', Player2Death='%s'\n", session.Player1Death, session.Player2Death)
    return session, nil
}

func (s *SessionService) UpdateSession(session *models.Session) error {
    fmt.Printf("[UPDATE] Updating session %d: Player1Death='%s', Player2Death='%s'\n", session.ID, session.Player1Death, session.Player2Death)
    err := s.repo.Update(session)
    if err != nil {
        fmt.Printf("[UPDATE] Error updating session: %v\n", err)
    }
    return err
}

func СalculateCupDiff(winnerScore, loserScore int) (winnerCups int, loserCups int) {
    baseDiff := 25 

    if loserScore == 0 {
        return baseDiff, -baseDiff
    }

    ratio := float64(winnerScore) / float64(loserScore)

    if ratio >= 2.0 {
        winnerCups = baseDiff + 10
        loserCups = baseDiff + 10
    } else {
        winnerCups = baseDiff + int(float64(baseDiff)*(ratio-1))
        loserCups = baseDiff
    }

    return
} 

func (s *SessionService) LeaveSession(sessionID, playerID uint) error {
    fmt.Printf("[LEAVE] Session %d, Player %d attempting to leave\n", sessionID, playerID)
    
    // Начинаем транзакцию
    tx := database.DB.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    // Загружаем сессию С БЛОКИРОВКОЙ
    var session models.Session
    if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&session, sessionID).Error; err != nil {
        tx.Rollback()
        return fmt.Errorf("session not found")
    }

    fmt.Printf("[LEAVE] Session players: P1=%d, P2=%d\n", session.Player1ID, session.Player2ID)

    now := time.Now()

    if session.Player1ID != playerID && session.Player2ID != playerID {
        tx.Rollback()
        fmt.Printf("[LEAVE] ERROR: Player %d doesn't belong to session\n", playerID)
        return fmt.Errorf("player does not belong to this session")
    }

    if session.Player1ID == playerID {
        if session.Player1LeftAt != nil {
            tx.Rollback()
            return fmt.Errorf("player already left")
        }
        session.Player1LeftAt = &now
        fmt.Printf("[LEAVE] Set Player1LeftAt for player %d\n", playerID)
    }
    
    if session.Player2ID == playerID {
        if session.Player2LeftAt != nil {
            tx.Rollback()
            return fmt.Errorf("player already left")
        }
        session.Player2LeftAt = &now
        fmt.Printf("[LEAVE] Set Player2LeftAt for player %d\n", playerID)
    }

    fmt.Printf("[LEAVE] Updating session with LeftAt timestamps\n")
    
    // Сохраняем в рамках транзакции
    if err := tx.Save(&session).Error; err != nil {
        tx.Rollback()
        return err
    }

    // Коммитим транзакцию
    return tx.Commit().Error
}