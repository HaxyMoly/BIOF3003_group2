"use client";
import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// 注册Chart.js所需组件
Chart.register(...registerables);

interface RespirationChartProps {
  respirationSignal: number[];
  rPeaks?: number[];
  sPeaks?: number[];
  samplingRate?: number;
}

const RespirationChart: React.FC<RespirationChartProps> = ({ 
  respirationSignal, 
  rPeaks = [],
  sPeaks = [],
  samplingRate = 250 // 默认采样率250Hz
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const dataBufferRef = useRef<number[]>([]);

  useEffect(() => {
    if (!chartRef.current) return;

    // 清除旧图表
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    // 初始化图表
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // 设置固定显示的数据点数量（10秒数据）
    const pointsToShow = 10 * samplingRate;
    
    // 初始化或更新数据缓冲区
    if (respirationSignal.length > 0) {
      // 如果有新数据，使用最新的数据
      const newData = respirationSignal.slice(-pointsToShow);
      
      // 修改：只显示实际数据，不填充0值
      dataBufferRef.current = newData;
      
      // 或者使用更自然的填充方式（使用第一个实际值填充）
      // if (newData.length < pointsToShow) {
      //   const fillValue = newData[0] || 0; // 使用第一个值或0
      //   dataBufferRef.current = [...Array(pointsToShow - newData.length).fill(fillValue), ...newData];
      // } else {
      //   dataBufferRef.current = newData;
      // }
    } else if (dataBufferRef.current.length === 0) {
      // 如果没有数据且缓冲区为空，初始化为0
      dataBufferRef.current = Array(pointsToShow).fill(0);
    }
    
    // 创建时间标签（秒）- 修改为只显示实际数据的时间范围
    const timeLabels = Array(dataBufferRef.current.length).fill(0).map((_, index) => 
      ((index / samplingRate) - (dataBufferRef.current.length / samplingRate)).toFixed(1)
    );
    
    // 准备R波和S波标记点数据
    const rPeakAnnotations = [];
    const sPeakAnnotations = [];
    
    // 只处理最近10秒内的标记点
    const recentRPeaks = rPeaks.filter(idx => idx >= respirationSignal.length - pointsToShow);
    const recentSPeaks = sPeaks.filter(idx => idx >= respirationSignal.length - pointsToShow);
    
    for (const rIdx of recentRPeaks) {
      const relativeIdx = rIdx - (respirationSignal.length - pointsToShow);
      if (relativeIdx >= 0 && relativeIdx < pointsToShow) {
        rPeakAnnotations.push({
          x: timeLabels[relativeIdx],
          y: dataBufferRef.current[relativeIdx]
        });
      }
    }
    
    for (const sIdx of recentSPeaks) {
      const relativeIdx = sIdx - (respirationSignal.length - pointsToShow);
      if (relativeIdx >= 0 && relativeIdx < pointsToShow) {
        sPeakAnnotations.push({
          x: timeLabels[relativeIdx],
          y: dataBufferRef.current[relativeIdx]
        });
      }
    }

    // 创建新图表
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'R-S Amplitude difference',
            data: dataBufferRef.current,
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0 // 禁用动画以提高性能
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Time (s)'
            },
            ticks: {
              maxTicksLimit: 10,
              callback: function(value) {
                // 只显示整数秒
                return Number(value) % 1 === 0 ? value : '';
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Amplitude'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
          }
        }
      }
    });

    // 添加调试信息
    console.log('呼吸信号数据长度:', respirationSignal.length);
    console.log('图表数据样本:', dataBufferRef.current.slice(0, 5));

  }, [respirationSignal, rPeaks, sPeaks, samplingRate]);

  return (
    <div className="w-full h-64">
      <canvas ref={chartRef}></canvas>
      {respirationSignal.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          等待呼吸信号数据...
        </div>
      )}
    </div>
  );
};

export default RespirationChart;