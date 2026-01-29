package handlers

import (
	"arenas-service/internal/domain"
	"arenas-service/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ArenaHandler struct {
	service *services.ArenaService
}

func NewArenaHandler(service *services.ArenaService) *ArenaHandler {
	return &ArenaHandler{service: service}
}

func (h *ArenaHandler) GetArenaByCups(c *gin.Context) {
	role := c.GetString("role")
	userID := c.GetInt64("user_id")
	userCups := c.GetInt("cup_count")

	cupsStr := c.Param("cups")
	cups, err := strconv.Atoi(cupsStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cups value"})
		return
	}

	arena, err := h.service.GetArenaByCups(cups)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Arena not found"})
		return
	}

	if role == "player" && (arena.MinCups > userCups || arena.MaxCups < userCups) {
		userArena, err := h.service.GetArenaByUserID(userID)
		if err != nil || userArena.ID != arena.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: can access only your own arena"})
			return
		}
	}

	c.JSON(http.StatusOK, arena)
}

func (h *ArenaHandler) GetAllArenas(c *gin.Context) {
	role := c.GetString("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	arenas, err := h.service.GetAllArenas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch arenas"})
		return
	}

	c.JSON(http.StatusOK, arenas)
}

func (h *ArenaHandler) CreateArena(c *gin.Context) {
	role := c.GetString("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var arena domain.Arena
	if err := c.ShouldBindJSON(&arena); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateArena(&arena); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create arena"})
		return
	}

	c.JSON(http.StatusCreated, arena)
}

func (h *ArenaHandler) UpdateArena(c *gin.Context) {
	role := c.GetString("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid arena ID"})
		return
	}

	var arena domain.Arena
	if err := c.ShouldBindJSON(&arena); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	arena.ID = id
	if err := h.service.UpdateArena(&arena); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update arena"})
		return
	}

	c.JSON(http.StatusOK, arena)
}

func (h *ArenaHandler) DeleteArena(c *gin.Context) {
	role := c.GetString("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid arena ID"})
		return
	}

	if err := h.service.DeleteArena(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete arena"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Arena deleted"})
}
