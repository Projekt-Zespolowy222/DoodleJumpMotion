package dto

type CreateSessionDTO struct {
	Player1ID uint `json:"player1_id" binding:"required"`
	Player2ID uint `json:"player2_id" binding:"required"`
}

type JoinSessionDTO struct {
	PlayerID uint `json:"player_id" binding:"required"`
}

type FinishSessionDTO struct {
	Player1Score int `json:"player1_score" binding:"required"`
	Player2Score int `json:"player2_score" binding:"required"`
}

type LeaveSessionDTO struct {
	PlayerID uint `json:"player_id" binding:"required"`
}