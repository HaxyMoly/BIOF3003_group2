import { useEffect, useState } from "react";

interface RespiratoryRateHook {
  respiratoryRate: number | null; // Estimated respiratory rate in breaths per minute
}

export function useRespiratoryRate(ecgData: { timestamp: number; value: number }[]): RespiratoryRateHook {
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);

  useEffect(() => {
    if (ecgData.length < 100) return; // Ensure we have enough data for analysis

    // Step 1: Detect peaks in the ECG data
    const peaks = detectPeaks(ecgData);

    // Step 2: Calculate the time intervals between peaks
    const intervals = calculateIntervals(peaks);

    // Step 3: Estimate respiratory rate
    const estimatedRate = estimateRespiratoryRate(intervals);
    if (estimatedRate > 5 && estimatedRate < 30) {
      // Only update if the value is within a reasonable range
      setRespiratoryRate(Math.round(estimatedRate));
    }
  }, [ecgData]);

  return { respiratoryRate };
}

// Helper function to detect peaks in the ECG signal
function detectPeaks(data: { timestamp: number; value: number }[]): { timestamp: number; value: number }[] {
  const peaks = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].value > data[i - 1].value && data[i].value > data[i + 1].value) {
      peaks.push(data[i]);
    }
  }
  return peaks;
}

// Helper function to calculate intervals between peaks
function calculateIntervals(peaks: { timestamp: number; value: number }[]): number[] {
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i].timestamp - peaks[i - 1].timestamp; // Interval in milliseconds
    intervals.push(interval);
  }
  return intervals;
}

// Helper function to estimate respiratory rate
function estimateRespiratoryRate(intervals: number[]): number {
  if (intervals.length === 0) return 0;

  // Calculate average interval in seconds
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / 1000;

  // Convert to breaths per minute
  return 60 / averageInterval;
}