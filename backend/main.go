package main

import (
	"ginboard/config"
	"ginboard/middlewares"
	"ginboard/router"

	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库
	db := config.InitDB()
	defer db.Close()

	// 初始化Gin引擎
	r := gin.Default()

	// 使用 CORS 中间件
	r.Use(middlewares.CORSMiddleware())

	// 注册路由
	router.RegisterRoutes(r, db)

	// 启动服务器
	r.Run(":8080")
}
