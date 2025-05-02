package controller

import (
	"net/http"
	"trboard/model"
	"trboard/service"
	"trboard/utils"

	"github.com/gin-gonic/gin"
)

type ScriptController struct {
	ScriptService *service.ScriptService
}

func NewScriptController(sc *service.ScriptService) *ScriptController {
	return &ScriptController{
		ScriptService: sc,
	}
}

func (sc *ScriptController) RunScript(c *gin.Context) {
	var req model.ScriptCategory

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "runScript bindJson fail"})
		return
	}
	/*
		执行脚本暂时未完成
	*/
	if err := sc.ScriptService.RunScripts(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uid := utils.GetUserID(c)

	// 只处理 loss 和 scd
	if err := sc.ScriptService.ProcessLossAndSCD(uid, req.Loss, req.SCD, req.Data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "脚本运行成功，已更新样本离群度和贡献度"})

}
