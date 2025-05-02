package service

import (
	"bufio"
	"database/sql"
	"fmt"

	// "log"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
	"trboard/config"
	"trboard/model"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type UploadService struct {
	UserRepo *DataRepository
}

func NewUploadService(userRepo *DataRepository) *UploadService {
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

func (s *UploadService) DeleteUpload(uid int, fuid string) error {
	var path string
	err := s.UserRepo.DB.QueryRow(`
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
		_, err = s.UserRepo.DB.Exec(`
		DELETE FROM uploads WHERE file_id = $1 AND user_id = $2
	    `, fuid, uid)
		if err != nil {
			return fmt.Errorf("delete record error: %v", err)
		}
		return fmt.Errorf("check file is not exist! record has be removed")
	}

	// 删除数据库记录
	_, err = s.UserRepo.DB.Exec(`
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
		SELECT id, file_id, user_id, name, type, description, path, is_enabled, created_at, updated_at, is_index
		FROM uploads
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // query没有scan流程，因此没有关闭的代码，需要手动结束连接

	uploads := make([]model.Upload, 0) // 初始化为空
	for rows.Next() {
		var u model.Upload
		err := rows.Scan(&u.ID, &u.FileID, &u.UserID, &u.Name, &u.Type, &u.Description, &u.Path, &u.IsEnabled, &u.CreatedAt, &u.UpdatedAt, &u.IsIndex)
		if err != nil {
			return nil, err
		}
		uploads = append(uploads, u)
		// log.Println(u.UpdatedAt)
	}
	return uploads, nil
}

func (s *UploadService) UpdateUpload(u *model.UploadUpdate) error {
	var path string
	err := s.UserRepo.DB.QueryRow(`
	SELECT path FROM uploads WHERE file_id = $1
    `, u.FileID).Scan(&path)

	if err == sql.ErrNoRows {
		fmt.Println("记录未找到")
		return model.ErrRecordNotFound
	} else if err != nil {
		fmt.Println("查找失败:", err)
		return fmt.Errorf("find record error: %v", err)
	}
	time_now := time.Now().Format("2006-01-02 15:04:05.000")

	query := `
		UPDATE uploads 
		SET description = $1, is_enabled = $2, updated_at = $3 
		WHERE file_id = $4 AND user_id = $5`
	_, err = s.UserRepo.DB.Exec(query, u.Description, u.IsEnabled, time_now, u.FileID, u.UserID)
	if err != nil {
		fmt.Println("更新uploads失败")
		return fmt.Errorf("update error: %v", err)
	}
	return nil
}

// 初始化包括索引，建表
func (s *UploadService) InitIndex(uid int, fid string) error {
	upload, err := s.UserRepo.FindUploadByUserAndFileID(uid, fid)
	if err != nil {
		return fmt.Errorf("FinddUploadByUserAndFileID error:%v", err)
	}
	// fmt.Println("判断是否索引化------", upload.IsIndex)
	if upload.IsIndex {
		return fmt.Errorf("index has already been performed")
	}

	filePath := upload.Path
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("cannot open file:%v", err)
	}
	defer file.Close()

	tx, err := s.UserRepo.DB.Begin() // 因为大量数据插入，准备数据库事务，并设置回滚和提交方式
	if err != nil {
		return fmt.Errorf("cannot start transaction: %v", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		}
	}()

	// scanner := bufio.NewScanner(file) // 默认一行最大64kb，换下面方式读入
	reader := bufio.NewReader(file)
	var offset int64 = 0
	lineNumber := 0
	batchSize := config.GetBatchSize() // 批量插入行
	args := []interface{}{}
	valueStrings := []string{}

	argCounter := 1
	// for scanner.Scan() 改为如下方式
	for {
		// line := scanner.Text()
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			fmt.Printf("读取文件出错:%v", err)
			return err
		}
		var rec model.Record
		if err := json.Unmarshal(line, &rec); err != nil {
			fmt.Printf("JSON 解析错误: %v\n", err)
			rec.Class = -1
		}
		// 构造单条记录
		valueStrings = append(valueStrings, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			argCounter, argCounter+1, argCounter+2, argCounter+3, argCounter+4, argCounter+5, argCounter+6, argCounter+7,
		))

		args = append(args,
			upload.FileID,
			fmt.Sprintf("%d", lineNumber), // sample_id
			offset,                        // path
			0.0,                           // contribution
			0.0,                           // outlier_score
			rec.Class,                     // label
			true,                          // is_selected
			pq.StringArray{},              // filter_tags
		)

		lineLength := int64(len(line)) // 修改后不用+1,换行符已读取
		offset += lineLength
		argCounter += 8
		lineNumber++

		if lineNumber%1000 == 0 {
			fmt.Printf("[行%d] 当前解析到的Class: %v\n", lineNumber, rec.Class)
			contentPreview := rec.Content
			if len(contentPreview) > 10 {
				contentPreview = contentPreview[:20]
			}
			fmt.Printf("[行%d] 当前解析到的func前20字: %v\n", lineNumber, contentPreview)
		}

		// 达到一批了，就执行插入
		if len(valueStrings) == batchSize {
			err = BatchInsert(tx, model.InsertSQLPrefix, valueStrings, args)
			if err != nil {
				return fmt.Errorf("batch insert error: %v", err)
			}
			// 清空，准备下一批
			valueStrings = valueStrings[:0]
			args = args[:0]
			argCounter = 1
		}

	}
	// 不足batchsize，直接插入
	if len(valueStrings) > 0 {
		err = BatchInsert(tx, model.InsertSQLPrefix, valueStrings, args)
		if err != nil {
			return fmt.Errorf("final batch insert error:%v", err)
		}
	}

	updateQuery := `UPDATE uploads SET is_index = true WHERE file_id = $1 AND user_id = $2`
	if _, err := tx.Exec(updateQuery, fid, uid); err != nil {
		return fmt.Errorf("update is_index error:%v", err)
	}

	// if err := scanner.Err(); err != nil {
	// 	return fmt.Errorf("scanner error: %v", err)
	// }

	// 全部正常，提交事务
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("commit transaction error: %v", err)
	}

	return nil
}

func BatchInsert(tx *sql.Tx, sqlPrefix string, valueStrings []string, args []interface{}) error {
	fullSQL := sqlPrefix + strings.Join(valueStrings, ",")
	_, err := tx.Exec(fullSQL, args...)
	return err
}

// 删除文件的所有索引记录
func (s *UploadService) DeleteAllIndex(uid int, fid string) error {
	query_index := `DELETE FROM Samples WHERE file_id = $1;`
	query_upload := `UPDATE uploads SET is_index = false WHERE file_id = $1 AND user_id = $2`

	if _, err := s.UserRepo.DB.Exec(query_upload, fid, uid); err != nil {
		return fmt.Errorf("deleteIndex() update is_index error:%v", err)
	}

	if _, err := s.UserRepo.DB.Exec(query_index, fid); err != nil {
		return fmt.Errorf("delete all index error:%v", err)
	}

	return nil
}
