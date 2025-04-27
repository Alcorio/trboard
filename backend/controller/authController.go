package controller

import (
	"net/http"
	"strconv"
	"trboard/service"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	AuthService *service.AuthService
}

func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{AuthService: authService}
}

func (controller *AuthController) Login(c *gin.Context) {
	var loginData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil { // 用于将请求体的json数据绑定到结构体上
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input"})
		return
	}

	user, err := controller.AuthService.Login(loginData.Username, loginData.Password) // 判定账号和密码
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": err.Error()})
		return
	}

	// token, _ := utils.GenerateToken(user.Username)
	token, _ := utils.GenerateToken(user.Username, strconv.Itoa(user.ID))

	// c.SetCookie("auth_token", "user_secure_token", 3600, "/", "localhost", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "token": token})
}
