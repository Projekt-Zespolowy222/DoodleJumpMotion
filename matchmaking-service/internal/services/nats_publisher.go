package services

import (
	"encoding/json"
	"matchmaking-service/internal/dto"

	"github.com/nats-io/nats.go"
)

type NatsPublisher struct {
	nc *nats.Conn
}

func NewNatsPublisher(nc *nats.Conn) *NatsPublisher { return &NatsPublisher{nc: nc} }

func (p *NatsPublisher) PublishMatchFound(ev dto.MatchFoundEvent) error {
	b, _ := json.Marshal(ev)
	return p.nc.Publish("match.found", b)
}

func (p *NatsPublisher) PublishSessionCreated(ev dto.SessionCreatedEvent) error {
	b, _ := json.Marshal(ev)
	return p.nc.Publish("session.created", b)
}