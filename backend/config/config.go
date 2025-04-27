package config

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/spf13/viper"

	"trboard/model"

	_ "github.com/lib/pq"
)

func InitConfig() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	err := viper.ReadInConfig()
	if err != nil {
		panic(fmt.Errorf("读取配置失败: %w", err))
	}
	fmt.Println("初始化配置文件成功")
}

// InitDB 初始化数据库连接并检查表结构
func InitDB() *sql.DB {
	dsn := viper.GetString("database.dsn")
	db, err := sql.Open("postgres", dsn)
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

	// 初始化上传表
	query_uploads := `
	CREATE TABLE IF NOT EXISTS uploads (
		id              SERIAL PRIMARY KEY,
		file_id UUID    DEFAULT gen_random_uuid(),
		user_id         INT REFERENCES users(id) ON DELETE CASCADE,
		name            TEXT NOT NULL,
		type            TEXT NOT NULL,
		description     TEXT,
		path            TEXT NOT NULL,
		is_enabled      BOOLEAN DEFAULT false,
		created_at      TIMESTAMP,
		updated_at      TIMESTAMP
	);
	`
	if _, err := db.Exec(query_uploads); err != nil {
		log.Fatalf("Failed to initialize uploads table: %v", err)
	}

	// 增加表的列
	_, err := db.Exec(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_id UUID DEFAULT gen_random_uuid();`) // 单引号优于双引号 后者还需要转义
	if err != nil {
		log.Fatalf("添加新列失败:%v", err)
	}

}

func GetBaseDir() string {
	return viper.GetString("basedir")
}

func GetUploadir() string {
	return viper.GetString("uploadir")
}
