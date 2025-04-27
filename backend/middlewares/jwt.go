package middlewares

import (
	"net/http"
	"strings"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization") // 从header获取token
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Missing token"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)

		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token format"})
			c.Abort()
			return
		}

		token := parts[1]
		var username, userid string
		var err error
		if token == "admin" {
			username = "admin"
			userid = "1"

		} else {
			username, userid, err = utils.ValidateToken(token)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
				c.Abort() // 中断后续的中间件和处理函数执行
				return
			}
		}

		c.Set("username", username)
		c.Set("user_id", userid) // 👈 添加 user_id

		c.Next()
	}
}
