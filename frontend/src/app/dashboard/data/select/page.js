'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import DateCell from "@/components/datecell";
import { toast } from "react-hot-toast"; // 消息提示 替代alert，非警告确认型
import { RefreshCw } from "lucide-react"; // 刷新按钮
import { Download } from "lucide-react"; // 下载按钮

export default function DataSelectPage() {
  const [uploads, setUploads] = useState([]);
  const [isIndexed, setIsIndexed] = useState(false);
  const [samples, setSamples] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(null);
  const [currentUpload, setCurrentUpload] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const samplesPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [hoverContent, setHoverContent] = useState(null); // 悬浮窗口数据
  const [showModal, setShowModal] = useState(false); // 控制是否展示弹窗
  const [displayMode, setDisplayMode] = useState('json'); // 'json' 或 'block' 展示jsonl数据
  const [activeButton, setActiveButton] = useState('enable'); // 'enable' 或 'disable' 全部启用/关闭
  const [filterError, setFilterError] = useState(""); // 用来保存筛选条件的错误提示
  const [selectedEpoch, setSelectedEpoch] = useState("average");  // epoch选择展示


  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterEnabled, setFilterEnabled] = useState(true);

  const [tagInput, setTagInput] = useState("");

  // sql校验
  function validateFilterKeyword(filterKeyword) {
    const lower = filterKeyword.trim().toLowerCase();

    // 1. 禁止危险关键词
    const forbiddenKeywords = [
      "update", "insert", "delete", "drop", "alter", "create", "truncate",
      "merge", "replace", "rename", "exec", "execute", "union", "sleep",
      ";", "--", "/*", "*/", "#"
    ];
    for (const keyword of forbiddenKeywords) {
      if (lower.includes(keyword)) {
        return `筛选条件包含非法关键词：${keyword}`;
      }
    }

    // 2. 禁止 "AND ORDER BY" 这种非法组合
    if (lower.includes("and order by") || lower.includes("or order by")) {
      return "筛选条件非法：不能出现 'AND ORDER BY' 或 'OR ORDER BY'";
    }

    // 3. 禁止结尾是 "AND" 或 "OR"
    if (/\b(and|or)\s*$/i.test(lower)) {
      return "筛选条件非法：不能以 'AND' 或 'OR' 结尾";
    }

    // 4. 检查括号数量
    const leftBrackets = (filterKeyword.match(/\(/g) || []).length;
    const rightBrackets = (filterKeyword.match(/\)/g) || []).length;
    if (leftBrackets !== rightBrackets) {
      return "筛选条件非法：括号不配对";
    }

    // 5. 可选：检测连续多个空格、特殊符号
    if (filterKeyword.includes(";;") || filterKeyword.includes("--")) {
      return "筛选条件非法：包含非法符号";
    }

    return null; // null表示校验通过
  }

  useEffect(() => { // 获取当前上传数据的信息
    fetch("/api/protected/uploads", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const activeUploads = data.data.filter((item) => item.is_enabled && item.type === "data");
        setUploads(activeUploads);

        if (activeUploads.length > 0) {
          const upload = activeUploads[0];
          setCurrentUpload(upload);
          setIsIndexed(upload.is_index);

          if (!upload.is_index) {
            displayIndexingPrompt(upload.name);
          } else {
            fetchSamples(upload.file_id, 1);
          }
        }
      });
  }, []);

  const displayIndexingPrompt = (datasetName) => {
    const text = `检测到数据集${datasetName}未构建索引，是否构建索引？`;
    setIndexingProgress(text);
  };

  const handleIndexConfirm = async () => {
    if (!currentUpload) return;
    setIsIndexing(true);
    setIndexingProgress("正在索引化，请稍等...");
    try {
      const res = await fetch(`/api/protected/uploads/${currentUpload.file_id}/index`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const result = await res.json();
      if (res.ok) {
        setIndexingProgress(result.message || "索引化成功！");
        setTimeout(() => {
          setIsIndexed(true);
          fetchSamples(currentUpload.file_id, 1);
        }, 2000);
      } else {
        setIndexingProgress(result.error || "索引化失败，请稍后再试。");
      }
    } catch (error) {
      console.error(error);
      setIndexingProgress("索引化请求失败！");
    } finally {
      setIsIndexing(false);
    }
  };

  const fetchSamples = (fileId, page) => {
    let url = `/api/protected/samples/${fileId}?page=${page}&size=${samplesPerPage}`;
    if (filterKeyword.trim() !== "") {
      url += `&filter=${encodeURIComponent(filterKeyword)}`;
      // url = buildFilterURL(url, filterKeyword)
    }
    fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.data) ? data.data : [];
        const total = Number.isFinite(data.total) ? data.total : 0;
        setSamples(list);
        setTotalPages(Math.ceil(total / samplesPerPage));
      });
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && currentUpload) {
      setCurrentPage(page);
      fetchSamples(currentUpload.file_id, page);
    }
  };
  // 提交全部启用和筛选条件
  const handleApplyFilter = async () => {
    if (!currentUpload) return;
    try {
      const res = await fetch(`/api/protected/samples/${currentUpload.file_id}/apply_filter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          filter: filterKeyword,
          enabled: filterEnabled,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        // alert(result.message || "筛选成功！");
        setFilterError("");
        toast.success("筛选成功!");
        setCurrentPage(1);
        fetchSamples(currentUpload.file_id, 1);
      } else {
        const errMsg = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
        setFilterError(errMsg);
        console.log("okk")
        toast.error(errMsg || "筛选失败！");
      }
    } catch (error) {
      console.error(error);
      setFilterError(error);
      toast.error("请求失败！");
    }
  };


  const handleAddTag = async () => { // 添加tag
    if (!currentUpload || !tagInput.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tags.length === 0) {
      toast.error("Tag 格式不合法");
      return;
    }
    try {
      const res = await fetch(`/api/protected/samples/${currentUpload.file_id}/add_tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          filter: filterKeyword,
          filter_tags: tags,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("添加Tag成功");
        fetchSamples(currentUpload.file_id, currentPage);
      } else {
        toast.error(result.error || "添加失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("请求失败！");
    }
  };

  const handleDeleteTag = async () => { // 删除tag
    if (!currentUpload || !tagInput.trim()) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tags.length === 0) {
      toast.error("Tag 格式不合法");
      return;
    }
    try {
      const res = await fetch(`/api/protected/samples/${currentUpload.file_id}/delete_tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          filter: filterKeyword,
          filter_tags: tags,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("删除 Tag 成功");
        fetchSamples(currentUpload.file_id, currentPage);
      } else {
        toast.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("请求失败！");
    }
  };


  const handleExport = async () => {
    if (!currentUpload) {
      toast.error("当前数据集不存在");
      return;
    }

    try {
      const res = await fetch(`/api/protected/samples/${currentUpload.file_id}/export_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "导出成功！");
      } else {
        toast.error(result.error || "导出失败！");
      }
    } catch (err) {
      console.error(err);
      toast.error("请求失败，网络或服务异常！");
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];

    if (totalPages <= 7) {
      // 页数很少，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1); // 始终显示第1页

      if (currentPage > 4) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage + 2 < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages); // 始终显示最后1页
    }

    return pages.map((page, index) => (
      <span
        key={index}
        onClick={() => typeof page === "number" && handlePageChange(page)}
        className={`cursor-pointer px-1 ${page === currentPage ? "font-bold underline" : ""}`}
      >
        {page}
      </span>
    ));
  };
  // 
  const handleDeleteIndex = async () => {
    if (!currentUpload) return;
    if (!confirm("确定要删除索引吗？")) return;

    try {
      const res = await fetch(`/api/protected/uploads/${currentUpload.file_id}/index`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || "索引删除成功！");
        setIsIndexed(false);
        setSamples([]);
        setCurrentPage(1);
        displayIndexingPrompt(currentUpload.name);
      } else {
        toast.error(result.error || "删除失败！");
      }
    } catch (error) {
      console.error(error);
      toast.error("请求失败！");
    }
  };
  // 获取悬浮窗口数据
  const fetchSampleContent = async (offset) => {
    if (!currentUpload) return;
    try {
      const res = await fetch(`/api/protected/samples/${currentUpload.file_id}/read?offset=${offset}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const result = await res.json();
      if (res.ok) {
        setHoverContent(result.content || "读取失败");
        setShowModal(true); // 加这一句，点击后弹窗打开
      } else {
        setHoverContent(result.error || "读取失败");
        setShowModal(true);
      }
    } catch (error) {
      console.error(error);
      setHoverContent("请求失败");
      setShowModal(true);
    }
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">样本管理</h1>

      {/* 数据集索引处理 */}
      {isIndexed === false && (
        <div>
          <p>{indexingProgress}</p>
          {indexingProgress && indexingProgress.includes("是否构建索引") && !isIndexing && (
            <div className="mt-4">
              <Button onClick={handleIndexConfirm} className="bg-blue-500 text-white hover:bg-blue-600">
                是
              </Button>
            </div>
          )}
          {isIndexing && <div className="mt-4 text-blue-500 font-semibold">正在索引化，请稍候...</div>}
        </div>
      )}


      {/* 样本表 */}
      {isIndexed && (
        <div>
          <div className="flex items-center text-xs text-gray-500 mb-1">
            删除 {currentUpload?.name || "当前"} 数据集索引？
            <span
              onClick={handleDeleteIndex}
              className="ml-2 cursor-pointer text-green-600 hover:text-green-800 select-none"
              title="点击删除索引"
            >
              √
            </span>
          </div>
          {/* 当前路径展示 */}
          {/* <div className="mb-2 text-sm text-gray-700">
          当前数据路径: {currentUpload?.path || "未指定"}
          </div> */}
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-blue-400 text-white">
                <th className="border p-1" title="sample_id">样本ID</th>
                <th className="border p-1" title="label">标签</th>
                <th className="border p-1" title="contribution">贡献度</th>
                <th className="border p-1" title="outlier">离群度</th>
                <th className="border p-1" title="is_selected">是否选中</th>
                <th className="border p-1" title="filter_tags[]">筛选条件</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample) => (
                <tr key={sample.id} className="border group hover:bg-gray-50">
                  <td className="p-1 relative group">
                    <span
                      className="underline cursor-pointer"
                      onClick={() => fetchSampleContent(sample.path)}
                    >
                      {sample.sample_id}
                    </span>
                  </td>
                  <td className="p-1">{sample.label}</td>
                  <td className="p-1">{sample.contribution}</td>
                  <td className="p-1">{sample.outlier}</td>
                  <td className="p-1">
                    <Switch checked={sample.is_selected} className="data-[state=checked]:bg-green-500" />
                  </td>
                  <td className="p-1">{sample.filter_tags.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页 */}
          <div className="flex justify-between items-center mt-4 text-xs">
            <div>第 {currentPage} 页 / 共 {totalPages} 页</div>
            <div className="flex items-center space-x-2">
              {renderPagination()}
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="border rounded p-1 w-16 text-center"
              />
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white w-2/3 h-2/3 p-6 rounded shadow-lg relative overflow-auto">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
                <h2 className="text-lg font-bold mb-4">样本原始内容</h2>

                {/* 模式切换按钮 */}
                <div className="absolute top-2 right-12 flex space-x-2">
                  <button
                    onClick={() => setDisplayMode('json')}
                    className={`px-2 py-1 border rounded text-xs ${displayMode === 'json' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setDisplayMode('block')}
                    className={`px-2 py-1 border rounded text-xs ${displayMode === 'block' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    分块
                  </button>
                </div>
                {/* 内容区域 */}
                <div className="mt-10 space-y-4 text-sm">
                  {hoverContent && (() => {
                    try {
                      const data = JSON.parse(hoverContent);
                      if (displayMode === 'json') {
                        return (
                          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(data, null, 2)}</pre>
                        );
                      } else {
                        return (
                          <div className="space-y-4">
                            {data.function && (
                              <div>
                                <div className="font-bold">函数内容：</div>
                                <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap text-xs">{data.function}</pre>
                              </div>
                            )}
                            {data.label !== undefined && (
                              <div>
                                <div className="font-bold">标签 (label)：</div>
                                <div>{data.label}</div>
                              </div>
                            )}
                            {data.info !== undefined && (
                              <div>
                                <div className="font-bold">信息 (info)：</div>
                                <div>{data.info}</div>
                              </div>
                            )}
                            {data.class !== undefined && (
                              <div>
                                <div className="font-bold">类别 (class)：</div>
                                <div>{data.class}</div>
                              </div>
                            )}
                            {data.is_noisy !== undefined && (
                              <div>
                                <div className="font-bold">是否噪声 (is_noisy)：</div>
                                <div>{data.is_noisy === 1 ? "是" : "否"}</div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    } catch (e) {
                      return <div className="text-red-500">内容解析失败</div>;
                    }
                  })()}
                </div>
              </div>
            </div>
          )}


          {/* 底部功能区 */}
          <div className="mt-6 space-y-4">
            {/* 筛选模块 */}
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="输入筛选条件"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="border rounded p-2 w-64"
              />
              {filterError && (
                <div className="text-red-500 text-xs mt-1 ml-1">
                  {filterError}
                </div>
              )}
              {/* 滑动按钮开关 */}
              <label className="relative inline-block w-24 h-8 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterEnabled}
                  onChange={(e) => {
                    setFilterEnabled(e.target.checked);
                    setActiveButton(e.target.checked ? 'enable' : 'disable');
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-full h-full rounded-full transition-colors duration-300 ${filterEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                />
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${filterEnabled ? 'translate-x-16' : 'translate-x-0'
                    }`}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white select-none" title="当前筛选条件，是否启用样本">
                  {filterEnabled ? '全部启用' : '全部关闭'}
                </div>
              </label>

              {/* epoch 选择器 */}
              <div className="relative">
                <select
                  value={selectedEpoch}
                  onChange={(e) => setSelectedEpoch(e.target.value)}
                  className="border rounded p-2 text-sm"
                  title="选择展示离群度/贡献度的 epoch"
                >
                  <option value="average">平均值 (average)</option>
                  <option value="epoch0">epoch0</option>
                  <option value="epoch1">epoch1</option>
                  <option value="epoch2">epoch2</option>
                  <option value="epoch3">epoch3</option>
                  <option value="epoch4">epoch4</option>
                </select>
              </div>

              <Button
                onClick={() => {
                  const error = validateFilterKeyword(filterKeyword);
                  if (error) {
                    setFilterError(error); // 有错误，设置错误信息
                    return;
                  }
                  setFilterError(""); // 没错误，清空错误提示
                  handleApplyFilter(); // 正常提交
                }}
                className="bg-blue-500 text-white hover:bg-blue-600" title="应用筛选条件和启用状态"
              >
                √
              </Button>
            </div>
            {/* 添加Tag模块 */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="对筛选结果添加/删除 tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="border rounded p-2 w-64"
              />
              <Button onClick={handleAddTag} className="bg-blue-500 text-white hover:bg-blue-600" title="添加当前tag">√</Button>
              <Button onClick={handleDeleteTag} className="bg-red-500 text-white hover:bg-red-600" title="删除当前tag">×</Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gray-700 hover:bg-gray-800 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center"
                title="刷新页面"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* 导出模块 */}
            <div>
              <Button
                onClick={handleExport}
                className="bg-purple-500 text-white hover:bg-purple-600 flex items-center space-x-1"
                title="导出所有启用的数据"
              >
                <Download className="w-4 h-4" />
                <span>导出所有启用的数据</span>
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}



