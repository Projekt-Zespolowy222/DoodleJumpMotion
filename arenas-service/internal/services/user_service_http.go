package services

import (
	"encoding/json"
	"fmt"
	"net/http"

	"arenas-service/internal/domain"
)

type UserServiceHTTP struct {
	BaseURL string
}

func NewUserServiceHTTP(baseURL string) *UserServiceHTTP {
	return &UserServiceHTTP{BaseURL: baseURL}
}

// Реализуем интерфейс UserGetter
func (u *UserServiceHTTP) GetUserByID(userID int64) (*domain.User, error) {
	url := fmt.Sprintf("%s/users/%d", u.BaseURL, userID) // предполагаем эндпоинт Auth Service
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch user: status %d", resp.StatusCode)
	}

	var user domain.User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}
