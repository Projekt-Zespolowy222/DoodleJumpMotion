package ws

import (
	"fmt"
	"sync"
)

// Hub хранит все комнаты и клиентов
type Hub struct {
	rooms map[uint]map[uint]*Client // sessionID -> userID -> Client
	mu    sync.RWMutex
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
	if h.rooms[sessionID] != nil {
		delete(h.rooms[sessionID], userID)
		if len(h.rooms[sessionID]) == 0 {
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
            default:
            }
        }
    }
}