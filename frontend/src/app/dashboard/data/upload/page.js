'use client';

import { useEffect, useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import DateCell from "@/components/datecell";// 统一时间格式 chrome环境和edge如果语言地区不一样会有差别
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function DataUploadPage() {
  const [uploads, setUploads] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [pendingDescriptions, setPendingDescriptions] = useState({});
  const [deletedFileIds, setDeletedFileIds] = useState([]);


  useEffect(() => {
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
        const items = data.data || [];
        setUploads(items);
  
        const map = {};
        items.forEach(item => {
          map[item.file_id] = item.description || "";  
        });
        setDescriptions(map);
      });
  }, []);

  useEffect(() => {
    if (isEditing) {
      setPendingUploads(uploads.map(item => ({ ...item })));
      setPendingDescriptions({ ...descriptions });
      setDeletedFileIds([]); // 初始化
    }
  }, [isEditing]);

  const handleSaveAll = async () => {
    // 保存描述和启用状态
    // for (const fileId in pendingDescriptions) // PATCH部分更新
    //   if (!deletedFileIds.includes(fileId))  {
    //     await fetch(`/api/protected/uploads/${fileId}/description`, {
    //       method: "PATCH",
    //       headers: { 
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${localStorage.getItem("token")}`,
    //       },
    //       body: JSON.stringify({ description: pendingDescriptions[fileId] }),
    //   });
    // }

    // for (const item of pendingUploads)
    //   if (!deletedFileIds.includes(item.file_id)) {
    //     await fetch(`/api/protected/uploads/${item.file_id}/enable`, {
    //       method: "PATCH",
    //       headers: { 
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${localStorage.getItem("token")}`,
    //       },
    //       body: JSON.stringify({ is_enabled: item.is_enabled }),
    //   });
    // }
    for (const item of pendingUploads) {
      if (!deletedFileIds.includes(item.file_id)) {
        await fetch(`/api/protected/uploads/${item.file_id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            description: pendingDescriptions[item.file_id],
            is_enabled: item.is_enabled,
          }),
        });
      }
    }

    // 删除已标记的项
    for (const fileId of deletedFileIds) {
      await fetch(`/api/protected/uploads/${fileId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
    }
    
    // 刷新页面
    window.location.reload();
    // setUploads(pendingUploads);
    // setDescriptions(pendingDescriptions);
    // setIsEditing(false);

  };

  const handleCancel = () => {
    setIsEditing(false);
  };

//   const list = isEditing ? pendingUploads : uploads;
    const list = isEditing
    ? pendingUploads.filter(item => !deletedFileIds.includes(item.file_id))
    : uploads;

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
                  // onCheckedChange={() => toggleEnabled(item.file_id, item.is_enabled)}
                  onCheckedChange={(checked) => {
                    if (!isEditing) return;
                    setPendingUploads(prev =>
                      prev.map(i =>
                        i.file_id === item.file_id ? { ...i, is_enabled: checked } : i
                      )
                    );
                  }}
                />
              </td>
             <td className="p-2 align-top w-64">
            <textarea
                disabled={!isEditing}
                value={
                isEditing
                    ? pendingDescriptions[item.file_id] ?? ""
                    : descriptions[item.file_id] ?? ""
                }
                onChange={(e) => {
                if (!isEditing) return;
                setPendingDescriptions({
                    ...pendingDescriptions,
                    [item.file_id]: e.target.value,
                });
                }}
                className={`w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50
                ${isEditing ? "whitespace-pre-wrap" : "overflow-hidden text-ellipsis whitespace-nowrap"}
                `}
                rows={1}
                style={{
                lineHeight: "1.4",
                minHeight: "2rem",
                maxHeight: "6rem",
                }}
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
  // 
}
