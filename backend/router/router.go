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
	dataRepo := service.NewDataRepository(db)
	authService := service.NewAuthService(dataRepo)
	uploadService := service.NewUploadService(dataRepo)
	sampleService := service.NewSampleService(dataRepo)
	scriptService := service.NewScriptService(dataRepo)
	visualService := service.NewVisualService(dataRepo)
	authController := controller.NewAuthController(authService)
	uploadController := controller.NewUploadController(uploadService)
	sampleController := controller.NewSampleController(sampleService)
	scriptController := controller.NewScriptController(scriptService)
	visualController := controller.NewVisualController(visualService)

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
			protected.POST("/uploadfile", uploadController.Uploadfile)   // 上传单文件
			protected.POST("/uploadfiles", uploadController.Uploadfiles) // 上传多文件
			protected.POST("/uploads/:file_id/index", uploadController.InitIndex)
			protected.GET("/uploads", uploadController.GetUserUploads)                       // 获取当前用户上传列表
			protected.PATCH("/uploads/:file_id", uploadController.UpdateUpload)              // 更新文件信息
			protected.DELETE("/uploads/:file_id", uploadController.DeleteUpload)             // 删除fileid文件
			protected.DELETE("/uploads/:file_id/index", uploadController.DeleteAllIndex)     // 删除当前文件的全部索引
			protected.GET("/samples/:file_id", sampleController.GetSamples)                  // 获取样本表
			protected.GET("/samples/:file_id/read", sampleController.GetSampleContent)       // 获取一个样本的内容
			protected.POST("/samples/:file_id/apply_filter", sampleController.UpdateSamples) // 更新样本启用
			protected.POST("/samples/:file_id/add_tags", sampleController.UpdateTags)        // 更新样本tags
			protected.POST("/samples/:file_id/delete_tags", sampleController.DeleteTags)     // 删除样本tags
			protected.POST("/samples/:file_id/export_data", sampleController.ExportData)     // 导出数据
			protected.POST("/scripts/run", scriptController.RunScript)
			protected.GET("/visual/:file_id/label_distribution", visualController.GetLabelDistribution)
			protected.GET("/visual/:file_id/vecs_distribution", visualController.GetVecsDistribution)
		}
	}
}
