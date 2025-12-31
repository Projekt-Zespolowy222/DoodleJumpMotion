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

// Upgrader для WebSocket
var Upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    Subprotocols:    []string{},
}

type SessionWrapper struct {
    Session *models.Session
    Lock    sync.Mutex
}

// WSHandler обрабатывает WS соединения
func WSHandler(hub *Hub, sessionService *services.SessionService, matchCreator services.MatchCreator) gin.HandlerFunc {
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

        // 🔥 Upgrade — ТОЛЬКО ЗДЕСЬ
        conn, err := Upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            return
        }

		fmt.Printf("[WS] User %d connected\n", userID)

        client := &Client{
            UserID: userID,
            Conn:   conn,
            Send:   make(chan []byte),
        }

        hub.Register(sessionID, client)
        defer hub.Unregister(sessionID, client.UserID)


		seedMsg := fmt.Sprintf(`{"type":"seed","value":%d}`, session.Seed)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(seedMsg)); err != nil {
			fmt.Printf("[WS] Error sending seed to user %d: %v\n", userID, err)
			return
		}
		fmt.Printf("[WS] Sent seed %d to user %d\n", session.Seed, userID)
        

        // Отправка
        go func() {
			for msg := range client.Send {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					fmt.Printf("[WS] Error sending message to user %d: %v\n", userID, err)
					break
				}
			}
		}()

		// ===== Чтение сообщений от клиента =====
	go func() {
    for {
        fmt.Printf("[WS] Waiting for message from user %d...\n", userID)
        _, msg, err := conn.ReadMessage()
       if err != nil {
			fmt.Printf("[WS] User %d ReadMessage error: %v\n", userID, err)
			if err.Error() == "websocket: close 1005 (no status)" {
				fmt.Printf("[WS] User %d left the session\n", userID)
				
				if err := sessionService.LeaveSession(session.ID, userID); err != nil {
					fmt.Printf("[WS] ERROR leaving session: %v\n", err)  // ← Обязательно логируйте ошибку
				}
				
				leaveMsg := fmt.Sprintf(`{"type":"player_left","user_id":%d}`, userID)
				hub.Broadcast(session.ID, leaveMsg)
			}
			break
		}
        fmt.Printf("[WS] Received from user %d: %s\n", userID, string(msg))

        var payload map[string]interface{}
        if err := json.Unmarshal(msg, &payload); err != nil {
            continue
        }

        switch payload["type"] {
        case "score":
			currentSession, err := sessionService.GetSession(session.ID)
			if err == nil {
				session = currentSession
			}
            fmt.Printf("[WS] Handling type='score' from user %d\n", userID)
            score := int(payload["value"].(float64))
            if userID == session.Player1ID {
                session.Player1Score = score
            } else {
                session.Player2Score = score
            }
            sessionService.UpdateSession(session)
            scoreMsg := fmt.Sprintf(`{"type":"opponent_score","value":{"user_id":%d,"score":%d}}`, userID, score)
            hub.Broadcast(session.ID, scoreMsg)

            finished, winnerID := checkEndConditions(session)
            if finished {
                finalizeSession(session, winnerID, hub, sessionService, matchCreator, userClient)
            }

        case "join":
			currentSession, err := sessionService.GetSession(session.ID)
			if err == nil {
				session = currentSession
			}
            fmt.Printf("[WS] Handling type='join' from user %d\n", userID)
            now := time.Now()
            if userID == session.Player1ID && session.Player1JoinedAt == nil {
                session.Player1JoinedAt = &now
            }
            if userID == session.Player2ID && session.Player2JoinedAt == nil {
                session.Player2JoinedAt = &now
            }
            if session.Player1JoinedAt != nil && session.Player2JoinedAt != nil {
                session.Status = "active"
                session.StartedAt = &now
            }
            sessionService.UpdateSession(session)
            hub.Broadcast(session.ID, `{"type":"player_joined","user_id":`+strconv.Itoa(int(userID))+`}`)

        case "player_death":
			currentSession, err := sessionService.GetSession(session.ID)
			if err == nil {
				session = currentSession
			}
			fmt.Printf("[WS] Handling type='player_death' from user %d\n", userID)
			if userID == session.Player1ID {
				session.Player1Death = "dead"
				fmt.Printf("[WS] Set Player1Death = 'dead'\n")
			} else {
				session.Player2Death = "dead"
				fmt.Printf("[WS] Set Player2Death = 'dead'\n")
			}
			sessionService.UpdateSession(session)
			deathMsg := fmt.Sprintf(`{"type":"opponent_death","value":%d}`, userID)
			hub.Broadcast(session.ID, deathMsg)

			finished, winnerID := checkEndConditions(session)
			if finished {
				finalizeSession(session, winnerID, hub, sessionService, matchCreator, userClient)
			}
        }
    }
}()
    }
}

func ptrTime(t time.Time) *time.Time {
    return &t
}

func checkEndConditions(s *models.Session) (finished bool, winnerID *uint) {

    p1Dead := s.Player1Death != ""
    p2Dead := s.Player2Death != ""

    // -------------------------------------------------
    // 1. Оба умерли — победитель по количеству очков
    // -------------------------------------------------
    if p1Dead && p2Dead {
        if s.Player1Score > s.Player2Score {
            return true, &s.Player1ID
        }
        if s.Player2Score > s.Player1Score {
            return true, &s.Player2ID
        }
        return true, nil // ничья
    }

    // -------------------------------------------------
    // 2. Умер Player1 → победа Player2 если 2x score
    // -------------------------------------------------
    if p1Dead && !p2Dead {
        if s.Player2Score > 2 * s.Player1Score {
            return true, &s.Player2ID
        }
        return false, nil
    }
    
    // -------------------------------------------------
    // 3. Умер Player2 → победа Player1 если 2x score
    // -------------------------------------------------
    if p2Dead && !p1Dead {
        if s.Player1Score > 2 * s.Player2Score {
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
) {
    if session.Status == "finished" {
        fmt.Printf("[FINALIZE] Session %d already finished, skipping\n", session.ID)
        return
    }
    fmt.Printf("[FINALIZE] Finalizing session %d, winner %v\n", session.ID, winnerID)

    session.WinnerID = winnerID
    session.Status = "finished"
    session.EndedAt = ptrTime(time.Now())

    fmt.Printf("[FINALIZE] Final state: Player1Death='%s', Player2Death='%s', Player1Score=%d, Player2Score=%d\n",
        session.Player1Death, session.Player2Death, session.Player1Score, session.Player2Score)

    sessionService.UpdateSession(session)

    // 🔥 Начисляем кубки
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

        // Рассчитываем изменение кубков
        winnerCups, loserCups := services.СalculateCupDiff(winnerScore, loserScore)

        fmt.Printf("[FINALIZE] Cup changes: Winner(ID=%d) +%d, Loser(ID=%d) -%d\n", 
            *winnerID, winnerCups, loserID, loserCups)

        // Обновляем кубки через UserClient
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

    // Отправляем сообщение о завершении
    msg := fmt.Sprintf(`{"type":"session_finished","winner_id":%d}`,
        func() uint { if winnerID == nil { return 0 }; return *winnerID }(),
    )
    hub.Broadcast(session.ID, msg)

    // Создаём запись матча
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


// func (h *SessionHandler) LeaveSession(c *gin.Context) {
//     var body dto.LeaveSessionDTO

//     if err:= c.ShouldBindJSON(&body); err != nil {
//         c.JSON(400, gin.H{"error": err.Error()})
//         return
//     }

//     sessionID := c.Param("id")
//     var session models.Session

//     if err:= database.DB.First(&session, sessionID).Error; err != nil {
//         c.JSON(404, gin.H{"error": "Session not found"})
//     }

//     playerID := body.PlayerID
//     now := time.Now()

//     if session.Player1ID != playerID && session.Player2ID != playerID {
//         c.JSON(400, gin.H{"error": "Player does not belong to this session"})
//         return
//     }

//     if session.Player1ID == playerID {
//         if session.Player1LeftAt != nil {
//             c.JSON(400, gin.H{"error": "Player already left"})
//             return
//         }
//         session.Player1LeftAt = &now
//     }
//     if session.Player2ID == playerID {
//         if session.Player2LeftAt != nil {
//             c.JSON(400, gin.H{"error": "Player already left"})
//             return
//         }
//         session.Player2LeftAt = &now
//     }

//     if err := h.service.UpdateSession(&session); err != nil {
//         c.JSON(500, gin.H{"error": err.Error()})
//         return
//     }

//     if h.hub != nil {
//         msg := fmt.Sprintf("Player %d has left the session", playerID)
//         h.hub. Broadcast(uint(session.ID), msg)

//         h.hub.Unregister(session.ID, playerID)
//     }
//     c.JSON(200, gin.H{"message": "Player left the session successfully"})
// }