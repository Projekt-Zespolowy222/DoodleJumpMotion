package repository

import (
	"arenas-service/internal/domain"

	"gorm.io/gorm"
)

type ArenaRepository struct {
	db *gorm.DB
}

func NewArenaRepository(db *gorm.DB) *ArenaRepository {
	return &ArenaRepository{db: db}
}

func (r *ArenaRepository) CreateArena(arena *domain.Arena) error {
	return r.db.Create(arena).Error
}

func (r *ArenaRepository) GetArenaByID(id int) (*domain.Arena, error) {
	var arena domain.Arena
	if err := r.db.First(&arena, id).Error; err != nil {
		return nil, err
	}
	return &arena, nil
}

func (r *ArenaRepository) GetAllArenas() ([]domain.Arena, error) {
	var arenas []domain.Arena
	if err := r.db.Find(&arenas).Error; err != nil {
		return nil, err
	}
	return arenas, nil
}

func (r *ArenaRepository) UpdateArena(arena *domain.Arena) error {
	return r.db.Save(arena).Error
}

func (r *ArenaRepository) DeleteArena(id int) error {
	return r.db.Delete(&domain.Arena{}, id).Error
}

func (r *ArenaRepository) GetArenaByCups(cups int) (*domain.Arena, error) {
	var arena domain.Arena
	if err := r.db.Where("? BETWEEN min_cups AND max_cups", cups).First(&arena).Error; err != nil {
		return nil, err
	}
	return &arena, nil
}
