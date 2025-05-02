package service

import (
	"encoding/csv"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"trboard/config"
	"trboard/utils"
)

type ScriptService struct {
	DataRepo *DataRepository
}

func NewScriptService(dataRepo *DataRepository) *ScriptService {
	return &ScriptService{
		DataRepo: dataRepo,
	}
}

// 执行脚本部分暂未完成
func (s *ScriptService) RunScripts() error {
	return nil
}

func (s *ScriptService) ProcessLossAndSCD(uid int, lossScripts []string, scdScripts []string, fileID string) error {
	sampleContrib := map[string]float64{}
	sampleOutlier := map[string]float64{}

	upload, err := s.DataRepo.FindUploadByUserAndFileID(uid, fileID)
	if err != nil {
		return fmt.Errorf("processLossAndSCD fetch error:%v", err)
	}

	// 处理 loss
	for _, fid := range lossScripts {
		script, err := s.DataRepo.FindUploadByUserAndFileID(uid, fid)
		log.Println("当前loss脚本:", script.Name)
		if err != nil {
			log.Println("当前user脚本不存在", err)
			return fmt.Errorf("no script: %v", err)
		}

		nameWithoutExt := strings.TrimSuffix(filepath.Base(upload.Name), filepath.Ext(upload.Name))
		csvPath := filepath.Join(config.GetOutputdir(), fmt.Sprintf("%s/losses_%s.csv", strconv.Itoa(uid), nameWithoutExt))
		if _, err := os.Stat(csvPath); errors.Is(err, os.ErrNotExist) {
			log.Println(csvPath, "不存在", " namewithoutext:", nameWithoutExt)
			continue
		}

		file, err := os.Open(csvPath)
		if err != nil {
			return err
		}
		defer file.Close()

		reader := csv.NewReader(file)
		rows, err := reader.ReadAll()
		if err != nil {
			log.Println("读入行失败:", err)
			return err
		}

		header := rows[0] // 遍历第一行找到epoch开头和结尾的索引
		startIdx := -1
		for i, col := range header {
			if strings.HasPrefix(strings.ToLower(col), "epoch") {
				startIdx = i
				break
			}
		}
		if startIdx == -1 {
			log.Println("未找到epoch字段")
			return fmt.Errorf("未找到 epoch 字段")
		}

		for i, row := range rows {
			if i == 0 {
				continue // header
			}
			id, flag := utils.ExtractSampleID(row[0])
			if !flag {
				return fmt.Errorf("不支持的id格式")
			}
			sum := 0.0
			count := 0
			for _, val := range row[startIdx:] {
				if f, err := strconv.ParseFloat(val, 64); err == nil {
					sum += f
					count++
				}
			}
			if count > 0 {
				sampleContrib[id] = sum / float64(count)
				// log.Println(id, ":", sampleContrib[id])
			}
		}
	}

	// 处理 scd
	for _, fid := range scdScripts {
		script, err := s.DataRepo.FindUploadByUserAndFileID(uid, fid)
		log.Println("当前scd脚本:", script.Name)
		if err != nil {
			log.Println("当前user的脚本不存在:", err)
			return fmt.Errorf("no scd script: %v", err)
		}

		nameWithoutExt := strings.TrimSuffix(filepath.Base(upload.Name), filepath.Ext(upload.Name))
		csvPath := filepath.Join(config.GetOutputdir(), fmt.Sprintf("%s/scd_%s.csv", strconv.Itoa(uid), nameWithoutExt))
		if _, err := os.Stat(csvPath); errors.Is(err, os.ErrNotExist) {
			log.Println(csvPath, "不存在")
			continue
		}

		file, err := os.Open(csvPath)
		if err != nil {
			return err
		}
		defer file.Close()

		reader := csv.NewReader(file)
		rows, err := reader.ReadAll()
		if err != nil {
			return err
		}

		header := rows[0] // 遍历第一行找到epoch开头和结尾的索引
		startIdx := -1
		for i, col := range header {
			if strings.HasPrefix(strings.ToLower(col), "epoch") {
				startIdx = i
				break
			}
		}
		if startIdx == -1 {
			log.Println("未找到epoch字段")
			return fmt.Errorf("未找到 epoch 字段")
		}

		for i, row := range rows {
			if i == 0 {
				continue // 跳过 header
			}
			id, flag := utils.ExtractSampleID(row[0])
			if !flag {
				return fmt.Errorf("不支持的id格式")
			}
			sum := 0.0
			count := 0

			for _, val := range row[startIdx:] {
				if f, err := strconv.ParseFloat(val, 64); err == nil {
					sum += f
					count++
				}
			}
			if count > 0 {
				sampleOutlier[id] = sum / float64(count)
				//log.Println(id, ":", sampleOutlier[id])
			}
		}
	}

	// 批量更新 samples 表
	return s.DataRepo.UpdateSampleContribAndOutlierBatch(sampleContrib, sampleOutlier)

}
