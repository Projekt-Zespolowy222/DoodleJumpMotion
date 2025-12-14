package dto

type EnqueueRequest struct {
	Trophies int `json:"trophies"`
	Arena    int `json:"arena"`
}

type EnqueueResponse struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"` // waiting | found
	SessionID uint   `json:"session_id,omitempty"`
	WSURL     string `json:"ws_url,omitempty"`
}
