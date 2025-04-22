"use client";
import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";

interface ECGDataPoint {
  timestamp: number; // Timestamp in milliseconds
  value: number; // ECG signal value
}

interface HRVChartProps {
  ecgData: ECGDataPoint[]; // Array of ECG data points
  onHRVUpdate?: (hrv: number) => void; // Callback to notify parent of HRV updates
}

const HRVChart: React.FC<HRVChartProps> = ({ ecgData = [], onHRVUpdate }) => {
  const [hrvData, setHrvData] = useState<number[]>([]); // Store HRV values (in ms)

  // Improved R-Peak Detection
  const detectRPeaks = (data: ECGDataPoint[]): ECGDataPoint[] => {
    const peaks: ECGDataPoint[] = [];
    let prevValue = -Infinity;

    // Apply a moving average filter to smooth the signal
    const smoothedData = data.map((point, i) => {
      const windowSize = 5; // Adjust window size for smoothing
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
      const window = data.slice(start, end + 1);
      const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;
      return { ...point, value: avg };
    });

    // Detect peaks using a dynamic threshold
    const thresholdFactor = 0.6; // Adjust this factor based on your signal
    const maxValue = Math.max(...smoothedData.map((p) => p.value));
    const threshold = thresholdFactor * maxValue;

    for (let i = 1; i < smoothedData.length - 1; i++) {
      const current = smoothedData[i].value;
      const next = smoothedData[i + 1]?.value ?? -Infinity;

      if (current > prevValue && current > next && current > threshold) {
        peaks.push(smoothedData[i]);
      }
      prevValue = current;
    }

    return peaks;
  };

  // Calculate RR Intervals (time differences between consecutive R-peaks)
  const calculateRRIntervals = (rPeaks: ECGDataPoint[]): number[] => {
    const intervals: number[] = [];

    for (let i = 1; i < rPeaks.length; i++) {
      const interval = rPeaks[i].timestamp - rPeaks[i - 1].timestamp;

      // Filter out unrealistic intervals
      if (interval >= 300 && interval <= 2000) {
        intervals.push(interval);
      }
    }

    return intervals;
  };

  // Calculate SDNN (standard deviation of NN intervals)
  const calculateSDNN = (rrIntervals: number[]): number => {
    if (rrIntervals.length < 2) return 0;

    const mean = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
    const variance =
      rrIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (rrIntervals.length - 1);

    return Math.sqrt(variance);
  };

  useEffect(() => {
    const recentEcgData = ecgData.slice(-5000); // Use only the most recent data
    if (Array.isArray(recentEcgData) && recentEcgData.length > 0) {
      const rPeaks = detectRPeaks(recentEcgData); // Detect R-peaks
      console.log("Detected R-peaks:", rPeaks);

      const rrIntervals = calculateRRIntervals(rPeaks); // Calculate RR intervals
      console.log("RR Intervals (ms):", rrIntervals);

      const sdnn = calculateSDNN(rrIntervals); // Calculate SDNN
      console.log("Calculated SDNN (ms):", sdnn);

      setHrvData((prev) => [...prev, sdnn].slice(-50)); // Keep last 50 HRV values

      // Notify parent of the current HRV value
      const roundedHRV = Math.round(sdnn);
      if (onHRVUpdate) {
        onHRVUpdate(roundedHRV);
      }
    }
  }, [ecgData, onHRVUpdate]);

  // Format timestamps for the chart
  const formatTimestamp = (timestamp: number): string => {
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      console.error("Invalid timestamp:", timestamp);
      console.error(error);
      return "Invalid Date";
    }
  };

  // Prepare chart data
  const chartData = {
    labels: ecgData.slice(-50).map((point) => formatTimestamp(point.timestamp)), // Use timestamps from ecgData
    datasets: [
      {
        label: "HRV (ms)",
        data: hrvData,
        borderColor: "rgba(75,192,192,1)",
        fill: false,
      },
    ],
  };

  console.log("chartData:", chartData); // Debugging

  // Handle empty data gracefully
  if (!Array.isArray(ecgData) || ecgData.length === 0) {
    return <p className="text-gray-500">No ECG data available.</p>;
  }

  if (hrvData.length === 0) {
    return <p className="text-gray-500">Calculating HRV...</p>;
  }

  return (
    <div>
      <Line
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: true,
            },
            title: {
              display: true,
              text: "HRV Data",
            },
          },
          scales: {
            x: {
              type: "category",
              title: {
                display: true,
                text: "Time",
              },
            },
            y: {
              title: {
                display: true,
                text: "HRV Value (ms)",
              },
            },
          },
        }}
        data={chartData}
      />
    </div>
  );
};

export default HRVChart;