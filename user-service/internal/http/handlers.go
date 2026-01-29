package http

import (
	"doodlejump-backend/user-service/internal/services"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userService *services.UserService
}

type LoginInput struct {
	Email 	 string `json:"email"`
	Password string `json:"password"`
}

func CalculateArenaByCups(cups int) int {
    switch {
    case cups >= 0 && cups <= 499: return 1
    case cups >= 500 && cups <= 999: return 2
    case cups >= 1000 && cups <= 1499: return 3
    case cups >= 1500 && cups <= 1999: return 4
    case cups >= 2000 && cups <= 2499: return 5
    case cups >= 2500 && cups <= 2999: return 6
    case cups >= 3000 && cups <= 3499: return 7
    case cups >= 3500 && cups <= 3999: return 8
    case cups >= 4000 && cups <= 4499: return 9
    default: return 10
    }
}

func NewAuthHandler(userService *services.UserService) *AuthHandler {
	return &AuthHandler{userService: userService}
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req struct {
        Username string `json:"username"`
        Email    string `json:"email"`
        Password string `json:"password"`
        Role     string `json:"role"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    user, err := h.userService.RegisterUser(req.Username, req.Email, req.Password, req.Role)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    token, err := services.GenerateJWT(user.ID, user.Username, user.Role, user.CupCount)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "token": token,
        "user": gin.H{
            "id":       user.ID,
            "username": user.Username,
            "email":    user.Email,
        },
    })
}



func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.GetByEmail(input.Email)
	if err != nil {
        c.JSON(401, gin.H{"error": "invalid email or password"})
        return
    }

	if !services.CheckPasswordHash(input.Password, user.PasswordHash) {
		c.JSON(401, gin.H{"error": "invalid email or password"})
        return
    }

	token, err := services.GenerateJWT(user.ID, user.Username,  user.Role, user.CupCount)
	if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate token"})
        return
    }
	
	 c.JSON(200, gin.H{
        "token": token,
        "user": gin.H{
            "id":       user.ID,
            "username": user.Username,
            "email":    user.Email,
        },
    })
}


func ProfileHandler(userService *services.UserService) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetInt64("user_id")
        
        user, err := userService.GetByID(userID)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
            return
        }

        c.JSON(200, gin.H{
            "user_id":  user.ID,
            "username": user.Username,
            "cup_count": user.CupCount,
            "highest_cups": user.HighestCups,
            "current_arenaid": user.CurrentArenaID,
            "level": user.Level,
            "experience": user.Experience,
        })
    }
}

func GetUserByIDHandler(userService *services.UserService) gin.HandlerFunc {
    return func(c *gin.Context) {
        idParam := c.Param("id")
        id, err := strconv.ParseInt(idParam, 10, 64)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
            return
        }

        user, err := userService.GetByID(id)
        if err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
            return
        }

        c.JSON(http.StatusOK, gin.H{
            "id":        user.ID,
            "cup_count": user.CupCount,
            "role":      user.Role,
        })
    }
}

func (h *AuthHandler) UpdateCups(c *gin.Context) {
    idParam := c.Param("id")
    id, err := strconv.ParseInt(idParam, 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    var body struct {
        CupChange int `json:"cup_change"`
    }

    if err := c.BindJSON(&body); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
        return
    }

    user, err := h.userService.GetByID(id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
        return
    }

    user.CupCount += body.CupChange
    if user.CupCount < 0 {
        user.CupCount = 0
    }

    user.CurrentArenaID = CalculateArenaByCups(user.CupCount)

    if user.CupCount > user.HighestCups {
        user.HighestCups = user.CupCount
    }

    if err := h.userService.UpdateUser(user); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "id":        user.ID,
        "new_cups":  user.CupCount,
        "arena_id":  user.CurrentArenaID,
    })

    go func(userID int64, newCups int) {
        url := fmt.Sprintf("http://leaderboard-service:8080/leaderboard/update?userId=%d&cups=%d", userID, newCups)
        req, _ := http.NewRequest("POST", url, nil)
        req.Header.Set("INTERNAL_API_TOKEN", os.Getenv("INTERNAL_API_TOKEN"))

        client := &http.Client{Timeout: 5 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
            log.Printf("❌ failed to notify leaderboard: %v", err)
            return
        }
        defer resp.Body.Close()

        if resp.StatusCode != http.StatusOK {
            log.Printf("❌ leaderboard returned %d", resp.StatusCode)
        } else {
            log.Printf("✅ leaderboard notified for user %d", userID)
        }
    }(user.ID, user.CupCount)
}

func (h *AuthHandler) GetAllUsersInfo(c *gin.Context) {
    users, err := h.userService.GetAllUsersInfo()

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"users": users})
}