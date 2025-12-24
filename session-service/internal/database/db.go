package database

import (
	"fmt"
	"log"
	"session-service/config"
	"session-service/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	DB = db
	log.Println("✅ Connected to PostgreSQL")

	autoMigrate()
}

func autoMigrate() {
	err := DB.AutoMigrate(
		&models.Session{},
		&models.MatchResult{},
	)

	if err != nil {
		log.Fatalf("❌ AutoMigrate error: %v", err)
	}

	log.Println("✅ AutoMigrate complete")
}
