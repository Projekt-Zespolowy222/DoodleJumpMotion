package http

import (
	"doodlejump-backend/user-service/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userService *services.UserService
}

type LoginInput struct {
	Email 	 string `json:"email"`
	Password string `json:"password"`
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

    token, err := services.GenerateJWT(user.ID, user.Username, user.Role)
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

	token, err := services.GenerateJWT(user.ID, user.Username,  user.Role)
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


func ProfileHandler(c *gin.Context) {
	userID := c.GetInt64("user_id")
	username := c.GetString("username")

	c.JSON(200, gin.H{
		"user_id":  userID,
		"username": username,
	})
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