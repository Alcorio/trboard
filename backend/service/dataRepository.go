package service

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"trboard/model"
)

type DataRepository struct {
	DB *sql.DB
}

func NewDataRepository(db *sql.DB) *DataRepository {
	return &DataRepository{DB: db}
}

func (repo *DataRepository) FindByUsername(username string) (*model.User, error) {
	var user model.User
	query := "SELECT id, username, password FROM users WHERE username = $1"
	err := repo.DB.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.Password)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// func (repo *DataRepository) InsertUpload()

func (s *DataRepository) FindUploadByUserAndFileID(uid int, fid string) (*model.Upload, error) {
	query := `SELECT * FROM uploads WHERE user_id = $1 AND file_id = $2`

	upload := &model.Upload{}
	err := s.DB.QueryRow(query, uid, fid).Scan(
		&upload.ID,
		&upload.FileID,
		&upload.UserID,
		&upload.Name,
		&upload.Type,
		&upload.Description,
		&upload.Path,
		&upload.IsEnabled,
		&upload.CreatedAt,
		&upload.UpdatedAt,
		&upload.IsIndex,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // 数据不存在，返回 nil, nil（或者自定义错误）
		}
		return nil, err // 其他数据库错误
	}
	return upload, nil
}

// 批量更新
func (r *DataRepository) UpdateSampleContribAndOutlierBatch(
	contrib map[string]float64,
	outlier map[string]float64,
) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()

	// 统一 key 合并
	allIDs := map[string]struct{}{}
	for id := range contrib {
		allIDs[id] = struct{}{}
	}
	for id := range outlier {
		allIDs[id] = struct{}{}
	}

	// 构造批量更新 SQL
	args := []interface{}{}
	valueStrings := []string{}
	i := 1
	for id := range allIDs {
		c := contrib[id]
		o := outlier[id]

		// 填充 SQL VALUES ($1, $2, $3), ...
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d)", i, i+1, i+2))
		args = append(args, id, c, o)
		i += 3
	}

	if len(valueStrings) == 0 {
		log.Println("没有需要更新的记录")
		return nil
	}

	query := fmt.Sprintf(`
	UPDATE samples AS s SET
		contribution = CAST(v.contribution AS DOUBLE PRECISION),
		outlier = CAST(v.outlier AS DOUBLE PRECISION)
	FROM (VALUES %s) AS v(sample_id, contribution, outlier)
	WHERE s.sample_id = v.sample_id
`, strings.Join(valueStrings, ","))

	_, err = tx.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("批量更新失败: %v", err)
	}

	log.Printf("批量更新 %d 条样本 contribution/outlier 成功\n", len(valueStrings))
	return nil
}
