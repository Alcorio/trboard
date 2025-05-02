package model

import (
	"github.com/lib/pq"
)

type Sample struct {
	ID           int            `json:"id"`
	SampleID     string         `json:"sample_id"`
	FileID       string         `json:"file_id"`
	Contribution float64        `json:"contribution"`
	Outlier      float64        `json:"outlier"`
	Label        string         `json:"label"`
	IsSelected   bool           `json:"is_selected"`
	FilterTags   pq.StringArray `json:"filter_tags"`
	Path         int64          `json:"path"`
}

type SampleInfo struct {
	Path int64 `json:"path"`
}

type Record struct { // s鼠标悬停时返回数据集的内容
	Class   int    `json:"class"` // 当前jsonl的class数据是int类型
	Content string `json:"function"`
}

type ApplyFilterRequest struct {
	Filter  string `json:"filter"`
	Enabled bool   `json:"enabled"`
}

type Tags struct {
	Filter     string         `json:"filter"`
	FilterTags pq.StringArray `json:"filter_tags"`
}

var InsertSQLPrefix = `
INSERT INTO samples (
file_id, sample_id, path, contribution, outlier, label, is_selected, filter_tags
) VALUES 
`
var BaseQuery = `SELECT id, sample_id, file_id, contribution, outlier, label, is_selected, filter_tags, path FROM samples WHERE file_id = $1`

var BaseQueryCount = `SELECT COUNT(*) FROM samples WHERE file_id = $1`

var BaseUpdate = `UPDATE samples SET is_selected = $1 WHERE file_id = $2`

var BaseUpdateTags = `UPDATE samples
SET filter_tags = (
    SELECT ARRAY(
        SELECT DISTINCT unnest(filter_tags || $1)
    )
)
WHERE file_id = $2
`

var BaseDeleteTags = `UPDATE samples
SET filter_tags = array_remove(filter_tags, $1)
WHERE file_id = $2`
