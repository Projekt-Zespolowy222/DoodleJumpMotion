package utils

import (
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

var Secret = []byte("supersecretkey")

func Parse(tokenStr string) (uint, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("bad sign")
		}
		return Secret, nil
	})
	if err != nil || !token.Valid {
		return 0, errors.New("invalid")
	}
	claims := token.Claims.(jwt.MapClaims)
	return uint(claims["user_id"].(float64)), nil
}