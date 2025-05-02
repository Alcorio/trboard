'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';


export default function TrainingMetricsPage() {
    const lineChartRef = useRef(null);
    const barChartRef = useRef(null);
    const matrixChartRef = useRef(null);

    const [accuracyData, setAccuracyData] = useState([]);
    const [detailedData, setDetailedData] = useState([]);
    const [selectedEpoch, setSelectedEpoch] = useState('epoch-0'); // 追踪epoch


    useEffect(() => {
        fetch('/accuracy_result.csv')
            .then(res => res.text())
            .then(text => {
                const parsed = d3.csvParse(text, d => ({
                    epoch: d.epoch.trim(),
                    accuracy: +d.accuracy
                }));
                setAccuracyData(parsed);
            });
    }, []);
    useEffect(() => {
        if (accuracyData.length > 0) drawAccuracyLineChart();
      }, [accuracyData]);

    useEffect(() => {
        fetch('/accuracy_detailed_predictions.csv')
            .then(res => res.text())
            .then(rawText => {
                // 1. 去掉 BOM
                const text = rawText.replace(/^\uFEFF/, '');

                // 2. 探测分隔符 (TSV vs CSV)
                const headerLine = text.split('\n')[0];
                const delimiter = headerLine.includes('\t') ? '\t' : ',';
                console.log('Detected delimiter:', delimiter);
                console.log('Header columns:', headerLine.split(delimiter));

                // 3. 用对应的解析器拿到临时数据 & 列名
                const temp = delimiter === '\t'
                    ? d3.tsvParse(text)
                    : d3.csvParse(text);
                console.log('Parsed columns:', temp.columns);

                // 4. 动态找原始列名，然后做类型/字段转换
                const parsed = temp.map(row => {
                    const findKey = name =>
                        temp.columns.find(c => c.trim().toLowerCase() === name);
                    const epochKey = findKey('epoch');
                    const batchKey = findKey('batch_id');
                    const sampleKey = findKey('sample_id');
                    const trueKey = findKey('true_label');
                    const predKey = findKey('predicted_label');
                    const corrKey = findKey('is_correct');

                    return {
                        epoch: (row[epochKey] || '').trim(),
                        batch_id: +row[batchKey],
                        sample_id: +row[sampleKey],
                        true_label: +row[trueKey],
                        predicted_label: +row[predKey],
                        is_correct: (row[corrKey] || '').trim().toUpperCase() === 'TRUE',
                    };
                });

                console.log('First parsed row:', parsed[0]);
                setDetailedData(parsed);
            })
            .catch(err => console.error(err));
    }, []);


    useEffect(() => {
        if (detailedData.length > 0) {
            drawCorrectnessBarChart();
        }
    }, [detailedData]);

    useEffect(() => {
        if (detailedData.length > 0 && selectedEpoch) {
            drawConfusionMatrix(selectedEpoch);
        }
    }, [selectedEpoch, detailedData]);

    const drawAccuracyLineChart = () => {
        const svg = d3.select(lineChartRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 50 },
            width = 800 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scalePoint()
            .domain(accuracyData.map(d => d.epoch))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
        g.append('g').call(d3.axisLeft(y));

        const line = d3.line()
            .x(d => x(d.epoch))
            .y(d => y(d.accuracy));

        g.append('path')
            .datum(accuracyData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', line);

        g.selectAll('circle')
            .data(accuracyData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.epoch))
            .attr('cy', d => y(d.accuracy))
            .attr('r', 4)
            .attr('fill', 'steelblue');
    };

    // **修改：将堆叠柱状图改为分组柱状图**
    const drawCorrectnessBarChart = () => {
        const svg = d3.select(barChartRef.current);
        svg.selectAll('*').remove();

        const width = 800;
        const height = 300;
        const margin = { top: 20, right: 120, bottom: 50, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);


        // 按 epoch 汇总正确/错误数
        const epochs = Array.from(new Set(detailedData.map(d => d.epoch)));
        const data = epochs.map(epoch => {
            const items = detailedData.filter(d => d.epoch === epoch);
            return {
                epoch,
                correct: items.filter(d => d.is_correct).length,
                incorrect: items.filter(d => !d.is_correct).length,
            };

        });

        // X 轴：外层刻度为 epoch
        const x0 = d3.scaleBand()
            .domain(epochs)
            .range([0, innerWidth])
            .padding(0.2);

        // X 轴：内层刻度为 correct / incorrect
        const keys = ['correct', 'incorrect'];
        const x1 = d3.scaleBand()
            .domain(keys)
            .range([0, x0.bandwidth()])
            .padding(0.1);

        // Y 轴：0 到各 epoch 中最大值
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(d.correct, d.incorrect))])
            .nice()
            .range([innerHeight, 0]);

        // 颜色
        const color = d3.scaleOrdinal()
            .domain(['correct', 'incorrect'])
            //  .range(['#C8E6C9', '#FFCDD2']);  // 浅绿色 和 浅红色
            .range(['#81C784', '#E57373']); // 中度绿 & 中度红
        // .range(['rgba(76, 175, 80, 0.4)', 'rgba(244, 67, 54, 0.4)']);  // 添加透明度

        // 绘制坐标轴
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x0));

        g.append('g')
            .call(d3.axisLeft(y));

        // 分组柱状绘制
        const epochGroups = g.selectAll('g.epoch-group')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'epoch-group')
            .attr('transform', d => `translate(${x0(d.epoch)},0)`);

        epochGroups.selectAll('rect')
            .data(d => keys.map(key => ({ key, value: d[key] })))
            .enter()
            .append('rect')
            .attr('x', d => x1(d.key))
            .attr('y', d => y(d.value))
            .attr('width', x1.bandwidth())
            .attr('height', d => innerHeight - y(d.value))
            .attr('fill', d => color(d.key));
        // 添加每个柱子上方的数字标签
        epochGroups.selectAll('text')
            .data(d => keys.map(key => ({ key, value: d[key] })))
            .enter()
            .append('text')
            .attr('x', d => x1(d.key) + x1.bandwidth() / 2)
            .attr('y', d => y(d.value) - 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#333')
            .text(d => d.value);
        // 添加图例（legend）
        const legend = g.append('g')
            .attr('transform', `translate(${innerWidth + 10}, 0)`);

        const legendItems = [
            { label: '正确 (Correct)', color: '#81C784' },
            { label: '错误 (Incorrect)', color: '#E57373' }
        ];

        legend.selectAll('rect')
            .data(legendItems)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', (_, i) => i * 20)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => d.color);

        legend.selectAll('text')
            .data(legendItems)
            .enter()
            .append('text')
            .attr('x', 20)
            .attr('y', (_, i) => i * 20 + 12)
            .text(d => d.label)
            .attr('font-size', '12px')
            .attr('fill', '#444');
    };

    const drawConfusionMatrix = (epoch) => {
        const svg = d3.select(matrixChartRef.current);
        svg.selectAll('*').remove();

        const filtered = detailedData.filter(d => d.epoch === epoch);
        const labels = Array.from(new Set(filtered.map(d => d.true_label).concat(filtered.map(d => d.predicted_label)))).sort();

        const matrix = Array.from({ length: labels.length }, () => Array(labels.length).fill(0));
        const labelToIndex = Object.fromEntries(labels.map((l, i) => [l, i]));

        filtered.forEach(d => {
            const i = labelToIndex[d.true_label];
            const j = labelToIndex[d.predicted_label];
            matrix[i][j] += 1;
        });

        const cellSize = 20;
        const g = svg.append('g').attr('transform', `translate(80, 40)`);
        const color = d3.scaleSequential(d3.interpolateOrRd)
            .domain([0, d3.max(matrix.flat()) || 1]);

        g.selectAll('rect')
            .data(matrix.flat())
            .enter()
            .append('rect')
            .attr('x', (_, i) => (i % labels.length) * cellSize)
            .attr('y', (_, i) => Math.floor(i / labels.length) * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', d => color(d));

        g.selectAll('text')
            .data(matrix.flat())
            .enter()
            .append('text')
            .attr('x', (_, i) => (i % labels.length) * cellSize + cellSize / 2)
            .attr('y', (_, i) => Math.floor(i / labels.length) * cellSize + cellSize / 2 + 4)
            .text(d => d > 0 ? d : '')
            .attr('font-size', 10)
            .attr('text-anchor', 'middle');

        // 轴标签
        const axis = svg.append('g');
        axis.selectAll('.true-label')
            .data(labels)
            .enter()
            .append('text')
            .attr('x', 75)
            .attr('y', (_, i) => 40 + i * cellSize + cellSize / 2 + 4)
            .text(d => d)
            .attr('text-anchor', 'end')
            .attr('font-size', 10);

        axis.selectAll('.predicted-label')
            .data(labels)
            .enter()
            .append('text')
            .attr('x', (_, i) => 80 + i * cellSize + cellSize / 2)
            .attr('y', 30)
            .text(d => d)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10);
    };

    return (
        <div className="p-6 space-y-10">
            <h1 className="text-2xl font-bold">训练过程指标可视化</h1>

            <div>
                <h2 className="text-xl mb-2">Accuracy 随 Epoch 变化</h2>
                <svg ref={lineChartRef} width={800} height={300}></svg>
            </div>

            <div>
                <h2 className="text-xl mb-2">每 Epoch 正确/错误分类统计（分组柱状图）</h2>
                <svg ref={barChartRef} width={800} height={300}></svg>
            </div>

            <div>
                <h2 className="text-xl mb-2">混淆矩阵（{selectedEpoch}）</h2>
                <div className="mb-2 space-x-2">
                    {Array.from(new Set(detailedData.map(d => d.epoch))).map(epoch => (
                        <button
                            key={epoch}
                            onClick={() => setSelectedEpoch(epoch)}
                            className={`px-2 py-1 text-sm border rounded ${selectedEpoch === epoch
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-white text-gray-600'
                                }`}
                        >
                            {epoch}
                        </button>
                    ))}
                </div>
                <svg ref={matrixChartRef} width={800} height={500}></svg>
            </div>

        </div>
    );
}
