package router

import (
	"database/sql"
	"ginboard/controller"
	"ginboard/middlewares"
	"net/http"

	// "ginboard/repositories"
	"ginboard/service"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, db *sql.DB) {
	userRepo := service.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	authController := controller.NewAuthController(authService)

	api := r.Group("/api")
	{
		api.POST("/login", authController.Login) // 定义/api/login路由 第二个参数为处理函数 当访问该路由时会调用函数

		protected := api.Group("/protected")       // 创建子路由分组，表示该路径下所有路由进行额外保护
		protected.Use(middlewares.JWTMiddleware()) // 使用中间件保护路由组
		{
			protected.GET("/dashboard", func(c *gin.Context) {
				username := c.MustGet("username").(string) // 获取jwt中间件解析出的用户名
				c.JSON(http.StatusOK, gin.H{"message": "Welcome " + username})
			})
		}
	}
}
