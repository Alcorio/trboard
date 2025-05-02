package controller

import (
	"fmt"
	"log"
	"net/http"
	"trboard/service"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

type VisualController struct {
	VisualService *service.VisualService
}

func NewVisualController(vs *service.VisualService) *VisualController {
	return &VisualController{
		VisualService: vs,
	}
}

func (vs *VisualController) GetLabelDistribution(c *gin.Context) {
	fileID := c.Param("file_id")
	uid := utils.GetUserID(c)

	upload, err := vs.VisualService.DataRepo.FindUploadByUserAndFileID(uid, fileID)
	if err != nil || upload == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("File not found or :%v", err)})
		return
	}
	// log.Println("测试运行1")

	var result []map[string]interface{}

	if result, err = vs.VisualService.GetLabelDistribution(uid, fileID, upload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
	}
	// log.Println("测试运行2")

	c.JSON(http.StatusOK, result)
}

func (vs *VisualController) GetVecsDistribution(c *gin.Context) {
	fileID := c.Param("file_id")
	uid := utils.GetUserID(c)
	// log.Println("测试运行3", uid, fileID)

	upload, err := vs.VisualService.DataRepo.FindUploadByUserAndFileID(uid, fileID)
	if err != nil || upload == nil {
		log.Println("GetVecsDistribution:", err)
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("File not found or :%v", err)})
		return
	}

	var result []map[string]interface{}
	// log.Println("测试运行4")
	if result, err = vs.VisualService.GetVecsDistribution(uid, fileID, upload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
	}

	c.JSON(http.StatusOK, result)
}
