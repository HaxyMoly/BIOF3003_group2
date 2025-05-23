"use client"
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ECGDataPoint {
  timestamp: number;
  value: number;
}

interface ECGChartProps {
  ecgData: ECGDataPoint[];
  rPeaks?: number[]; // R波峰值索引
  sPeaks?: number[]; // S波峰值索引
}

const ECGChart: React.FC<ECGChartProps> = ({ ecgData, rPeaks = [], sPeaks = [] }) => {
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

  // 创建R波和S波的散点数据
  const rPeakPoints: { x: number; y: number }[] = [];
  const sPeakPoints: { x: number; y: number }[] = [];
  
  // 只处理最近1000个数据点中的R波和S波
  const startIndex = Math.max(0, ecgData.length - 1000);
  
  // 找出在当前显示范围内的R波点
  rPeaks.forEach(peakIndex => {
    if (peakIndex >= startIndex && peakIndex < startIndex + 1000) {
      const relativeIndex = peakIndex - startIndex;
      if (relativeIndex >= 0 && relativeIndex < dataToShow.length) {
        rPeakPoints.push({
          x: relativeIndex,
          y: dataToShow[relativeIndex].value
        });
      }
    }
  });
  
  // 找出在当前显示范围内的S波点
  sPeaks.forEach(peakIndex => {
    if (peakIndex >= startIndex && peakIndex < startIndex + 1000) {
      const relativeIndex = peakIndex - startIndex;
      if (relativeIndex >= 0 && relativeIndex < dataToShow.length) {
        sPeakPoints.push({
          x: relativeIndex,
          y: dataToShow[relativeIndex].value
        });
      }
    }
  });

  const ecgChartData = {
    labels: dataToShow.map((point) => formatTimestamp(point.timestamp)),
    datasets: [
      {
        label: 'ECG',
        data: dataToShow.map((point, index) => ({ x: index, y: point.value })),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'R-Peak',
        data: rPeakPoints,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgb(255, 99, 132)',
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
      },
      {
        label: 'S-Peak',
        data: sPeakPoints,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgb(54, 162, 235)',
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
        text: 'Real-time ECG',
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            return `${datasetLabel}: ${value.toFixed(2)} µV`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Sample Index',
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value: any) {
            if (value >= 0 && value < dataToShow.length) {
              return formatTimestamp(dataToShow[value].timestamp);
            }
            return '';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y: {
        title: {
          display: true,
          text: 'Voltage (µV)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
    },
  };

  // Handle empty data gracefully
  if (!Array.isArray(ecgData) || ecgData.length === 0) {
    return <p className="text-gray-500">No ECG data</p>;
  }

  return (
    <div className="ecg-container" style={{ width: '100%', height: '400px', maxWidth: '1000px' }}>
      <Line options={chartOptions} data={ecgChartData} />
    </div>
  );
};

export default ECGChart;
