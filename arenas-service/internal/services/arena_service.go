package services

import (
	"arenas-service/internal/domain"
	"arenas-service/internal/repository"
)

type UserGetter interface {
    GetUserByID(userID int64) (*domain.User, error)
}

type ArenaService struct {
    repo        *repository.ArenaRepository
    userService UserGetter
}

func NewArenaService(repo *repository.ArenaRepository, userService UserGetter) *ArenaService {
    return &ArenaService{
        repo:        repo,
        userService: userService,
    }
}

func (s *ArenaService) GetArenaByCups(cups int) (*domain.Arena, error) {
	return s.repo.GetArenaByCups(cups)
}

func (s *ArenaService) GetArenaByUserID(userID int64) (*domain.Arena, error) {
	user, err := s.userService.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	arena, err := s.GetArenaByCups(user.CupCount)
	if err != nil {
		return nil, err
	}
	return arena, nil
}

func (s *ArenaService) GetAllArenas() ([]domain.Arena, error) {
	return s.repo.GetAllArenas()
}

func (s *ArenaService) CreateArena(arena *domain.Arena) error {
	return s.repo.CreateArena(arena)
}

func (s *ArenaService) UpdateArena(arena *domain.Arena) error {
	return s.repo.UpdateArena(arena)
}

func (s *ArenaService) DeleteArena(id int) error {
	return s.repo.DeleteArena(id)
}
