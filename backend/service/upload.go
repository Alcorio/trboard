package service

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"trboard/config"
	"trboard/model"

	"github.com/google/uuid"
)

type UploadService struct {
	UserRepo *UserRepository
}

func NewUploadService(userRepo *UserRepository) *UploadService {
	return &UploadService{UserRepo: userRepo}
}

func (s *UploadService) SaveUpload(u *model.Upload) (string, error) {
	time_now := time.Now().Format("2006-01-02 15:04:05.000")
	filename := fmt.Sprintf("%d_%d_%s", u.UserID, time.Now().Unix(), filepath.Base(u.Name))
	savePath := filepath.Join(config.GetBaseDir(), "tmp/uploads", filename)
	fuid := uuid.New().String()
	fmt.Println("保存路径:", savePath)
	savePath = strings.ReplaceAll(savePath, "\\", "/") // filepath解析出来为\\ 为了前端需要统一转换

	// 插入数据库
	_, err := s.UserRepo.DB.Exec(`
        INSERT INTO uploads (user_id, name, type, description, path, created_at, updated_at, file_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, u.UserID, u.Name, u.Type, u.Description, savePath, time_now, time_now, fuid)

	if err != nil {
		fmt.Printf("[Upload Error] %v\n", err)
		return "", fmt.Errorf("saved upload table err")
	}

	return savePath, err
}

func (d *UploadService) DeleteUpload(uid int, fuid string) error {
	var path string
	err := d.UserRepo.DB.QueryRow(`
	SELECT path FROM uploads WHERE file_id = $1 AND user_id = $2
    `, fuid, uid).Scan(&path)

	if err == sql.ErrNoRows {
		fmt.Println("记录未找到")
		return model.ErrRecordNotFound
	} else if err != nil {
		fmt.Println("查找失败:", err)
		return fmt.Errorf("find record error: %v", err)
	}

	// 限制只能删除 tmp/uploads 目录下的文件
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve path error: %v", err)
	}

	// 基准目录
	uploadir, err := filepath.Abs(config.GetUploadir())
	if err != nil {
		return fmt.Errorf("resolve uploadirABS error: %v", err)
	}
	if !strings.HasPrefix(absPath, uploadir) {
		fmt.Println("filepath:", absPath, "\nuploadir:", uploadir)
		return fmt.Errorf("can't delete this outside uploadir")
	}

	// 检查文件是否存在
	if _, statErr := os.Stat(path); os.IsNotExist(statErr) {
		_, err = d.UserRepo.DB.Exec(`
		DELETE FROM uploads WHERE file_id = $1 AND user_id = $2
	    `, fuid, uid)
		if err != nil {
			return fmt.Errorf("delete record error: %v", err)
		}
		return fmt.Errorf("check file is not exist! record has be removed.")
	}

	// 删除数据库记录
	_, err = d.UserRepo.DB.Exec(`
		DELETE FROM uploads WHERE file_id = $1 AND user_id = $2
	`, fuid, uid)
	if err != nil {
		return fmt.Errorf("delete record error: %v", err)
	}

	// 删除物理文件
	if err := os.Remove(path); err != nil {
		fmt.Printf("警告：文件删除失败 %s: %v", path, err)
		// 文件不存在时也不需要终止整个删除流程
	}

	return nil
}

func (s *UploadService) GetUploadsByUser(userID int) ([]model.Upload, error) {
	rows, err := s.UserRepo.DB.Query(`
		SELECT id, file_id, user_id, name, type, description, path, is_enabled, created_at, updated_at
		FROM uploads
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	uploads := make([]model.Upload, 0) // 初始化为空
	for rows.Next() {
		var u model.Upload
		err := rows.Scan(&u.ID, &u.FileID, &u.UserID, &u.Name, &u.Type, &u.Description, &u.Path, &u.IsEnabled, &u.CreatedAt, &u.UpdatedAt)
		if err != nil {
			return nil, err
		}
		uploads = append(uploads, u)
	}
	return uploads, nil
}
