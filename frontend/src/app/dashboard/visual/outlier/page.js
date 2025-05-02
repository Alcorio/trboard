'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

export default function OutlierPage() {
    const lineCanvasRef = useRef(null);
    const heatmapRef = useRef(null);
    const classCanvasRef = useRef(null);

    const [scdData, setScdData] = useState([]);
    const [inputId, setInputId] = useState('');
    const [displayedIds, setDisplayedIds] = useState([]);
    const [heatmapPage, setHeatmapPage] = useState(0);
    const [jumpPage, setJumpPage] = useState('');
    const [sortedData, setSortedData] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [queryId, setQueryId] = useState('');   // NEW —— 查询输入 当前sample-id 
    const [queryRes, setQueryRes] = useState(null); // NEW —— 查询结果 各epoch的值

    /* ---------- 供排序与按钮文本使用 ---------- */
    const [sortEpoch, setSortEpoch] = useState('epoch-4');   // 默认 epoch-4
    /* ------------------------------------------------------ */

    const pageSize = 30;

    /* ---------- 读取数据 ---------- */
    useEffect(() => {
        fetch('/scd_compact_by_epoch.csv')
            .then(r => r.text())
            .then(txt => {
                const parsed = d3.csvParse(txt);
                setScdData(parsed);
                setDisplayedIds(parsed.slice(0, 20).map(d => d.idx));
                const classes = [...new Set(parsed.map(d => d.class))];
                setSelectedClass(classes[0] ?? null);
            });
    }, []);

    const epochs = useMemo(
        () => (scdData.length ? Object.keys(scdData[0]).filter(k => k.startsWith('epoch')) : []),
        [scdData]
    );

    const filteredByClass = useMemo(
        () => scdData.filter(d => d.class === selectedClass),
        [scdData, selectedClass]
    );

    /* ---------- “离群度曲线” ---------- */
    const drawClassLineCanvas = () => {
        const canvas = classCanvasRef.current;
        if (!canvas || !filteredByClass.length) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = 800, height = 320;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const margin = { top: 30, right: 30, bottom: 45, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const yMax = d3.max(filteredByClass, d => d3.max(epochs, e => +d[e]));
        const xScale = d3.scalePoint().domain(epochs).range([0, w]);
        const yScale = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

        /* 线条 */
        const color = d3.scaleOrdinal(d3.schemeTableau10);
        filteredByClass.forEach((row, i) => {
            ctx.beginPath();
            ctx.strokeStyle = color(i);
            ctx.lineWidth = 1.2;
            epochs.forEach((e, j) => {
                const x = margin.left + xScale(e);
                const y = margin.top + yScale(+row[e]);
                j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.stroke();
        });

        /* 轴线 & 刻度 */
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        // X 轴
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + h);
        ctx.lineTo(margin.left + w, margin.top + h);
        ctx.stroke();
        epochs.forEach(e => {
            const x = margin.left + xScale(e);
            const y = margin.top + h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 4);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = '12px sans-serif';
            ctx.fillText(e, x, y + 6);
        });
        // Y 轴
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + h);
        ctx.stroke();
        const yTicks = yScale.ticks(5);
        yTicks.forEach(v => {
            const y = margin.top + yScale(v);
            ctx.beginPath();
            ctx.moveTo(margin.left - 4, y);
            ctx.lineTo(margin.left, y);
            ctx.stroke();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '12px sans-serif';
            ctx.fillText(v.toFixed(2), margin.left - 6, y);
        });
        /* 轴标题 */
        ctx.save();
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        // Y-axis title
        ctx.translate(margin.left - 45, margin.top + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('离群度 outlier', 0, 0);
        ctx.restore();
    };

    /* ---------- 样本离群度曲线 ---------- */
    const drawLineCanvas = () => {
        const canvas = lineCanvasRef.current;
        if (!canvas || !scdData.length || !displayedIds.length) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = 800, height = 320;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const margin = { top: 30, right: 30, bottom: 45, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const yMax = d3.max(scdData, d => d3.max(epochs, e => +d[e]));
        const xScale = d3.scalePoint().domain(epochs).range([0, w]);
        const yScale = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

        /* 轴 */
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + h);
        ctx.lineTo(margin.left + w, margin.top + h);
        ctx.stroke();
        epochs.forEach(e => {
            const x = margin.left + xScale(e);
            const y = margin.top + h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 4);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = '12px sans-serif';
            ctx.fillText(e, x, y + 6);
        });
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + h);
        ctx.stroke();
        yScale.ticks(5).forEach(v => {
            const y = margin.top + yScale(v);
            ctx.beginPath();
            ctx.moveTo(margin.left - 4, y);
            ctx.lineTo(margin.left, y);
            ctx.stroke();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '12px sans-serif';
            ctx.fillText(v.toFixed(2), margin.left - 6, y);
        });

        /* 曲线 */
        const color = d3.scaleOrdinal(d3.schemeTableau10);
        displayedIds.forEach((id, i) => {
            const row = scdData.find(d => d.idx === id);
            if (!row) return;
            ctx.beginPath();
            ctx.strokeStyle = color(i);
            ctx.lineWidth = 1.5;
            epochs.forEach((e, j) => {
                const x = margin.left + xScale(e);
                const y = margin.top + yScale(+row[e]);
                j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.stroke();
        });
    };

    /* ---------- 离群度热力图 ---------- */
    const drawHeatmapCanvas = () => {
        const source = sortedData ?? filteredByClass;
        if (!source.length) return;

        const canvas = heatmapRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = 1000, height = 620;
        const margin = { top: 20, right: 220, bottom: 40, left: 160 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const start = heatmapPage * pageSize;
        const page = source.slice(start, start + pageSize);
        const rows = page.length;
        const cellW = w / epochs.length;
        const cellH = h / rows;

        const pageVals = page.flatMap(r => epochs.map(e => +r[e]));
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([d3.min(pageVals), d3.max(pageVals)]);

        /* 网格 */
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

        /* X 轴标签 */
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#000';
        epochs.forEach((e, j) => {
            const x = margin.left + j * cellW + cellW / 2;
            ctx.fillText(e, x, margin.top + h + 6);
        });

        /* 每一行显示样本 idx */
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        page.forEach((row, i) => {
            const y = margin.top + i * cellH + cellH / 2;
            ctx.fillText(row.idx, margin.left - 8, y);
        });

        /* 右侧色标 */

        // const pageVals = page.flatMap(r => epochs.map(e => +r[e]));
        const maxVal = d3.max(pageVals);
        const minVal = d3.min(pageVals);

        if (pageVals.length > 0 && maxVal !== undefined && minVal !== undefined) {
            const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([minVal, maxVal]);
            const lx = margin.left + w + 25;
            const ly = margin.top;
            const lw = 22, lh = h;
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
            ctx.font = '12px sans-serif';
            ctx.fillText(maxVal.toFixed(2), lx + lw + 6, ly);
            ctx.fillText(minVal.toFixed(2), lx + lw + 6, ly + lh);

        }

    };

    /* ---------- 重绘依赖 ---------- */
    useEffect(() => {
        if (!scdData.length) return;
        drawClassLineCanvas();
        drawLineCanvas();
        drawHeatmapCanvas();
    }, [scdData, displayedIds, heatmapPage, sortedData, selectedClass, sortEpoch]);

    /* ---------- 根据 sortEpoch 生成排序器 ---------- */
    const sortByEpoch = (asc = false) => {
        const copy = [...scdData].sort((a, b) =>
            asc ? +a[sortEpoch] - +b[sortEpoch] : +b[sortEpoch] - +a[sortEpoch]
        );
        setSortedData(copy);
        setHeatmapPage(0);
    };

    const topNthIds = asc => {
        const copy = [...filteredByClass].sort((a, b) =>
            asc ? +a[sortEpoch] - +b[sortEpoch] : +b[sortEpoch] - +a[sortEpoch]
        );
        setDisplayedIds(copy.slice(0, 20).map(d => d.idx));
    };

    const source = sortedData ?? filteredByClass;
    const totalPagesCurrentClass = Math.ceil(source.length / pageSize);  // 热力图页数
    const totalPagesAll = Math.ceil(scdData.length / pageSize);

    useEffect(() => {
        const maxPage = Math.max(0, totalPagesCurrentClass - 1);
        if (heatmapPage > maxPage) {
            setHeatmapPage(maxPage);
        }
    }, [heatmapPage, totalPagesCurrentClass]);

    /* ---------- UI ---------- */
    return (
        <div className="p-4 space-y-6">
            <h1 className="text-2xl font-bold">离群度 可视化</h1>


            {/* ===== 图 1 ===== */}
            <div>
                <h2 className="text-xl mb-2">某一类别的离群度曲线</h2>

                {/* 选择类别 */}
                <div className="flex space-x-2 text-sm items-center">
                    <span>当前类别：</span>
                    {[...new Set(scdData.map(d => d.class))]
                        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                        .map(cls => (
                            <button
                                key={cls}
                                onClick={() => setSelectedClass(cls)}
                                className={`px-2 py-1 rounded border ${cls === selectedClass ? 'bg-blue-200' : 'bg-white'}`}
                            >
                                {cls}
                            </button>
                        ))}
                </div>
                <canvas ref={classCanvasRef}></canvas>
            </div>

            {/* ===== 图 2 ===== */}
            <div>
                <h2 className="text-xl mb-2">样本离群度曲线</h2>

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
                            const row = scdData.find(d => d.idx === queryId.trim());
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
                                    <th className="border px-2 py-1">scd</th>
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

                {/* 🔍 NEW: epoch 选择器 */}
                <div className="space-x-2 text-xs mb-2">
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

                {/* 控件 */}
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

                    {/* CHANGED: 使用 sortEpoch */}
                    <button
                        onClick={() => topNthIds(false)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs"
                    >
                        Top-20 (epoch-{sortEpoch.replace('epoch-', '')})
                    </button>
                    <button
                        onClick={() => topNthIds(true)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs"
                    >
                        Bottom-20 (epoch-{sortEpoch.replace('epoch-', '')})
                    </button>

                    +          {/* NEW —— 清除已选曲线 */}
                    <button
                        onClick={() => {
                            setDisplayedIds([]);
                            setQueryRes(null);         // 若要一起清掉查询表
                        }}
                        className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs"
                    >
                        清除
                    </button>
                </div>

                {/* tag chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                    {displayedIds.map(id => (
                        <span key={id} className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {id}
                            <button
                                onClick={() => setDisplayedIds(displayedIds.filter(i => i !== id))}
                                className="text-red-500 ml-2 text-xs"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>

                <canvas ref={lineCanvasRef}></canvas>
            </div>

            {/* ===== 图 3 ===== */}
            <div>
                <h2 className="text-xl mb-2">离群度热力图</h2>

                {/* 🔍 NEW: epoch 选择器 + 排序按钮 */}
                <div className="flex flex-nowrap items-start space-x-6 scale-90 origin-top-left">
                    <div className="flex-none relative">
                        <canvas ref={heatmapRef} width={600} height={240} className="border" />
                    </div>

                    <div className="flex-none w-52 flex flex-col space-y-2 text-xs">
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

                        <button
                            onClick={() => sortByEpoch(false)}
                            className="bg-green-500 text-white px-3 py-1 rounded"
                        >
                            Top {pageSize} (epoch-{sortEpoch.replace('epoch-', '')})
                        </button>
                        <button
                            onClick={() => sortByEpoch(true)}
                            className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                            Bottom {pageSize} (epoch-{sortEpoch.replace('epoch-', '')})
                        </button>
                        <button
                            onClick={() => { setSortedData(null); setHeatmapPage(0); }}
                            className="bg-gray-300 px-3 py-1 rounded"
                        >
                            清除排序
                        </button>

                        {/* 翻页 */}
                        <div className="pt-2 font-medium">翻页</div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setHeatmapPage(p => Math.max(p - 1, 0))}
                                disabled={heatmapPage === 0}
                                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <span className="px-2 self-center">
                                {/* {heatmapPage + 1} / {Math.ceil((sortedData ?? scdData).length / pageSize)} */}
                                {heatmapPage + 1} / {totalPagesCurrentClass}（当前类） / {totalPagesAll}（总）
                            </span>
                            <button
                                onClick={() => {
                                    const maxPage = Math.ceil((sortedData ?? filteredByClass).length / pageSize) - 1;
                                    if (heatmapPage < maxPage) {
                                        setHeatmapPage(heatmapPage + 1);
                                    }
                                }}
                                disabled={heatmapPage >= Math.ceil((sortedData ?? filteredByClass).length / pageSize) - 1}
                                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                下一页
                            </button>

                        </div>

                        {/* 跳转 */}
                        <div className="flex items-center space-x-2 pt-2">
                            <span>跳转</span>
                            <input
                                type="number"
                                min="1"
                                max={Math.ceil((sortedData ?? scdData).length / pageSize)}
                                value={jumpPage}
                                onChange={e => setJumpPage(e.target.value)}
                                className="w-16 border px-2 py-1"
                            />
                            <button
                                onClick={() => {
                                    const n = +jumpPage - 1;
                                    if (n >= 0 && n < Math.ceil((sortedData ?? scdData).length / pageSize)) {
                                        setHeatmapPage(n);
                                    }
                                }}
                                className="px-2 py-1 bg-blue-200 rounded"
                            >
                                跳转
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
