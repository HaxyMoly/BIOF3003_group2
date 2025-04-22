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
}

const ECGChart: React.FC<ECGChartProps> = ({ ecgData }) => {
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

  const ecgChartData = {
    labels: dataToShow.map((point) => formatTimestamp(point.timestamp)),
    datasets: [
      {
        label: 'ECG',
        data: dataToShow.map(point => point.value),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.2,
      },
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
        enabled: false
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: true,
          text: 'Time',
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
