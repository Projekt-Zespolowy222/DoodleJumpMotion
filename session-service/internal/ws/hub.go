package ws

import (
	"fmt"
	"sync"
	"time"
)

// Hub хранит все комнаты и клиентов
type Hub struct {
	rooms map[uint]map[uint]*Client // sessionID -> userID -> Client
	mu    sync.RWMutex
}
type SessionScores struct {
	mu sync.RWMutex
	scores map[uint]map[uint]int
}

func NewSessionScores() *SessionScores {
	return &SessionScores{
		scores: make(map[uint]map[uint]int),
	}
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[uint]map[uint]*Client),
	}
}

// Регистрирует клиента в комнате
func (h *Hub) Register(sessionID uint, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[sessionID] == nil {
		h.rooms[sessionID] = make(map[uint]*Client)
	}
	if h.rooms[sessionID] == nil {
        h.rooms[sessionID] = make(map[uint]*Client)
    }
	h.rooms[sessionID][client.UserID] = client
}

// Убирает клиента из комнаты
func (h *Hub) Unregister(sessionID uint, userID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[sessionID]; ok {
        if client, exists := room[userID]; exists {
            close(client.Send)
            delete(room, userID)
        }
        if len(room) == 0 {
            delete(h.rooms, sessionID)
        }
    }
}


// Отправляет сообщение всем пользователям комнаты
func (h *Hub) Broadcast(sessionID uint, msg string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if room, ok := h.rooms[sessionID]; ok {
		fmt.Printf("[HUB] Broadcasting to session %d: %s\n", sessionID, msg)
		for _, client := range room {
			fmt.Printf("[WS WRITE] Send message to everyone who is inside of the room")
			client.Send <- []byte(msg)
		}
	}
}

func (h *Hub) SendMessageToUser(sessionID uint, userID uint, msg string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if client, ok := h.rooms[sessionID][userID]; ok {
        client.Send <- []byte(msg)
    }
}

func (h *Hub) SendTo(sessionID, userID uint, msg []byte) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    if clients, ok := h.rooms[sessionID]; ok {
        if client, exists := clients[userID]; exists {
            select {
            case client.Send <- msg:
				fmt.Printf("[HUB] Sent message to user %d\n", client.UserID)
            case <-time.After(100 * time.Millisecond):
    			fmt.Printf("[WARN SendTo()] client.Send full for user %d, message dropped\n", userID)
            }
        }
    }
}

// BroadcastToOthers отправляет сообщение всем в комнате, кроме указанного userID
func (h *Hub) BroadcastToOthers(sessionID uint, excludeUserID uint, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	if room, ok := h.rooms[sessionID]; ok {
		fmt.Printf("[HUB] Broadcasting to session %d (excluding user %d): %s\n", 
			sessionID, excludeUserID, string(msg))
		for userID, client := range room {
			if userID != excludeUserID {
				fmt.Printf("HUB] send score %s from %d to %d\n",string(msg), excludeUserID, userID,)
				select {
				case client.Send <- msg:
					fmt.Printf("[HUB] Sent message from BroadcastToOthers")
				case <-time.After(100 * time.Millisecond):
					fmt.Printf("[WARN BroadcastToOthers()] client.Send full for user %d, message dropped\n", userID)
				}
			}
		}
	}
}

// UpdateScore обновляет счет только если он больше текущего
func (ss *SessionScores) UpdateScore(sessionID, userID uint, score int) bool {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	
	if ss.scores[sessionID] == nil {
		ss.scores[sessionID] = make(map[uint]int)
	}
	
	// Обновляем только если новый счет больше
	if score > ss.scores[sessionID][userID] {
		ss.scores[sessionID][userID] = score
		return true // Счет обновлен
	}
	return false // Счет не изменился
}

// GetScore получает текущий максимальный счет
func (ss *SessionScores) GetScore(sessionID, userID uint) int {
	ss.mu.RLock()
	defer ss.mu.RUnlock()
	
	if session, ok := ss.scores[sessionID]; ok {
		return session[userID]
	}
	return 0
}

// GetSessionScores получает все счета сессии
func (ss *SessionScores) GetSessionScores(sessionID uint) (p1Score, p2Score int) {
	ss.mu.RLock()
	defer ss.mu.RUnlock()
	
	if session, ok := ss.scores[sessionID]; ok {
		return session[0], session[1] // Или используй реальные userID
	}
	return 0, 0
}

// CleanupSession удаляет сессию из памяти
func (ss *SessionScores) CleanupSession(sessionID uint) {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	delete(ss.scores, sessionID)
}