"use client"
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ECGDataPoint {
  timestamp: number;
  value: number;
}

interface RPeaksChartProps {
  ecgData: ECGDataPoint[];
  rPeaks: number[];
}

const RPeaksChart: React.FC<RPeaksChartProps> = ({ ecgData, rPeaks }) => {
  const dataToShow = ecgData.slice(-1000);
  
  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp);
      return date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');
    } catch (error) {
      console.error('Invalid timestamp:', timestamp);
      return '';
    }
  };

  // 创建R波峰值数据点
  const rPeakValues: number[] = new Array(dataToShow.length).fill(null);
  
  // 只处理最近1000个数据点中的R波
  const startIndex = Math.max(0, ecgData.length - 1000);
  
  // 找出在当前显示范围内的R波点
  rPeaks.forEach(peakIndex => {
    if (peakIndex >= startIndex && peakIndex < startIndex + 1000) {
      const relativeIndex = peakIndex - startIndex;
      if (relativeIndex >= 0 && relativeIndex < dataToShow.length) {
        rPeakValues[relativeIndex] = dataToShow[relativeIndex].value;
      }
    }
  });

  const chartData = {
    labels: dataToShow.map((point) => formatTimestamp(point.timestamp)),
    datasets: [
      {
        label: 'ECG',
        data: dataToShow.map(point => point.value),
        borderColor: 'rgba(75, 192, 192, 0.3)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'R波峰值',
        data: rPeakValues,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderWidth: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'R波峰值检测',
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (value !== null) {
              return `${datasetLabel}: ${value.toFixed(2)} µV`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: true,
          text: '时间',
        },
        ticks: {
          maxTicksLimit: 10,
          maxRotation: 0,
          autoSkip: true
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y: {
        title: {
          display: true,
          text: '电压 (µV)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
    },
  };

  // 处理空数据
  if (!Array.isArray(ecgData) || ecgData.length === 0) {
    return <p className="text-gray-500">无ECG数据</p>;
  }

  return (
    <div className="rpeaks-container" style={{ width: '100%', height: '400px', maxWidth: '1000px' }}>
      <Line options={chartOptions} data={chartData} />
    </div>
  );
};

export default RPeaksChart;