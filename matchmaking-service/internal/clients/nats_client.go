package clients

import (
	"log"

	"github.com/nats-io/nats.go"
)

func NewNats(url string) (*nats.Conn, error) {
	nc, err := nats.Connect(url)
	if err != nil {
		log.Fatalf("NATS connect err: %v", err)
	}
	return nc, nil
}