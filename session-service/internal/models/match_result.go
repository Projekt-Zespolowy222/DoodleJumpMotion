package models

import "time"

type MatchResult struct {
	ID uint `gorm:"primaryKey"`

	SessionID uint

	Player1ID uint
	Player2ID uint
	WinnerID  *uint

	Player1Score int
	Player2Score int

	Player1CupDiff int
	Player2CupDiff int

	PlayedAt time.Time
}
