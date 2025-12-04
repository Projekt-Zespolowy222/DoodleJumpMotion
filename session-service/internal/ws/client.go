package ws

import (
	"github.com/gorilla/websocket"
)

type Client struct {
	UserID uint
	Conn   *websocket.Conn
	Send   chan []byte
	SessionID uint
}
