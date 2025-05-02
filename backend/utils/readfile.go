package utils

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"os"
	"regexp"
	"strings"
)

// ReadLineAtOffset 通过 offset 从文件中快速读取一行数据
// filePath: 文件路径
// offset: 起始字节位置
// maxLineSize: 允许读取的最大行长度（比如 4KB）防止超大行
func ReadLineAtOffset(filePath string, offset int64, maxLineSize int) (string, error) {
	// 打开文件
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 定位到指定 offset
	_, err = file.Seek(offset, io.SeekStart)
	if err != nil {
		return "", err
	}

	reader := bufio.NewReader(file)

	// 用一个 bytes.Buffer 累积读取到的内容
	var buf bytes.Buffer
	for buf.Len() < maxLineSize {
		part, err := reader.ReadBytes('\n') // 读取直到遇到换行符
		buf.Write(part)

		if err != nil {
			if errors.Is(err, io.EOF) {
				break // 文件读完了
			}
			return "", err // 其他读取错误
		}
		// 读到换行了就停
		if len(part) > 0 && part[len(part)-1] == '\n' {
			break
		}
	}

	// 如果超过了最大行长度，切掉
	content := buf.Bytes()
	if len(content) > maxLineSize {
		content = content[:maxLineSize]
	}

	return string(content), nil
}

var idPattern = regexp.MustCompile(`(?:sample|idx|id)[-_]?(\d+)$|^(\d+)$`)

// 正则表达式，用来区分sample_id sample-id idx-id idx_id id
func ExtractSampleID(raw string) (string, bool) {
	matches := idPattern.FindStringSubmatch(strings.TrimSpace(raw))
	if len(matches) == 3 {
		if matches[1] != "" {
			return matches[1], true
		}
		if matches[2] != "" {
			return matches[2], true
		}
	}
	return "", false
}
