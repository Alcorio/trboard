'use client';

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function TrainingPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab"); // 获取 URL 查询参数

  const [uploadedScripts, setUploadedScripts] = useState([]); // 脚本文件列表
  const [scriptCount, setScriptCount] = useState(0); // 脚本文件计数

  const [uploadedData, setUploadedData] = useState([]); // 数据文件列表
  const [dataCount, setDataCount] = useState(0); // 数据文件计数

  const [uploadMessage, setUploadMessage] = useState(""); // 上传提示信息

  // 上传函数
  const uploadToServer = async (files, type) => {
    const formData = new FormData();
    const isMulti = files.length > 1;
  
    for (const file of files) {
      if (isMulti) {
        formData.append("files", file);
        formData.append("description[]", ""); // 多文件版本
      } else {
        formData.append("file", file);
      }
    }
  
    if (!isMulti) {
      formData.append("description", ""); // 单文件版本
    }
  
    formData.append("type", type);
  
    try {
      const res = await fetch(
        isMulti ? "/api/protected/uploadfiles" : "/api/protected/uploadfile",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );
  
      if (!res.ok) throw new Error("上传失败！");
      const result = await res.json();
      return { success: true, message: result.message || "上传成功" };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };
  

  // 验证文件类型
  const validateFileType = (file, allowedTypes) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(fileExtension);
  };

  // 格式化文件名（长文件名打省略号）
  const formatFileName = (name) => {
    // if (!name || typeof name !== "string" || name.trim() === "") {
    //   return "未知文件"; // 确保文件名存在并为字符串
    // }
    const stringName = String(name);

    // 确保字符串非空且不全是空格
    if (!stringName.trim()) {
      return "未知文件"; // 返回默认值
    }
    return name.length > 15 ? `${name.slice(0, 12)}...` : name;
  };

  // 清屏
  const clearOutput = (type) => {
    setUploadMessage(""); // 清除提示信息
    if (type === "script") {
      setUploadedScripts([]);
      setScriptCount(0);
    } else if (type === "data") {
      setUploadedData([]);
      setDataCount(0);
    }
  };

  // 单文件上传
  const handleSingleFileUpload = async (e, type) => {
    clearOutput(type); // 每次上传前清屏
    const file = e.target.files[0];

    if (!file) return;
    const allowedTypes = type === "script" ? ["py", "exe"] : ["csv", "txt", "jpg", "png", "zip", "rar", "json", "jsonl"];
    if (!validateFileType(file, allowedTypes)) {
      setUploadMessage("上传失败！文件类型不支持。");
      return;
    }

    const { success, message } = await uploadToServer([file], type);

    if (success) {
      if (type === "script") {
        setUploadedScripts([file]);
        setScriptCount(1);
      } else {
        setUploadedData([{ name: file.name, url: URL.createObjectURL(file) }]);
        setDataCount(1);
        
      }
    }

    setUploadMessage(message);
    
  };

  // 多文件上传
  const handleMultipleFilesUpload = async (e, type) => {
    clearOutput(type); // 每次上传前清屏
    const files = Array.from(e.target.files);
    const allowedTypes = type === "script" ? ["py", "exe"] : ["csv", "txt", "jpg", "png", "zip", "rar", "json", "jsonl"];
    const validFiles = files.filter((file) => validateFileType(file, allowedTypes));
    
    if (validFiles.length === 0) {
      setUploadMessage("未上传任何有效文件！");
      return;
    }
  
    const { success, message } = await uploadToServer(validFiles, type);
  
    if (success) {
      if (type === "script") {
        setUploadedScripts(validFiles);
        setScriptCount(validFiles.length);
      } else {
        const uploaded = validFiles.map((file) => ({
          name: file.name,
          url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        }));
        setUploadedData(uploaded);
        setDataCount(validFiles.length);
      }
    }
  
    setUploadMessage(message);

    // if (validFiles.length) {
    //   if (type === "script") {
    //     setUploadedScripts(validFiles.map((file) => file.name));
    //     setScriptCount(validFiles.length);
    //     setUploadMessage(`共 ${validFiles.length} 个脚本上传成功！`);
    //   } else if (type === "data") {
    //     const uploaded = validFiles.map((file) => ({
    //       name: file.name,
    //       url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    //     }));
    //     setUploadedData(uploaded);
    //     setDataCount(validFiles.length);
    //     setUploadMessage(`共 ${validFiles.length} 个数据上传成功！`);
    //   }
    // } else {
    //   setUploadMessage("未上传任何有效文件！");
    // }
  };

  const renderFiles = (files) => {
    return (
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 text-xs border rounded p-2"
            style={{ maxWidth: "120px", wordBreak: "break-word" }}
          >
            <span className="text-green-600">{formatFileName(file.name || file )} 上传成功！</span>
            {file.url && (
              <Image
                src={file.url}
                alt={file.name}
                width={32}
                height={32}
                className="object-cover border"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (tab) {
      case "uploadScript":
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">上传训练脚本</h2>
            <div className="mb-4">
              <label className="block font-semibold">单文件上传</label>
              <input
                type="file"
                onClick={() => clearOutput("script")}
                onChange={(e) => handleSingleFileUpload(e, "script")}
                className="block mb-2"
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold">多文件上传</label>
              <input
                type="file"
                multiple
                onClick={() => clearOutput("script")}
                onChange={(e) => handleMultipleFilesUpload(e, "script")}
                className="block"
              />
            </div>
            <div className="mb-4 text-sm text-gray-600">{scriptCount} files</div>
            <div className="overflow-auto max-h-[400px]">{renderFiles(uploadedScripts)}</div>
          </div>
        );
      case "uploadData":
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">上传训练数据</h2>
            <div className="mb-4">
              <label className="block font-semibold">单文件上传</label>
              <input
                type="file"
                onClick={() => clearOutput("data")}
                onChange={(e) => handleSingleFileUpload(e, "data")}
                className="block mb-2"
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold">多文件上传</label>
              <input
                type="file"
                multiple
                onClick={() => clearOutput("data")}
                onChange={(e) => handleMultipleFilesUpload(e, "data")}
                className="block"
              />
            </div>
            <div className="mb-4 text-sm text-gray-600">{dataCount} files</div>
            <div className="overflow-auto max-h-[400px]">{renderFiles(uploadedData)}</div>
          </div>
        );
      default:
        return <p>请选择一个功能。</p>;
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">训练管理</h1>
      {uploadMessage && <div className="mb-4 text-blue-600 text-sm">{uploadMessage}</div>}
      {renderContent()}
    </div>
  );
}
