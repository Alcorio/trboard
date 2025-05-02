'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function RunningScript() {
  const [uploads, setUploads] = useState([]);
  const [enabledScripts, setEnabledScripts] = useState([]);
  const [enabledDataset, setEnabledDataset] = useState(null);
  const [output, setOutput] = useState("");

  useEffect(() => {
    fetch("/api/protected/uploads", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const items = data.data || [];
        setUploads(items);

        const scripts = items.filter(
          (item) => item.type === "script" && item.is_enabled
        );
        setEnabledScripts(scripts);

        const dataset = items.find(
          (item) => item.type === "data" && item.is_enabled
        );
        setEnabledDataset(dataset || null);
      });
  }, []);

  // 构造并发送请求
  const runScriptRequest = async (signal) => {
    const categorized = {
      distribution: [],
      accuracy: [],
      loss: [],
      scd: [],
      data: enabledDataset?.file_id || null,
    };

    enabledScripts.forEach((script) => {
      const name = script.name.toLowerCase();
      if (name.includes("distribution")) categorized.distribution.push(script.file_id);
      if (name.includes("accuracy")) categorized.accuracy.push(script.file_id);
      if (name.includes("loss")) categorized.loss.push(script.file_id);
      if (name.includes("scd")) categorized.scd.push(script.file_id);
    });

    const res = await fetch("/api/protected/scripts/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(categorized),
      signal,
    });

    const result = await res.json();
    if (res.ok) {
      setOutput(result.message || "脚本执行成功！");
    } else {
      setOutput(result.error || "脚本执行失败！");
    }
  };

  const handleRunScript = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
      await runScriptRequest(controller.signal);
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        const retry = window.confirm("请求超时，是否重试？");
        if (retry) {
          handleRunScript(); // 递归重试
        } else {
          setOutput("请求超时，已取消。");
        }
      } else {
        console.error(err);
        setOutput("请求失败，网络或服务异常！");
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">脚本执行</h1>

      {enabledDataset ? (
        <div className="text-gray-700 mb-2">
          当前启用的数据集：<span className="font-medium">{enabledDataset.name}</span>
        </div>
      ) : (
        <p className="text-gray-500 mb-2">未检测到启用的数据集。</p>
      )}

      {enabledScripts.length > 0 ? (
        <div className="text-gray-700 mb-4">
          检测到当前启用脚本为：
          <ul className="list-disc list-inside mt-1 text-sm">
            {enabledScripts.map((script) => (
              <li key={script.file_id}>{script.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 mb-4">未检测到启用的脚本。</p>
      )}

      <Button
        onClick={handleRunScript}
        className="bg-blue-500 text-white hover:bg-blue-600"
      >
        执行脚本
      </Button>

      {output && (
        <div className="mt-6 p-4 border border-gray-300 rounded bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
          {output}
        </div>
      )}
    </div>
  );
}
