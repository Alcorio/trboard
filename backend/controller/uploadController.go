package controller

import (
	// "database/sql"
	// "fmt"
	"errors"
	"log"
	"net/http"
	"trboard/model"
	"trboard/service"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

type UploadController struct {
	UploadService *service.UploadService
}

func NewUploadController(uploadService *service.UploadService) *UploadController {
	return &UploadController{UploadService: uploadService}
}

// 上传一个文件
func (uc *UploadController) Uploadfile(c *gin.Context) {

	userID := utils.GetUserID(c)

	fileType := c.PostForm("type") // dataset / script
	description := c.PostForm("description")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file selected"})
		return
	}

	// 保存文件

	upload := &model.Upload{
		UserID:      userID,
		Name:        file.Filename,
		Type:        fileType,
		Description: description,
		IsEnabled:   false,
	}
	savePath, err := uc.UploadService.SaveUpload(upload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database write fail"})
		return
	}

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "savefile fail"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "successful", "path": savePath})
}

// 上传多个文件
func (uc *UploadController) Uploadfiles(c *gin.Context) {
	userID := utils.GetUserID(c)
	fileType := c.PostForm("type")

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(400, gin.H{"error": "get uploadforms error"})
		return
	}

	files := form.File["files"] // "files" 是 input name="files"
	descriptions := form.Value["description[]"]
	var results []model.UploadInfo

	for i, file := range files {
		description := ""
		if i < len(descriptions) {
			description = descriptions[i]
		}
		upload := &model.Upload{
			UserID:      userID,
			Name:        file.Filename,
			Type:        fileType,
			Description: description,
			IsEnabled:   false,
		}
		savePath, err := uc.UploadService.SaveUpload(upload)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database write fail"})
			return
		}

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "savefile fail"})
			return
		}

		results = append(results, model.UploadInfo{
			Name: file.Filename,
			Path: savePath,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"results": results,
	})
}

func (uc *UploadController) DeleteUpload(c *gin.Context) {
	fileID := c.Param("file_id") // 从路径中获取 file_id
	userID := utils.GetUserID(c)

	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "miss file_id"})
		return
	}

	// 调用 service 删除逻辑
	err := uc.UploadService.DeleteUpload(userID, fileID)
	if err != nil {
		if errors.Is(err, model.ErrRecordNotFound) { // 改为返回404
			c.JSON(http.StatusNotFound, gin.H{"error": "no record"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "successful"})

}

func (uc *UploadController) GetUserUploads(c *gin.Context) {
	userID := utils.GetUserID(c)

	uploads, err := uc.UploadService.GetUploadsByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "getUserUploads error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": uploads})
}

func (uc *UploadController) UpdateUpload(c *gin.Context) {
	fileID := c.Param("file_id")
	// fmt.Println("检测file_id", fileID)
	userID := utils.GetUserID(c)
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "miss file_id"})
		return
	}

	input := &model.UploadUpdate{}

	if err := c.ShouldBindJSON(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	input.UserID = userID
	input.FileID = fileID

	if err := uc.UploadService.UpdateUpload(input); err != nil {
		if errors.Is(err, model.ErrRecordNotFound) { // 改为返回404
			c.JSON(http.StatusNotFound, gin.H{"error": "no record"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Upload updated successfully"})
}

func (uc *UploadController) InitIndex(c *gin.Context) {
	fileID := c.Param("file_id")
	userID := utils.GetUserID(c)

	log.Println("成功获取fileid:", fileID)
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "miss file_id"})
		return
	}

	if err := uc.UploadService.InitIndex(userID, fileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Init index successfully"})
}

func (uc *UploadController) DeleteAllIndex(c *gin.Context) {
	fileID := c.Param("file_id")
	userID := utils.GetUserID(c)
	log.Println("成功获取到fileid:", fileID)

	if err := uc.UploadService.DeleteAllIndex(userID, fileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message:": "delete index successful"})
}
