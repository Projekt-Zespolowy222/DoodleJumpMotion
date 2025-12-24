package http

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("supersecretkey")

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header missing"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		claims := token.Claims.(jwt.MapClaims)

		userID := int64(claims["user_id"].(float64))

		username := ""
		if u, ok := claims["username"].(string); ok {
    		username = u
		}

		role := "player"
		if r, ok := claims["role"].(string); ok {
    		role = r
		}
		if role != "admin" {
    		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden, admin only"})
    		c.Abort()
    		return
		}

		c.Set("user_id", userID)
		c.Set("username", username)
		c.Set("role", role)

		c.Next()
	}
}

func IdMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header missing"})
            c.Abort()
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return jwtSecret, nil
        })

        if err != nil || !token.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            c.Abort()
            return
        }

        claims := token.Claims.(jwt.MapClaims)
        userID := int64(claims["user_id"].(float64))
        username := ""
        if u, ok := claims["username"].(string); ok {
            username = u
        }

        c.Set("user_id", userID)
        c.Set("username", username)

        c.Next()
    }
}

func InternalAuthMiddleware() gin.HandlerFunc {
	requiredToken := os.Getenv("INTERNAL_API_TOKEN")

	return func(c *gin.Context) {
		fmt.Println("All headers:", c.Request.Header)
		internalToken := c.GetHeader("INTERNAL_API_TOKEN")
		if internalToken == "" || internalToken != requiredToken {
            c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            c.Abort()
            return
        } 	
		c.Next()
	}
}

