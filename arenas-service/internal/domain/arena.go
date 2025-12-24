package domain

import "time"

type Arena struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	Name      string    `gorm:"not null"`
	MinCups   int       `gorm:"not null"`
	MaxCups   int       `gorm:"not null"`
	Theme     string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

//onlu for user-service without migration
type User struct {
    ID       int64
    CupCount int
    Role     string
}