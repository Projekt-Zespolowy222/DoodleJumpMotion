package models

import "time"

type Session struct {
	ID        uint      `gorm:"primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time

	Status   string     // waiting / active / finished
	StartedAt *time.Time
	EndedAt   *time.Time

	Player1ID uint
	Player2ID uint

	Player1Score int
	Player2Score int

	Player1Death string `gorm:"column:player1_death"` 
    Player2Death string `gorm:"column:player2_death"`

	Player1JoinedAt *time.Time
	Player2JoinedAt *time.Time
	Player1LeftAt   *time.Time
	Player2LeftAt   *time.Time

	WinnerID *uint // null = draw

	Seed uint32
}
