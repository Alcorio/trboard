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
		updated_at      TIMESTAMP,
		is_index        BOOLEAN DEFAULT false
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

	_, err = db.Exec(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS is_index BOOLEAN DEFAULT false;`) // 单引号优于双引号 后者还需要转义
	if err != nil {
		log.Fatalf("添加新列失败:%v", err)
	}

	query_samples := `
	CREATE TABLE IF NOT EXISTS samples (
		id              SERIAL PRIMARY KEY,
		file_id UUID    DEFAULT gen_random_uuid(),
		sample_id       TEXT,
		Path            BIGINT NOT NULL, 
		contribution    FLOAT,
		outlier         FLOAT,
    	label 			TEXT,
    	is_selected 	BOOLEAN DEFAULT TRUE,
    	filter_tags 	TEXT[]
	);
	`
	if _, err := db.Exec(query_samples); err != nil {
		log.Fatalf("Failed to initialize samples table: %v", err)
	}

	_, err = db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_samples_filter_tags ON samples USING GIN (filter_tags) 
	`) // gin "Generalized Inverted Index"（广义倒排索引）后续查询方式 SELECT * FROM samples WHERE filter_tags @> ARRAY['good'];
	if err != nil {
		log.Fatalf("构建索引失败:%v", err)
	}

	if err := ResetIDIfEmpty(db, "samples", "samples_id_seq"); err != nil {
		log.Fatal(err)
	}

}

// 初始化数据库表samples的id序列，表空时再进行初始化(主要是用来测试时方便观察id),pgadmin也可以手动设置
func ResetIDIfEmpty(db *sql.DB, tableName, sequenceName string) error {
	var count int
	err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&count)
	if err != nil {
		return fmt.Errorf("查询表失败: %v", err)
	}

	if count == 0 {
		_, err := db.Exec(fmt.Sprintf("ALTER SEQUENCE %s RESTART WITH 1", sequenceName))
		if err != nil {
			return fmt.Errorf("重置序列失败: %v", err)
		}
		log.Printf("✅ 表 %s 为空，已重置自增 ID", tableName)
	}
	return nil
}

func GetBaseDir() string {
	return viper.GetString("basedir")
}

func GetUploadir() string {
	return viper.GetString("uploadir")
}

func GetBatchSize() int {
	return viper.GetInt("batchsize")
}

func GetReadSize() int {
	return viper.GetInt("readsize")
}

func GetOutputdir() string {
	return viper.GetString("outputdir")
}
