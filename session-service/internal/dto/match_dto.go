package dto

type CreateMatchDTO struct {
	SessionID      uint  `json:"session_id" binding:"required"`
	Player1ID      uint  `json:"player1_id" binding:"required"`
	Player2ID      uint  `json:"player2_id" binding:"required"`
	Player1Score   int   `json:"player1_score"`
	Player2Score   int   `json:"player2_score"`
	Player1CupDiff int   `json:"player1_cup_diff"`
	Player2CupDiff int   `json:"player2_cup_diff"`
	WinnerID       *uint `json:"winner_id"`
}