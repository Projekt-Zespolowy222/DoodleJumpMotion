package models

type QueueItem struct {
	RequestID string `redis:"request_id"`
	PlayerID  uint   `redis:"player_id"`
	Trophies  int    `redis:"trophies"`
	Arena     int    `redis:"arena"`
	CreatedAt int64  `redis:"created_at"`
}
