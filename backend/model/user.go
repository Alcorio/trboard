package model

// User 数据模型
type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"` // 暂时未加密
}
