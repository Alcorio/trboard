package utils

import (
	"errors"
	"regexp"
	"strings"
)

// 定义允许的字段
var allowedFields = map[string]bool{
	"sample_id":    true,
	"label":        true,
	"contribution": true,
	"outlier":      true,
	"is_selected":  true,
	"filter_tags":  true,
}

// 定义禁止的危险关键词（全部小写）
var forbiddenKeywords = []string{
	"update", "insert", "delete", "drop", ";", "--", "/*", "*/", "select", "union", "limit", "offset", "file_id",
}

// 核心安全检查函数
func ValidateFilter(filter string) error {
	lower := strings.ToLower(filter)

	// 检查危险关键词
	for _, keyword := range forbiddenKeywords {
		if strings.Contains(lower, keyword) {
			return errors.New("筛选条件包含非法关键词")
		}
	}

	// 检查嵌套括号 ( 简单限制，防止子查询
	if strings.Count(filter, "(") != strings.Count(filter, ")") {
		return errors.New("括号数量不匹配，禁止嵌套查询")
	}

	// 进一步可以用正则检查字段是否合法
	// 提取所有可能出现的字段
	fieldRegex := regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*)`)
	matches := fieldRegex.FindAllString(filter, -1)

	for _, field := range matches {
		if !allowedFields[field] && !isSafeSQLWord(field) {
			return errors.New("包含非法字段名: " + field)
		}
	}

	return nil
}

// 检查是否是安全的SQL操作符
func isSafeSQLWord(word string) bool {
	switch strings.ToUpper(word) {
	case "AND", "OR", "ASC", "DESC", "ORDER", "BY", "NOT", "NULL", "TRUE", "FALSE", "GROUP":
		return true
	default:
		return false
	}
}

func RemoveOrderBy(sql string) string {
	// 正则匹配：order 后有一个或多个空格，然后是 by，忽略大小写
	re := regexp.MustCompile(`(?i)\border\s+by\b`)
	loc := re.FindStringIndex(sql)
	if loc != nil {
		// 截取匹配前的部分
		return strings.TrimSpace(sql[:loc[0]])
	}
	return sql
}

// func JudgeGroupBy(sql string) string {
// 	// 正则匹配：order 后有一个或多个空格，然后是 by，忽略大小写
// 	re := regexp.MustCompile(`(?i)\border\s+by\b`)
// 	loc := re.FindStringIndex(sql)
// 	if loc != nil {
// 		// 截取匹配前的部分
// 		return strings.TrimSpace(sql[:loc[0]])
// 	}
// 	return sql
// }
