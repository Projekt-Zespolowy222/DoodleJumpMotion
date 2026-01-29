package ws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"session-service/internal/clients"
	"session-service/internal/dto"
	"session-service/internal/models"
	"session-service/internal/services"

	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var Upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	Subprotocols:    []string{},
}

type SessionWrapper struct {
	Session *models.Session
	Lock    sync.Mutex
}

func WSHandler(hub *Hub, sessionService *services.SessionService, matchCreator services.MatchCreator, sessionScores *SessionScores) gin.HandlerFunc {
	userClient := clients.NewUserClient()

	return func(c *gin.Context) {
		userID := c.GetUint("user_id")

		sessionIDStr := c.Query("session_id")
		sessionID64, _ := strconv.ParseUint(sessionIDStr, 10, 64)
		sessionID := uint(sessionID64)

		session, err := sessionService.GetSession(sessionID)
		if err != nil {
			c.JSON(404, gin.H{"error": "session not found"})
			return
		}

		conn, err := Upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		fmt.Printf("[WS] User %d connected\n", userID)

		client := &Client{
			UserID: userID,
			Conn:   conn,
			Send:   make(chan []byte, 1024),
		}

		currentSession, err := sessionService.GetSession(sessionID)
		if err != nil {
			_ = conn.Close()
			fmt.Printf("[WS] Error: didnt find currentSession in db")
			return
		}

		// 🔥 Если сессия finished — закрываем и выходим ДО регистрации в hub
		if currentSession.Status == "finished" {
			_ = conn.Close()
			return
		}

		hub.Register(sessionID, client)
		fmt.Printf("[HUB] Registered user %d in session %d\n", userID, sessionID)

		// 🔥 defer cleanup — гарантирует очистку при любом выходе из функции
		defer func() {
			hub.Unregister(sessionID, userID)
			_ = conn.Close()
			fmt.Printf("[WS] Cleanup completed for user %d\n", userID)
		}()

		seedMsg := fmt.Sprintf(`{"type":"seed","value":%d}`, session.Seed)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(seedMsg)); err != nil {
			fmt.Printf("[WS] Error sending seed to user %d: %v\n", userID, err)
			return // defer cleanup сработает здесь
		}
		fmt.Printf("[WS] Sent seed %d to user %d\n", session.Seed, userID)

		// Отправка — исправленная горутина с graceful shutdown
		go func() {
			// Если канал закрыт или произошла ошибка записи — закрываем соединение
			// Это приведет к выходу из основного цикла чтения (ReadMessage вернет ошибку)
			defer func() {
				// Прерываем ReadMessage в основной горутине, закрывая соединение
				_ = conn.Close()
			}()

			for msg := range client.Send {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					fmt.Printf("[WS] Error sending message to user %d: %v\n", userID, err)
					return
				}
				fmt.Printf("[WS WRITE] Sent to user %d: %s\n", userID, string(msg))
			}
			// Канал закрыт (Unregister), завершаем горутину
			fmt.Printf("[WS] Writer goroutine stopped for user %d\n", userID)
		}()

		// ===== Чтение сообщений =====
		for {
			fmt.Printf("[WS] Waiting for message from user %d...\n", userID)

			_, msg, err := conn.ReadMessage()
			if err != nil {
				fmt.Printf("[WS] User %d disconnected: %v\n", userID, err)

				// Уведомляем других об уходе
				_ = sessionService.LeaveSession(sessionID, userID)
				leaveMsg := fmt.Sprintf(`{"type":"player_left","user_id":%d}`, userID)
				hub.Broadcast(sessionID, leaveMsg)

				// 🔥 Просто выходим из цикла — defer cleanup сделает Unregister и Close
				break
			}

			fmt.Printf("[WS] Received from user %d: %s\n", userID, string(msg))

			var payload map[string]interface{}
			if err := json.Unmarshal(msg, &payload); err != nil {
				continue
			}

			switch payload["type"] {
			case "score":
				if currentSession.Status == "finished" {
					return // defer cleanup сработает
				}
				if currentSession.Status != "active" {
					continue
				}
				if !isPlayerInSession(currentSession, int64(userID)) {
					continue
				}
				if isPlayerDead(currentSession, int64(userID)) {
					continue
				}

				scoreVal, ok := payload["value"].(float64)
				if !ok {
					continue
				}
				score := int(scoreVal)

				updated := sessionScores.UpdateScore(sessionID, userID, score)
				fmt.Printf("[WS] Score from user %d: %d (willUpdate=%v)\n", userID, score, updated)

				scoreMsg := map[string]interface{}{
					"type":   "score",
					"value":  score,
					"userId": userID,
				}
				scoreMsgBytes, _ := json.Marshal(scoreMsg)
				hub.BroadcastToOthers(sessionID, userID, scoreMsgBytes)

			case "player_death":
				currentSession, err = sessionService.GetSession(sessionID)
				if err != nil {
					continue
				}
				if currentSession.Status != "active" {
					continue
				}

				if !isPlayerInSession(currentSession, int64(userID)) {
					continue
				}
				if isPlayerDead(currentSession, int64(userID)) {
					continue
				}

				if userID == currentSession.Player1ID {
					currentSession.Player1Death = "dead"
				} else {
					currentSession.Player2Death = "dead"
				}
				if sessionScores != nil {
					currentSession.Player1Score = sessionScores.GetScore(sessionID, currentSession.Player1ID)
					currentSession.Player2Score = sessionScores.GetScore(sessionID, currentSession.Player2ID)
				}
				sessionService.UpdateSession(currentSession)

				deathMsg := map[string]interface{}{
					"type":   "opponent_death",
					"userId": userID,
				}
				deathMsgBytes, _ := json.Marshal(deathMsg)
				hub.Broadcast(sessionID, string(deathMsgBytes))

				finished, winnerID := checkEndConditions(currentSession)
				if finished {
					finalizeSession(currentSession, winnerID, hub, sessionService, matchCreator, userClient, sessionScores)
					return // defer cleanup сработает
				}

			case "join":
				currentSession, err = sessionService.GetSession(sessionID)
				if err != nil {
					continue
				}
				if currentSession.Status != "waiting" {
					fmt.Printf("[JOIN] Ignored join: session %d status=%s", session.ID, currentSession.Status)
					continue
				}

				now := time.Now()
				updated := false
				if userID == currentSession.Player1ID && currentSession.Player1JoinedAt == nil {
					if isPlayerDead(currentSession, int64(userID)) {
						continue
					}
					currentSession.Player1JoinedAt = &now
					updated = true
				} else if userID == currentSession.Player2ID && currentSession.Player2JoinedAt == nil {
					if currentSession.Player2Death == "dead" {
						continue
					}
					currentSession.Player2JoinedAt = &now
					updated = true
				}

				if currentSession.Player1JoinedAt != nil && currentSession.Player2JoinedAt != nil && currentSession.Status == "waiting" {
					currentSession.Status = "active"
					currentSession.StartedAt = &now
					updated = true
				}

				if updated {
					sessionService.UpdateSession(currentSession)

					hub.BroadcastToOthers(
						sessionID,
						userID,
						[]byte(fmt.Sprintf(
							`{"type":"player_joined","user_id":%d}`,
							userID,
						)),
					)
				}

				p1 := sessionScores.GetScore(sessionID, currentSession.Player1ID)
				p2 := sessionScores.GetScore(sessionID, currentSession.Player2ID)

				stateMsg := map[string]interface{}{
					"type": "state",
					"scores": map[string]int{
						strconv.Itoa(int(currentSession.Player1ID)): p1,
						strconv.Itoa(int(currentSession.Player2ID)): p2,
					},
					"player1Death": currentSession.Player1Death,
					"player2Death": currentSession.Player2Death,
					"status":       currentSession.Status,
				}

				bytes, _ := json.Marshal(stateMsg)
				hub.SendTo(sessionID, userID, bytes)
			}
		}
		// defer cleanup выполнится здесь автоматически
	}
}

func ptrTime(t time.Time) *time.Time {
	return &t
}

func checkEndConditions(s *models.Session) (finished bool, winnerID *uint) {
	p1Dead := s.Player1Death != ""
	p2Dead := s.Player2Death != ""

	if p1Dead && p2Dead {
		if s.Player1Score > s.Player2Score {
			return true, &s.Player1ID
		}
		if s.Player2Score > s.Player1Score {
			return true, &s.Player2ID
		}
		return true, nil
	}

	if p1Dead && !p2Dead {
		if s.Player2Score > 2*s.Player1Score {
			return true, &s.Player2ID
		}
		return false, nil
	}

	if p2Dead && !p1Dead {
		if s.Player1Score > 2*s.Player2Score {
			return true, &s.Player1ID
		}
		return false, nil
	}

	return false, nil
}

func finalizeSession(
	session *models.Session,
	winnerID *uint,
	hub *Hub,
	sessionService *services.SessionService,
	matchCreator services.MatchCreator,
	userClient *clients.UserClient,
	sessionScores *SessionScores,
) {
	if session.Status == "finished" {
		fmt.Printf("[FINALIZE] Session %d already finished, skipping\n", session.ID)
		return
	}

	if sessionScores != nil {
		session.Player1Score = sessionScores.GetScore(session.ID, session.Player1ID)
		session.Player2Score = sessionScores.GetScore(session.ID, session.Player2ID)
		sessionScores.CleanupSession(session.ID)
	}

	fmt.Printf("[FINALIZE] Finalizing session %d, winner %v\n", session.ID, winnerID)
	fmt.Printf("[FINALIZE] Scores from memory: P1=%d, P2=%d\n", session.Player1Score, session.Player2Score)

	session.WinnerID = winnerID
	session.Status = "finished"
	session.EndedAt = ptrTime(time.Now())

	fmt.Printf("[FINALIZE] Final state: Player1Death='%s', Player2Death='%s', Player1Score=%d, Player2Score=%d\n",
		session.Player1Death, session.Player2Death, session.Player1Score, session.Player2Score)

	sessionService.UpdateSession(session)

	if winnerID != nil {
		var winnerScore, loserScore int
		var loserID uint

		if *winnerID == session.Player1ID {
			winnerScore = session.Player1Score
			loserScore = session.Player2Score
			loserID = session.Player2ID
		} else {
			winnerScore = session.Player2Score
			loserScore = session.Player1Score
			loserID = session.Player1ID
		}

		winnerCups, loserCups := services.СalculateCupDiff(winnerScore, loserScore)

		fmt.Printf("[FINALIZE] Cup changes: Winner(ID=%d) +%d, Loser(ID=%d) -%d\n",
			*winnerID, winnerCups, loserID, loserCups)

		if err := userClient.ChangeCups(*winnerID, winnerCups); err != nil {
			fmt.Printf("[FINALIZE] ❌ Error updating winner cups: %v\n", err)
		} else {
			fmt.Printf("[FINALIZE] ✅ Winner cups updated successfully\n")
		}

		if err := userClient.ChangeCups(loserID, loserCups); err != nil {
			fmt.Printf("[FINALIZE] ❌ Error updating loser cups: %v\n", err)
		} else {
			fmt.Printf("[FINALIZE] ✅ Loser cups updated successfully\n")
		}
	}

	msg := fmt.Sprintf(`{"type":"session_finished","winner_id":%d}`,
		func() uint {
			if winnerID == nil {
				return 0
			}
			return *winnerID
		}(),
	)
	hub.Broadcast(session.ID, msg)

	matchDTO := dto.CreateMatchDTO{
		SessionID:    session.ID,
		Player1ID:    session.Player1ID,
		Player2ID:    session.Player2ID,
		Player1Score: session.Player1Score,
		Player2Score: session.Player2Score,
		WinnerID:     session.WinnerID,
	}
	matchCreator.CreateMatchDirect(matchDTO)
}

func isPlayerDead(s *models.Session, userID int64) bool {
	return (userID == int64(s.Player1ID) && s.Player1Death == "dead") ||
		(userID == int64(s.Player2ID) && s.Player2Death == "dead")
}

func isPlayerInSession(s *models.Session, userID int64) bool {
	return userID == int64(s.Player1ID) || userID == int64(s.Player2ID)
}