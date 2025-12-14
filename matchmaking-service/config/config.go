package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort       string
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	NatsURL      string
	JWTSecret     string
}

func Load() *Config { 
	godotenv.Load()

	return &Config{
		AppPort: getEnv("APP_PORT", "8081"),
		RedisAddr: getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB: 0,
		NatsURL:   getEnv("NATS_URL", "nats://localhost:4222"),
		JWTSecret: getEnv("JWT_SECRET", "supersecret"),
	}
}

func getEnv (k, d string) string {
	if v:= os.Getenv(k); v != "" {
		return v
	}
	return d
}