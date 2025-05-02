'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useMemo } from 'react';

export default function LossPage() {
  const lineCanvasRef = useRef(null);
  const heatmapRef = useRef(null);
  const meanChartRef = useRef(null);

  const [lossData, setLossData] = useState([]);
  const [inputId, setInputId] = useState('');
  const [displayedIds, setDisplayedIds] = useState([]);
  const [queryId, setQueryId] = useState('');   // NEW —— 查询输入
  const [queryRes, setQueryRes] = useState(null); // NEW —— 查询结果

  // 热力图状态
  const [heatmapPage, setHeatmapPage] = useState(0);
  const [jumpPage, setJumpPage] = useState('');
  const [sortedData, setSortedData] = useState(null);
  const [sortEpoch, setSortEpoch] = useState('epoch-4');   // 排序按钮状态
  const pageSize = 30; // 每页显示样本数，可根据需要调整

  const epochs = useMemo(                        // NEW － 拿到 epoch 列表
    () => (lossData.length ? Object.keys(lossData[0]).filter(k => k !== 'sample_idx') : []),
    [lossData]
  );

  useEffect(() => {
    fetch('/losses_train_with_noise.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = d3.csvParse(text);
        setLossData(parsed);
        setDisplayedIds(parsed.slice(0, 20).map(d => d['sample_idx']));
      });
  }, []);

  const drawLineCanvas = () => {
    const canvas = lineCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 800;
    const height = 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!lossData.length || !displayedIds.length) return;

    const margin = { top: 30, right: 30, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const epochs = Object.keys(lossData[0]).filter(k => k !== 'sample_idx');
    const xScale = d3.scalePoint().domain(epochs).range([0, innerWidth]);
    const allValues = lossData.flatMap(d => epochs.map(e => +d[e]));
    const yScale = d3.scaleLinear().domain([0, d3.max(allValues)]).range([innerHeight, 0]);

    // draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    // x-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + innerHeight);
    ctx.lineTo(margin.left + innerWidth, margin.top + innerHeight);
    ctx.stroke();
    // x ticks & labels
    epochs.forEach(e => {
      const x = margin.left + xScale(e);
      const y = margin.top + innerHeight;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '12px sans-serif';
      ctx.fillText(e, x, y + 5);
    });
    // y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + innerHeight);
    ctx.stroke();
    // y ticks & labels
    const yTicks = yScale.ticks(5);
    yTicks.forEach(v => {
      const y = margin.top + yScale(v);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left - 5, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '12px sans-serif';
      ctx.fillText(v.toFixed(2), margin.left - 7, y);
    });

    // draw lines
    const color = d3.scaleOrdinal(d3.schemeTableau10);
    displayedIds.forEach((id, i) => {
      const sample = lossData.find(d => d['sample_idx'] === id);
      if (!sample) return;
      ctx.beginPath();
      ctx.strokeStyle = color(i);
      ctx.lineWidth = 1.5;
      epochs.forEach((e, j) => {
        const x = margin.left + xScale(e);
        const y = margin.top + yScale(+sample[e]);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  // 排序操作
  const handleSort = (type) => {
    if (!lossData.length) return;
    const key = sortEpoch;
    const sorted = [...lossData].sort((a, b) =>
      type === 'top' ? +b[key] - +a[key] : +a[key] - +b[key]
    );
    setSortedData(sorted);
    setHeatmapPage(0);
    // requestAnimationFrame(drawHeatmapCanvas);  // ← 立即重绘
  };
  // 绘制热力图
  const drawHeatmapCanvas = () => {
    const data = sortedData || lossData;
    if (!data.length) return;

    const canvas = heatmapRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 1000;
    const height = 600;
    const margin = { top: 20, right: 200, bottom: 40, left: 140 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // resize canvas
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const epochs = Object.keys(data[0]).filter(k => k !== 'sample_idx');
    const start = heatmapPage * pageSize;
    const page = data.slice(start, start + pageSize);
    const rows = page.length;
    const cellW = innerW / epochs.length;
    const cellH = innerH / rows;
    

    const allVals = page.flatMap(d => epochs.map(e => +d[e]));
    const maxVal = d3.max(allVals);
    const minVal = d3.min(allVals);
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([d3.min(allVals), d3.max(allVals)]);

    // 绘制热图格子
    page.forEach((row, i) => {
      epochs.forEach((e, j) => {
        ctx.fillStyle = colorScale(+row[e]);
        ctx.fillRect(
          margin.left + j * cellW,
          margin.top + i * cellH,
          cellW,
          cellH
        );
      });
    });

    // X 轴
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + innerH);
    ctx.lineTo(margin.left + innerW, margin.top + innerH);
    ctx.stroke();
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'top';
    // ctx.font = '12px sans-serif';
    // epochs.forEach((e, j) => {
    ctx.save();                           // ← 保存状态
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#000';               // ← 强制黑色
    epochs.forEach((e, j) => {
      const x = margin.left + j * cellW + cellW / 2;
      ctx.fillText(e, x, margin.top + innerH + 6);
      ctx.beginPath();
      ctx.moveTo(margin.left + j * cellW, margin.top + innerH);
      ctx.lineTo(margin.left + j * cellW, margin.top + innerH + 6);
      ctx.stroke();
    });
    ctx.restore();

    // Y 轴
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + innerH);
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#000';
    page.forEach((row, i) => {
      const y = margin.top + i * cellH + cellH / 2;
      ctx.fillText(row.sample_idx, margin.left - 8, y);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left - 6, y);
      ctx.stroke();
    });
    ctx.restore();

    // Legend
    const lx = margin.left + innerW + 20;
    const ly = margin.top;
    const lw = 20;
    const lh = innerH;
// 自上而下填充渐变条，与 colorScale 对齐
for (let i = 0; i < lh; i++) {
  const t = 1 - i / lh;  // 从上到下，1 到 0
  ctx.fillStyle = colorScale(minVal + t * (maxVal - minVal));
  ctx.fillRect(lx, ly + i, lw, 1);  // 每行1px高度
}
    ctx.strokeStyle = '#000';
    ctx.strokeRect(lx, ly, lw, lh);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(d3.max(allVals).toFixed(2), lx + lw + 6, ly);
    ctx.fillText(d3.min(allVals).toFixed(2), lx + lw + 6, ly + lh);
  };


  // 平均值+标准差图
  const drawMeanStdChart = () => {
    const svg = d3.select(meanChartRef.current);
    svg.selectAll('*').remove();
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const epochs = Object.keys(lossData[0]).filter(k => k !== 'sample_idx');

    const stats = epochs.map(e => {
      const values = lossData.map(d => +d[e]).filter(v => !isNaN(v));
      const mean = d3.mean(values);
      const std = d3.deviation(values);
      return { epoch: e, mean, std };
    });

    const x = d3.scalePoint().domain(epochs).range([0, width]);
    const y = d3.scaleLinear()
    .domain([0, d3.max(stats, d => (d.mean ?? 0) + (d.std ?? 0))])
    .range([height, 0]);

    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));
      
    g.append('path')
    .datum(stats)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2)
    .attr('d', d3.line().x(d => x(d.epoch)).y(d => y(d.mean)));
  
    g.selectAll('rect')
    .data(stats)
    .enter()
    .append('rect')
    .attr('x', d => x(d.epoch) - 10)
    .attr('y', d => {
      const lower = Math.max(d.mean - d.std, 0);
      const upper = d.mean + d.std;
      return y(upper);
    })
    .attr('height', d => {
      const lower = Math.max(d.mean - d.std, 0);
      const upper = d.mean + d.std;
      return y(lower) - y(upper);
    })
    .attr('width', 20)
    .attr('fill', 'lightblue')
    .attr('opacity', 0.5);
  
  };

  useEffect(() => {
    // if (lossData.length > 0 && displayedIds.length > 0) {
    if (lossData.length > 0) {
      drawLineCanvas();
      drawHeatmapCanvas();
      drawMeanStdChart();
    }
  }, [lossData, displayedIds, heatmapPage, sortedData]);

  const handleAdd = () => {
    if (inputId && !displayedIds.includes(inputId)) {
      setDisplayedIds([...displayedIds, inputId]);
    }
    setInputId('');
  };

  const handleRemove = (id) => {
    setDisplayedIds(displayedIds.filter(i => i !== id));
  };
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">贡献度 可视化</h1>

      <div>
        <h2 className="text-xl mb-2">样本 Loss 曲线</h2>

        {/* NEW —— 查询框 */}
        <div className="space-x-2 text-xs mb-2">
          <input
            value={queryId}
            onChange={e => setQueryId(e.target.value)}
            className="border px-2 py-1 text-xs"
            placeholder="查询 sample-id 的各 epoch loss"
          />
          <button
            onClick={() => {
              const row = lossData.find(d => d.sample_idx === queryId.trim());
              setQueryRes(row || null);
            }}
            className="bg-indigo-500 text-white px-3 py-1 rounded text-xs"
          >
            查询
          </button>
          {queryRes === null && queryId && (
            <span className="text-red-500">未找到</span>
          )}
        </div>

        {/* NEW —— 查询结果表 */}
        {queryRes && (
          <div className="overflow-x-auto mb-3">
            <table className="border text-xs">
              <thead>
                <tr>
                  <th className="border px-2 py-1">epoch</th>
                  <th className="border px-2 py-1">loss</th>
                </tr>
              </thead>
              <tbody>
                {epochs.map(ep => (
                  <tr key={ep}>
                    <td className="border px-2 py-1">{ep.replace('epoch-', '')}</td>
                    <td className="border px-2 py-1">{(+queryRes[ep]).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* NEW —— 选择 epoch */}
        <div className="space-x-2 text-xs mb-1">
          <label>排序 epoch：</label>
          <select
            value={sortEpoch}
            onChange={e => setSortEpoch(e.target.value)}
            className="border px-1 py-0.5"
          >
            {epochs.map(e => (
              <option key={e} value={e}>{e.replace('epoch-', '')}</option>
            ))}
          </select>
        </div>
        <div className="space-x-2 text-xs">
          <input
            value={inputId}
            onChange={e => setInputId(e.target.value)}
            className="border px-2 py-1 text-xs"
            placeholder="输入 sample-id"
          />
          <button
            onClick={() => {
              if (inputId && !displayedIds.includes(inputId)) {
                setDisplayedIds([...displayedIds, inputId]);
              }
              setInputId('');
            }}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
          >
            添加
          </button>

          {/* CHANGED —— 使用 sortEpoch */}
          <button
            onClick={() => {
              const key = sortEpoch;
              const sorted = [...lossData].sort((a, b) => +b[key] - +a[key]);
              setDisplayedIds(sorted.slice(0, 20).map(d => d.sample_idx));
            }}
            className="bg-green-500 text-white px-3 py-1 rounded text-xs"
          >
            Top-20&nbsp;(epoch-{sortEpoch.replace('epoch-', '')})
          </button>
          <button
            onClick={() => {
              const key = sortEpoch;
              const sorted = [...lossData].sort((a, b) => +a[key] - +b[key]);
              setDisplayedIds(sorted.slice(0, 20).map(d => d.sample_idx));
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-xs"
          >
            Bottom-20&nbsp;(epoch-{sortEpoch.replace('epoch-', '')})
          </button>
          {/* NEW —— 清除所有已选 sample */}
          <button
            onClick={() => {
              setDisplayedIds([]);
              // 若想连查询表也清空，就再加： setQueryRes(null);
            }}
            className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs"
          >
            清除
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {displayedIds.map(id => (
            <div key={id} className="bg-gray-100 px-2 py-1 rounded text-xs">
              {id} <button onClick={() => handleRemove(id)} className="text-red-500 ml-2 text-xs">×</button>
            </div>
          ))}
        </div>

        <canvas ref={lineCanvasRef}></canvas>
      </div>

      <div>
        <h1 className="text-xl mb-2">Loss 可视化 Heatmap</h1>
        <p className="mb-2 text-gray-700">
          热力图展示每个样本在不同训练轮次epoch的 loss 值，颜色由浅到深表示 loss 从低到高。
        </p>

        <div className="flex flex-nowrap items-start  scale-90 origin-top-left"> {/*overflow-x-auto 会出现滚动条*/}
          <div className="flex-none">
            <canvas ref={heatmapRef} width={600} height={240} className="border" />
          </div>
          <div className="flex-none ml-4 w-48 flex flex-col space-y-2 text-xs">
            {/* NEW —— 共享同一个 epoch 选择器（放在按钮上方） */}
            <div className="flex items-center space-x-2">
              <label>排序 epoch：</label>
              <select
                value={sortEpoch}
                onChange={e => setSortEpoch(e.target.value)}
                className="border px-1 py-0.5 flex-1"
              >
                {epochs.map(e => (
                  <option key={e} value={e}>{e.replace('epoch-', '')}</option>
                ))}
              </select>
            </div>

            {/* CHANGED —— 调用 handleSort 并更新按钮文字 */}
            <button
              onClick={() => handleSort('top')}
              className="bg-green-500 text-white px-3 py-1 rounded"
            >
              Top {pageSize}&nbsp;(epoch-{sortEpoch.replace('epoch-', '')})
            </button>
            <button
              onClick={() => handleSort('bottom')}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Bottom {pageSize}&nbsp;(epoch-{sortEpoch.replace('epoch-', '')})
            </button>
            <button onClick={() => setSortedData(null)} className="bg-gray-300 px-3 py-1 rounded">清除排序</button>

            <div className="pt-2 font-medium">翻页</div>
            <div className="flex space-x-2">
              <button
                onClick={() => setHeatmapPage(p => Math.max(p - 1, 0))}
                disabled={heatmapPage === 0}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >上一页</button>
              <span className="px-2 text-center self-center">
                {heatmapPage + 1} / {Math.ceil((sortedData || lossData).length / pageSize)}
              </span>
              <button
                onClick={() => setHeatmapPage(p => Math.min(p + 1, Math.ceil((sortedData || lossData).length / pageSize) - 1))}
                disabled={(heatmapPage + 1) * pageSize >= (sortedData || lossData).length}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
              >下一页</button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <span>跳转</span>
              <input
                type="number"
                min="1"
                max={Math.ceil((sortedData || lossData).length / pageSize)}
                value={jumpPage}
                onChange={e => setJumpPage(e.target.value)}
                className="w-16 border px-2 py-1 text-xs"
              />
              <button
                onClick={() => {
                  const n = parseInt(jumpPage, 10) - 1;
                  if (!isNaN(n) && n >= 0 && n < Math.ceil((sortedData || lossData).length / pageSize)) {
                    setHeatmapPage(n);
                  }
                }}
                className="px-2 py-1 bg-blue-200 rounded"
              >跳转</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl mb-2">平均值 + 标准差</h2>
        <div className="flex items-start space-x-6">
          <svg ref={meanChartRef} width={800} height={300}></svg>
          <div className="text-sm text-gray-700 leading-relaxed w-64">
            <p><strong>蓝色折线</strong>：表示每个训练轮次（epoch）下所有样本 loss 的平均值。</p>
            <p className="mt-2"><strong>浅蓝色矩形</strong>：表示该轮次 loss 的波动范围，即“平均值 ± 标准差”。矩形越高，波动越大。</p>
            <p className="mt-2">此图有助于观察训练过程中的稳定性与样本分布变化。</p>
          </div>
        </div>
      </div>
    </div>
  );

}
