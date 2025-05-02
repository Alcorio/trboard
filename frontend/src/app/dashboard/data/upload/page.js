'use client';

import { useEffect, useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import DateCell from "@/components/datecell";// 统一时间格式
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function DataUploadPage() {
  const [uploads, setUploads] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [pendingDescriptions, setPendingDescriptions] = useState({});
  const [deletedFileIds, setDeletedFileIds] = useState([]);

  // 获取上传记录
  useEffect(() => {
    // const now = new Date().toLocaleString();
    // console.log(`[${now}] 发起加载上传记录请求`);
    fetch("/api/protected/uploads",
        {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        }
    )
      .then(res => res.json())
      .then(data => {
        const now = new Date().toLocaleString();
        console.log(`[${now}] 成功获取上传记录数据，共${(data.data || []).length}条`);

        const items = data.data || [];
        setUploads(items);
  
        const map = {};
        items.forEach(item => {
          map[item.file_id] = item.description || "";  
        });
        setDescriptions(map);
      });
  }, []);

  // 当开始编辑时，初始化待修改的数据
  useEffect(() => {
    if (isEditing) {
      setPendingUploads(uploads.map(item => ({ ...item })));
      setPendingDescriptions({ ...descriptions });
      setDeletedFileIds([]); // 初始化
    }
  }, [isEditing]);

  // 处理字段变化
  const handleChange = (field, item, value) => {
    setPendingUploads(prev => 
      prev.map(i =>
        i.file_id === item.file_id ? { ...i, [field]: value } : i
      )
    );
    
    // 如果是描述字段，也更新 pendingDescriptions
    if (field === "description") {
      setPendingDescriptions(prev => ({
        ...prev,
        [item.file_id]: value,
      }));
    }
  };

  // 保存修改
  const handleSaveAll = async () => {
    // 只保存修改过的行
    const updatedItems = pendingUploads.filter(item => {
      // 比较原始数据和修改后的数据
      const original = uploads.find(i => i.file_id === item.file_id);
      return (
        (item.description !== original.description) ||
        (item.is_enabled !== original.is_enabled)
      );
    });

    for (const item of updatedItems) {
      const patchData = {};

      // 只发送修改过的字段
      if (pendingDescriptions[item.file_id] !== descriptions[item.file_id]) {
        patchData.description = pendingDescriptions[item.file_id];
      }

      if (item.is_enabled !== uploads.find(i => i.file_id === item.file_id).is_enabled) {
        patchData.is_enabled = item.is_enabled;
      }

      // 如果有修改，发送请求
      if (Object.keys(patchData).length > 0) {
        await fetch(`/api/protected/uploads/${item.file_id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(patchData),
        });
      }
    }

    // 删除已标记的项
    for (const fileId of deletedFileIds) {
      await fetch(`/api/protected/uploads/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    }

    // 刷新页面
    window.location.reload();
  };

  // 取消编辑
  const handleCancel = () => {
    setIsEditing(false);
  };

  // 渲染列表数据
  const list = isEditing
    ? pendingUploads.filter(item => !deletedFileIds.includes(item.file_id))
    : uploads;

  // 标记删除
  const markForDelete = (fileId) => {
    setDeletedFileIds(prev => [...prev, fileId]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">上传管理</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-blue-400 text-white ">
          {isEditing && <th className="w-6 p-2"></th>}
            <th className="border p-2">文件名</th>
            <th className="border p-2">类型</th>
            <th className="border p-2">UUID</th>
            <th className="border p-2">启用</th>
            <th className="border p-2">描述</th>
            <th className="border p-2">创建时间</th>
            <th className="border p-2">更新时间</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.file_id} className="border group hover:bg-red-50">
            {isEditing && (
              <td className="relative w-6 text-center">
              <span
                className="absolute left-2 top-1/2 -translate-y-1/2 text-red-500 font-bold cursor-pointer opacity-70 group-hover:opacity-100"
                title="删除"
                onClick={() => markForDelete(item.file_id)}
                >
                  ×
              </span>
              </td>
            )}
              <td className="p-2">{item.name}</td>
              <td className="p-2">{item.type}</td>
              <td className="p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{item.file_id.slice(0, 6)}...</span>
                  </TooltipTrigger>
                  <TooltipContent>{item.file_id}</TooltipContent>
                </Tooltip>
              </td>
              <td className="p-2">
                <Switch
                  checked={item.is_enabled}
                  disabled={!isEditing}
                  className="data-[state=checked]:bg-green-500"
                  onCheckedChange={(checked) => {
                    if (!isEditing) return;
                    handleChange("is_enabled", item, checked);
                  }}
                />
              </td>
             <td className="p-2 align-top w-64">
            <textarea
                disabled={!isEditing}
                value={isEditing ? pendingDescriptions[item.file_id] ?? "" : descriptions[item.file_id] ?? ""}
                onChange={(e) => {
                  if (!isEditing) return;
                  handleChange("description", item, e.target.value);
                }}
                className={`w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50
                ${isEditing ? "whitespace-pre-wrap" : "overflow-hidden text-ellipsis whitespace-nowrap"}`}
                rows={1}
              />
            </td>
            <td className="p-2"><DateCell value={item.created_at} /></td>
            <td className="p-2"><DateCell value={item.updated_at} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* 右下角按钮区域 */}
      <div className="fixed bottom-6 right-6 z-10 flex gap-4">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-blue-400 text-white hover:bg-blue-500"
          >
            编辑
          </Button>
        ) : (
          <>
            <Button
              className="bg-gray-300 text-black hover:bg-gray-400"
              onClick={handleCancel}
            >
              取消
            </Button>
            
            <Button
              className="bg-blue-500 text-white hover:bg-blue-600"
              onClick={handleSaveAll}
            >
              保存
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

