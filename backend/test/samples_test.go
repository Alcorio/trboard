package test

import (
	"bufio"
	"io"
	"log"
	"os"
	"testing"
)

// 如果直接点击run test没有作用 在vscode的settings.json 添加"go.testFlags": ["-v"]  或者终端输入命令go test -v
func TestReadLineAtOffset(t *testing.T) {
	filePath := "F:/workspace/trboard/tmp/uploads/1_1745861138_train_with_noise.jsonl" // 替换成你的文件路径
	offset := int64(22302067)                                                          // 替换成你要测试的offset

	line, err := ReadLineAtOffset(filePath, offset)
	if err != nil {
		t.Fatalf("读取失败: %v", err)
	}

	// t.Logf("读取到的内容是:\n%s", line)
	log.Printf("读取到的内容是:\n%s", line)
}

// 封装一个工具函数
func ReadLineAtOffset(filePath string, offset int64) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	_, err = file.Seek(offset, io.SeekStart)
	if err != nil {
		return "", err
	}

	reader := bufio.NewReader(file)
	line, err := reader.ReadString('\n')
	if err != nil && err != io.EOF {
		return "", err
	}

	return line, nil
}
