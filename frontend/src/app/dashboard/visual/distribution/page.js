'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getFromCache, saveToCache } from "@/components/indexdb/db";


export default function DistributionPage() {
  const barRef = useRef(null);
  const scatterRef = useRef(null);

  const [uploads, setUploads] = useState([]);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [labelData, setLabelData] = useState([]);
  const [vecsData, setVecsData] = useState([]);

  useEffect(() => {
    // 获取当前上传数据集
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
        }
      });
  }, []);

  useEffect(() => {
    if (!currentUpload) return;
  
    const fileId = currentUpload.file_id;
  
    // 标签分布
    getFromCache("label").then((cachedLabelData) => {
      if (cachedLabelData && cachedLabelData.fileId === fileId) {
        setLabelData(cachedLabelData.data);
      } else {
        fetch(`/api/protected/visual/${fileId}/label_distribution`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            setLabelData(data);
            saveToCache("label", { fileId, data });
          });
      }
    });
  
    // 二维向量
    getFromCache("vecs").then((cachedVecsData) => {
      if (cachedVecsData && cachedVecsData.fileId === fileId) {
        setVecsData(cachedVecsData.data);
      } else {
        fetch(`/api/protected/visual/${fileId}/vecs_distribution`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            setVecsData(data);
            saveToCache("vecs", { fileId, data });
          });
      }
    });
  }, [currentUpload]);

  useEffect(() => {
    if (labelData.length > 0) {
      drawBarChart();
    }
  }, [labelData]);

  useEffect(() => {
    if (vecsData.length > 0) {
      drawScatterPlot();
    }
  }, [vecsData]);

  const drawBarChart = () => {
    const svg = d3.select(barRef.current);
    svg.selectAll("*").remove();
  
    const margin = { top: 30, right: 30, bottom: 100, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(labelData.map(d => d.label))
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(labelData, d => +d.count)])
      .range([height, 0]);
  
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
  
    g.append("g").call(d3.axisLeft(y));
  
    g.selectAll("rect")
      .data(labelData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.label))
      .attr("y", d => y(+d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(+d.count))
      .attr("fill", d => color(d.label));
  };
  
  const drawScatterPlot = () => {
    const canvas = scatterRef.current;
    const ctx = canvas.getContext('2d');
  
    const dpr = window.devicePixelRatio || 1;
  
    // 目标尺寸（CSS 显示尺寸）
    const cssWidth = 800;
    const cssHeight = 500;
  
    // 实际渲染尺寸（物理像素）
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  
    // 缩放画布，避免模糊
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
    // 清空
    ctx.clearRect(0, 0, cssWidth, cssHeight);
  
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = cssWidth - margin.left - margin.right;
    const height = cssHeight - margin.top - margin.bottom;
  
    // 比例尺
    const xExtent = d3.extent(vecsData, d => +d.x);
    const yExtent = d3.extent(vecsData, d => +d.y);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);
    const yScale = d3.scaleLinear().domain(yExtent).range([height, 0]);
    const xTicks = xScale.ticks(5);
    const yTicks = yScale.ticks(5);
  
    const color = d3.scaleOrdinal(d3.schemeTableau10);
  
    ctx.save();
    ctx.translate(margin.left, margin.top);
  
    // 坐标轴线
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
  
    // x 轴
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();
  
    // y 轴
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
  
    // x 轴刻度
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const tick of xTicks) {
      const x = xScale(tick);
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, height + 5);
      ctx.stroke();
      ctx.fillText(tick.toFixed(2), x, height + 6);
    }
  
    // y 轴刻度
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const tick of yTicks) {
      const y = yScale(tick);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(-5, y);
      ctx.stroke();
      ctx.fillText(tick.toFixed(2), -6, y);
    }
  
    // 绘制点
    for (const d of vecsData) {
      const x = xScale(+d.x);
      const y = yScale(+d.y);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = color(d.label);
      ctx.globalAlpha = 0.7;
      ctx.fill();
    }
  
    ctx.restore();
  };
  
  return (
    <div className="p-4 space-y-10">
      <h1 className="text-2xl font-bold">数据分布可视化</h1>

      {currentUpload ? (
        <>
<div>
  <h2 className="text-xl mb-2">标签分布柱状图</h2>
  <div className="flex space-x-6">
    <svg ref={barRef} width={800} height={400}></svg>
    <div className="text-sm overflow-y-auto max-h-[400px]">
      <table className="table-auto border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1 border">标签</th>
            <th className="px-2 py-1 border">数量</th>
          </tr>
        </thead>
        <tbody>
          {labelData.map((d, i) => (
            <tr key={i}>
              <td className="px-2 py-1 border text-nowrap">{d.label}</td>
              <td className="px-2 py-1 border text-right">{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>


          <div>
            <h2 className="text-xl mb-2">二维向量散点图</h2>
            <canvas ref={scatterRef} width={800} height={500}></canvas>
          </div>
        </>
      ) : (
        <p>加载中...</p>
      )}
    </div>
  );
}
