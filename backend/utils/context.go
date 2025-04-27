package utils

import (
	"github.com/gin-gonic/gin"
	"strconv"
)

func GetUserID(c *gin.Context) int {
	userIDStr := c.MustGet("user_id").(string)
	userID, _ := strconv.Atoi(userIDStr)
	return userID
}
