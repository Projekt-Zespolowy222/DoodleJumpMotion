package services

import (
	"session-service/internal/dto"
	"session-service/internal/models"
)

type MatchCreator interface {
    CreateMatchDirect(dto dto.CreateMatchDTO) (*models.MatchResult, error)
}