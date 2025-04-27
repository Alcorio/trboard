package router

import (
	"database/sql"
	"net/http"
	"trboard/controller"
	"trboard/middlewares"

	// "trboard/repositories"
	"trboard/service"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, db *sql.DB) {
	userRepo := service.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	uploadService := service.NewUploadService(userRepo)
	authController := controller.NewAuthController(authService)
	uploadController := controller.NewUploadController(uploadService)

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
			protected.POST("/uploadfile", uploadController.Uploadfile)           // 上传单文件
			protected.POST("/uploadfiles", uploadController.Uploadfiles)         // 上传多文件
			protected.GET("/uploads", uploadController.GetUserUploads)           // 获取当前用户上传列表
			protected.DELETE("/uploads/:file_id", uploadController.DeleteUpload) // 删除fileid文件
		}
	}
}
