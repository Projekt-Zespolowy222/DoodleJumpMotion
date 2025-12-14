package services

import (
	"context"
	"matchmaking-service/internal/models"
	"matchmaking-service/internal/repositories"
)

type QueueService struct {
	repo *repositories.QueueRepo
}

func NewQueueService(repo *repositories.QueueRepo) *QueueService {
	return &QueueService{repo: repo}
}

func (s *QueueService) Enqueue(ctx context.Context, item models.QueueItem) error {
	return s.repo.Add(ctx, item)
}

func (s *QueueService) DequeuePair(ctx context.Context, arena, bucket, delta int) ([]string, error) {
	return s.repo.PopPair(ctx, arena, bucket, delta)
}