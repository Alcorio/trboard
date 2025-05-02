package service

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"trboard/config"
	"trboard/model"
)

type VisualService struct {
	DataRepo *DataRepository
}

func NewVisualService(dataRepo *DataRepository) *VisualService {
	return &VisualService{
		DataRepo: dataRepo,
	}
}

func (vs *VisualService) GetLabelDistribution(uid int, fid string, upload *model.Upload) ([]map[string]interface{}, error) {
	nameWithoutExt := strings.TrimSuffix(filepath.Base(upload.Name), filepath.Ext(upload.Name))
	csvPath := filepath.Join(config.GetOutputdir(), fmt.Sprintf("%s/label_distribution_%s.csv", strconv.Itoa(uid), nameWithoutExt))
	f, err := os.Open(csvPath)
	if err != nil {
		log.Println("打开label_distribution.csv文件失败")
		return []map[string]interface{}{}, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil || len(records) < 2 {
		log.Printf("读取%v失败: %v", csvPath, err)
		return []map[string]interface{}{}, err
	}

	var result []map[string]interface{}
	for _, row := range records[1:] {
		count, _ := strconv.Atoi(row[1])
		result = append(result, map[string]interface{}{
			"label": row[0],
			"count": count,
		})
	}
	return result, nil
}

func (vs *VisualService) GetVecsDistribution(uid int, fid string, upload *model.Upload) ([]map[string]interface{}, error) {
	nameWithoutExt := strings.TrimSuffix(filepath.Base(upload.Name), filepath.Ext(upload.Name))
	csvPath := filepath.Join(config.GetOutputdir(), fmt.Sprintf("%s/vecs_distribution_%s.csv", strconv.Itoa(uid), nameWithoutExt))

	f, err := os.Open(csvPath)
	if err != nil {
		log.Println("打开vecs_distribution.csv文件失败")
		return []map[string]interface{}{}, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil || len(records) < 2 {
		log.Printf("读取%v失败: %v", csvPath, err)
		return []map[string]interface{}{}, err
	}

	var result []map[string]interface{}
	for _, row := range records[1:] {
		x, _ := strconv.ParseFloat(row[0], 64)
		y, _ := strconv.ParseFloat(row[1], 64)
		result = append(result, map[string]interface{}{
			"x":     x,
			"y":     y,
			"label": row[2],
		})
	}
	return result, nil
}
