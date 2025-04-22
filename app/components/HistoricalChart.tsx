"use client";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ISession } from '../models/Session';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HistoricalChartProps {
  sessions: ISession[];
}

export default function HistoricalChart({ sessions }: HistoricalChartProps) {
  // Ensure data is sorted by time
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const chartData = {
    labels: sortedSessions.map(d => new Date(d.timestamp).toLocaleString()),
    datasets: [
      {
        label: 'Heart Rate',
        data: sortedSessions.map(d => d.heartRate),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'HRV',
        data: sortedSessions.map(d => d.hrv),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        yAxisID: 'y1',
      },
      {
        label: 'Respiratory Rate',
        data: sortedSessions.map(d => d.respiratoryRate),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4,
        yAxisID: 'y2',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Heart Rate (BPM)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'HRV (ms)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Respiratory Rate (breaths/min)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Historical Trends</h2>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}