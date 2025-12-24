package clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"matchmaking-service/config"
	"matchmaking-service/internal/dto"
	"net/http"
)

type SessionClient struct {
	url string
	token string
}

func NewSessionClient (cfg *config.Config) *SessionClient {
	return &SessionClient{
		url:cfg.SessionURL,
		token: cfg.JWTAdmin,
	}
}

func (sc *SessionClient) CreateSession(ctx context.Context, p1, p2 uint, ) (uint, int64, error) {
	body, _ := json.Marshal(dto.CreateSessionDTO{
		Player1ID: p1,
		Player2ID: p2,
	})
	
	req, _ := http.NewRequestWithContext(ctx, "POST", sc.url, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer " + sc.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return 0,0,fmt.Errorf("failed to create session, status code: %d", resp.StatusCode)
	}

	var out struct {
		SessionID uint  `json:"ID"`
		Seed      int64 `json:"seed"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return 0, 0, err
	}

	return out.SessionID, out.Seed, nil
}