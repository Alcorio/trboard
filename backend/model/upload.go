package model

type Upload struct { // 上传表
	ID          int    `json:"id"`
	FileID      string `json:"file_id"`
	UserID      int    `json:"user_id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Path        string `json:"path"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	IsEnabled   bool   `json:"is_enabled"`
}

type UploadInfo struct {
	Name string `json:"name"`
	// Description string `json:"description"`
	Path string `json:"path"`
}
