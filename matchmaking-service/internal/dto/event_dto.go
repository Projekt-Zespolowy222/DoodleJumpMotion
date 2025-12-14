package dto

type MatchFoundEvent struct {
	Player1ID string `json:"player1_id"`
	Player2ID string `json:"player2_id"`
	Arena     int    `json:"arena"`
}

type SessionCreatedEvent struct {
	SessionID uint   `json:"session_id"`
	SEED      int64  `json:"seed"`
	Player1ID string `json:"player1_id"`
	Player2ID string `json:"player2_id"`
}
