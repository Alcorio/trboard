package config

import (
	"database/sql"
	"fmt"
	"log"

	"ginboard/model"

	_ "github.com/lib/pq"
)

var (
	DB_USER     = "postgres"
	DB_PASSWORD = "123456"
	DB_NAME     = "trboardb"
	DB_HOST     = "localhost"
	DB_PORT     = "5432"
)

// InitDB 初始化数据库连接并检查表结构
func InitDB() *sql.DB {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("Database is not reachable: %v", err)
	}

	fmt.Println("Database connected successfully")

	// 检查和初始化表结构
	initDBSchema(db)

	return db
}

// initDBSchema 初始化数据库表结构
func initDBSchema(db *sql.DB) {
	// 检查 users 表是否存在
	query := `
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(255) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL
		);
	`
	if _, err := db.Exec(query); err != nil {
		log.Fatalf("Failed to initialize users table: %v", err)
	}

	// 检查是否存在用户，如果没有则创建默认用户
	var count int
	row := db.QueryRow("SELECT COUNT(*) FROM users")
	if err := row.Scan(&count); err != nil {
		log.Fatalf("Failed to check user count: %v", err)
	}

	if count == 0 {
		fmt.Println("No users found. Creating default admin user...")
		defaultUser := model.User{
			Username: "admin",
			Password: "123", // 密码未加密，可后续优化
		}
		_, err := db.Exec("INSERT INTO users (username, password) VALUES ($1, $2)", defaultUser.Username, defaultUser.Password)
		if err != nil {
			log.Fatalf("Failed to create default admin user: %v", err)
		}
		fmt.Println("Default admin user created: admin/123")
	} else {
		fmt.Println("Users table already initialized.")
	}
}
