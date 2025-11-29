package domain

import "time"

type User struct {
	ID               int64     `gorm:"primaryKey;autoIncrement"`
	Role string `gorm:"not null;default:'player'"`
	Username         string    `gorm:"unique;not null"`
	Email            string    `gorm:"unique;not null"`
	PasswordHash     string    `gorm:"not null"`
	CupCount         int       `gorm:"default:0"`
	HighestCups      int       `gorm:"default:0"`
	CurrentArenaID   int
	Level            int       `gorm:"default:1"`
	Experience       int       `gorm:"default:0"`
	WorldRecordScore int       `gorm:"default:0"`
	LastLogin        time.Time
	CreatedAt        time.Time
}
