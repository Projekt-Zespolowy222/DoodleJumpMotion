package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type UserClient struct {
	baseURL string
	token   string
}

func NewUserClient(baseURL, token string) *UserClient {
	return &UserClient{
		baseURL: baseURL,
		token:   token,
	}
}

func (c *UserClient) GetUserTrophies(ctx context.Context, userID uint) (int, error) {
	url := fmt.Sprintf("%s/users/%d", c.baseURL, userID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return 0, err
	}

	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, err
	}

	var user struct {
		CupCount int `json:"cup_count"`
		ID       int `json:"id"`
		Role     string `json:"role"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return 0, err
	}

	log.Printf("[DEBUG] User-service response for user %d: %+v", userID, user)
	return user.CupCount, nil
}