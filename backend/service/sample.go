package service

import (
	"bufio"
	"fmt"
	"io"
	"sort"
	"strconv"
	"time"

	// "database/sql"
	"strings"
	//"io"
	"log"
	"os"
	"path/filepath"
	"trboard/config"
	"trboard/model"
	"trboard/utils"
	//"github.com/lib/pq"
)

type SampleService struct {
	UserRepo *DataRepository
}

func NewSampleService(userRepo *DataRepository) *SampleService {
	return &SampleService{
		UserRepo: userRepo,
	}
}

func (s *SampleService) GetSamplesByFileID(fileID string, page, size int, filterKeyword string) ([]model.Sample, int, error) {
	offset := (page - 1) * size

	baseQuery := model.BaseQuery
	var finalQuery string
	suffixQuery := ""

	if filterKeyword != "" {
		lowerFilter := strings.ToLower(filterKeyword)
		if strings.HasPrefix(lowerFilter, "order by") {
			// 用户传的是排序
			finalQuery = baseQuery + " " + filterKeyword
			suffixQuery = `SELECT COUNT(*) FROM samples WHERE file_id = $1`
		} else {
			// 用户传的是条件
			finalQuery = baseQuery + " AND " + filterKeyword
			suffixQuery = fmt.Sprintf(`SELECT COUNT(*) FROM samples WHERE file_id = 
    $1 AND ` + filterKeyword)
		}
	} else {
		finalQuery = baseQuery + ` ORDER BY id`
		suffixQuery = `SELECT COUNT(*) FROM samples WHERE file_id = $1`
	}
	finalQuery = fmt.Sprintf("%s %s", finalQuery, `LIMIT $2 OFFSET $3`)

	// 查分页数据
	rows, err := s.UserRepo.DB.Query(finalQuery, fileID, size, offset)
	if err != nil {
		log.Printf("查分页数据失败:%v:%v", err, finalQuery)
		return nil, 0, err
	}
	defer rows.Close()

	samples := []model.Sample{}
	for rows.Next() {
		var s model.Sample
		err := rows.Scan(
			&s.ID, &s.SampleID, &s.FileID, &s.Contribution, &s.Outlier, &s.Label, &s.IsSelected, &s.FilterTags, &s.Path,
		)
		if err != nil {
			log.Println("for获取单一数据失败:", err)
			return nil, 0, err
		}
		samples = append(samples, s)
	}

	// 查总数
	var total int
	totalquery := fmt.Sprintf("%s %s", model.BaseQueryCount, suffixQuery)
	suffixQuery = utils.RemoveOrderBy(suffixQuery)
	err = s.UserRepo.DB.QueryRow(suffixQuery, fileID).Scan(&total)
	if err != nil {
		log.Printf("查总行数失败:%v:%v", err, totalquery)
		return nil, 0, err
	}

	return samples, total, nil
}

func (s *SampleService) GetSampleByFileIDAndOffset(uid int, fid string, offset int64) (string, error) {
	upload, err := s.UserRepo.FindUploadByUserAndFileID(uid, fid)
	if err != nil {
		return "", fmt.Errorf("GetSampleByFileIDAndOffset get sample: %w", err)
	}

	content, err := utils.ReadLineAtOffset(upload.Path, offset, config.GetReadSize())
	if err != nil {
		return "", fmt.Errorf("utils.ReadLineAtOffset error:%v", err)
	}

	return content, nil
}

func (s *SampleService) UpdateSamples(fid string, filter string, flag bool) error {

	baseSQL := model.BaseUpdate
	var finalSQL string
	if filter != "" {
		lowerFilter := strings.ToLower(filter)
		if strings.HasPrefix(lowerFilter, "order by") {
			// 用户传的是排序
			finalSQL = baseSQL
		} else {
			// 用户传的是条件
			idx := strings.Index(lowerFilter, "order by")
			new_filter := lowerFilter
			if idx != -1 {
				new_filter = strings.TrimSpace(lowerFilter[:idx])
			}
			finalSQL = baseSQL + " AND " + new_filter
		}
	} else {
		finalSQL = baseSQL
	}

	fmt.Printf("Final SQL: %s\n", finalSQL)
	fmt.Printf("是否启用: %v\n", flag)

	if _, err := s.UserRepo.DB.Exec(finalSQL, flag, fid); err != nil {
		log.Printf("finalSQL:%v, 是否启用:%v", finalSQL, flag)
		return fmt.Errorf("updateSamples sql err:%v", err)
	}

	return nil
}

func (s *SampleService) UpdateTags(uid int, fid string, req model.Tags) error {
	upload, err := s.UserRepo.FindUploadByUserAndFileID(uid, fid)
	if upload == nil && err == nil {
		return fmt.Errorf("upload is not exist")
	}

	baseSQL := model.BaseUpdateTags
	var finalSQL string
	if req.Filter != "" {
		lowerFilter := strings.ToLower(req.Filter)
		if strings.HasPrefix(lowerFilter, "order by") {
			// 用户传的是排序
			finalSQL = baseSQL
		} else {
			// 用户传的是条件
			idx := strings.Index(lowerFilter, "order by")
			new_filter := lowerFilter
			if idx != -1 {
				new_filter = strings.TrimSpace(lowerFilter[:idx])
			}
			finalSQL = baseSQL + " AND " + new_filter
		}
	} else {
		finalSQL = baseSQL
	}

	if _, err := s.UserRepo.DB.Exec(finalSQL, req.FilterTags, fid); err != nil {
		log.Printf("updatetags sql error:%v", err)
		return err
	}
	return nil
}

func (s *SampleService) DeleteTags(uid int, fid string, req model.Tags) error {
	upload, err := s.UserRepo.FindUploadByUserAndFileID(uid, fid)
	if upload == nil && err == nil {
		return fmt.Errorf("upload is not exist")
	}

	baseSQL := model.BaseDeleteTags
	var finalSQL string
	if req.Filter != "" {
		lowerFilter := strings.ToLower(req.Filter)
		if strings.HasPrefix(lowerFilter, "order by") {
			// 用户传的是排序
			finalSQL = baseSQL
		} else {
			// 用户传的是条件
			idx := strings.Index(lowerFilter, "order by")
			new_filter := lowerFilter
			if idx != -1 {
				new_filter = strings.TrimSpace(lowerFilter[:idx])
			}
			finalSQL = baseSQL + " AND " + new_filter
		}
	} else {
		finalSQL = baseSQL
	}
	for _, tag := range req.FilterTags {
		if _, err := s.UserRepo.DB.Exec(finalSQL, tag, fid); err != nil {
			log.Printf("delete tag %s failed: %v", tag, err)
			return err
		}
	}
	return nil
}

func (s *SampleService) ExportData(uid int, fid string) (string, error) {
	upload, err := s.UserRepo.FindUploadByUserAndFileID(uid, fid)
	if (upload == nil && err == nil) || (upload != nil && upload.Type != "data") {
		return "", fmt.Errorf("upload is not exist or is not data")
	}

	// 第一步：查询 path
	rows, err := s.UserRepo.DB.Query("SELECT path FROM samples WHERE file_id = $1 AND is_selected = true", fid)
	if err != nil {
		log.Println("export query fail:", err)
		return "", err
	}
	defer rows.Close()

	fileOffsets := []int64{}

	for rows.Next() {
		var path int64
		if err := rows.Scan(&path); err != nil {
			log.Println("row.scan error:", err)
			continue
		}
		fileOffsets = append(fileOffsets, path)
	}
	if len(fileOffsets) == 0 {
		log.Println("无可导出的样本数据")
		return "", fmt.Errorf("no export data")
	}

	// 排序以优化磁盘读取性能
	sort.Slice(fileOffsets, func(i, j int) bool { return fileOffsets[i] < fileOffsets[j] })

	// 第二步：构建导出文件路径
	outputDir := filepath.Join(config.GetOutputdir(), strconv.Itoa(uid))
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("创建导出目录失败: %v", err)
	}
	time_now := time.Now().Format("20060102_150405")
	outputFilePath := filepath.Join(outputDir, fmt.Sprintf("%v_%s", time_now, upload.Name))

	outputFile, err := os.Create(outputFilePath)
	if err != nil {
		log.Println("创建输出文件失败", err)
		return "", err
	}
	defer outputFile.Close()

	// 第三步：打开原始数据文件
	sourceFile, err := os.Open(upload.Path)
	if err != nil {
		log.Printf("无法打开原始文件 %s: %v", upload.Path, err)
		return "", err
	}
	defer sourceFile.Close()

	writer := bufio.NewWriter(outputFile)

	for _, offset := range fileOffsets {
		_, err := sourceFile.Seek(offset, io.SeekStart)
		if err != nil {
			log.Printf("无法 seek 到 offset %d: %v", offset, err)
			continue
		}
		reader := bufio.NewReader(sourceFile)
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			log.Printf("读取 offset %d 失败: %v", offset, err)
			continue
		}
		writer.WriteString(line)
	}

	writer.Flush()

	log.Printf("✅ 导出完成，写入文件：%s", outputFilePath)
	return outputFilePath, nil
}
