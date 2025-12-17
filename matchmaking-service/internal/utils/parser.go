package utils

import (
	"strconv"
	"strings"
)

func ParsePlayerID(member string) uint {
	parts := strings.Split(member, ".")
	if len(parts) < 2 {
		return 0
	}
	id, _ := strconv.ParseUint(parts[0], 10, 32)
	return uint(id)
}

func ParseRequestID(member string) string {
	parts := strings.Split(member, ".")
	if len(parts) < 2 {
		return ""
	}
	return parts[1]
}