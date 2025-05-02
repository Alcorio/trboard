package controller

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	//"strings"
	"trboard/model"
	"trboard/service"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

type SampleController struct {
	SampleService *service.SampleService
}

func NewSampleController(sampleService *service.SampleService) *SampleController {
	return &SampleController{SampleService: sampleService}
}

// GET /api/protected/samples/:file_id?page=1&size=10
func (sc *SampleController) GetSamples(c *gin.Context) {
	fileID := c.Param("file_id")
	filterKeyword := c.Query("filter")
	pageStr := c.DefaultQuery("page", "1")
	sizeStr := c.DefaultQuery("size", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page"})
		return
	}
	size, err := strconv.Atoi(sizeStr)
	if err != nil || size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid size"})
		return
	}

	samples, total, err := sc.SampleService.GetSamplesByFileID(fileID, page, size, filterKeyword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询样本失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  samples,
		"total": total,
	})
}

// 悬浮窗口获取样本的具体内容
func (sc *SampleController) GetSampleContent(c *gin.Context) {
	fileID := c.Param("file_id")
	offsetStr := c.Query("offset")
	userID := utils.GetUserID(c)
	offset, err := strconv.ParseInt(offsetStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的offset"})
		return
	}

	content, err := sc.SampleService.GetSampleByFileIDAndOffset(userID, fileID, offset)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": content})
}

// 更新样本表，筛选条件下is_selected字段
func (sc *SampleController) UpdateSamples(c *gin.Context) {
	fileID := c.Param("file_id")
	var req model.ApplyFilterRequest
	log.Println("测试1")

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Println("测试2")
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("updatesamples fail:%v", err)})
		return
	}
	log.Println("测试3")

	// 示例安全检查
	if err := utils.ValidateFilter(req.Filter); err != nil {
		log.Println("测试4")
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("validatefilter fail:%v", err)})
		return
	}
	fmt.Println(req.Filter, "++", req.Enabled)

	if err := sc.SampleService.UpdateSamples(fileID, req.Filter, req.Enabled); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 返回前端成功响应
	c.JSON(http.StatusOK, gin.H{"message": "updateSamples successful"})

}

func (sc *SampleController) UpdateTags(c *gin.Context) {
	fileID := c.Param("file_id")
	userID := utils.GetUserID(c)
	var req model.Tags
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("updatetags json fail:%v", err)})
	}

	// 示例安全检查
	if err := utils.ValidateFilter(req.Filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("validatefilter fail:%v", err)})
		return
	}
	fmt.Println(req.Filter, "++", req.FilterTags)

	if err := sc.SampleService.UpdateTags(userID, fileID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("updateTags error:%v", err)})
		return
	}

	// 返回前端成功响应
	c.JSON(http.StatusOK, gin.H{"message": "updateTags successful"})
}

func (sc *SampleController) DeleteTags(c *gin.Context) {
	fileID := c.Param("file_id")
	userID := utils.GetUserID(c)
	var req model.Tags
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("deletetags json fail:%v", err)})
	}

	// 示例安全检查
	if err := utils.ValidateFilter(req.Filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("validatefilter fail:%v", err)})
		return
	}
	fmt.Println(req.Filter, "++", req.FilterTags)

	if err := sc.SampleService.DeleteTags(userID, fileID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("deleteTags error:%v", err)})
		return
	}

	// 返回前端成功响应
	c.JSON(http.StatusOK, gin.H{"message": "deleteTags successful"})
}

func (sc *SampleController) ExportData(c *gin.Context) {
	fileID := c.Param("file_id")
	userID := utils.GetUserID(c)
	filename := ""
	var err error

	if filename, err = sc.SampleService.ExportData(userID, fileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Export %v successful", filename)})
}
