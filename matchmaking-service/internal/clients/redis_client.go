package clients

import (
	"context"
	"matchmaking-service/config"

	"github.com/redis/go-redis/v9"
	redjs "github.com/redis/go-redis/v9"
)

var Ctx = context.Background()

func NewRedis (cfg *config.Config) *redjs.Client {
	return redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
}