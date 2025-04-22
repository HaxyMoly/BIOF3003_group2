import { useEffect, useState } from "react";

interface RespiratoryRateHook {
  respiratoryRate: number | null; // Estimated respiratory rate in breaths per minute
}

export function useRespiratoryRate(ecgData: { timestamp: number; value: number }[]): RespiratoryRateHook {
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);

  useEffect(() => {
    if (ecgData.length < 100) return; // Ensure we have enough data for analysis

    // 使用三种方法提取呼吸信号
    const amSignal = extractAmplitudeModulation(ecgData);
    const fmSignal = extractFrequencyModulation(ecgData);
    const bmSignal = extractBaselineModulation(ecgData);

    // 融合三种信号以获得更准确的呼吸率估计
    const fusedRespiratoryRate = fuseRespiratoryRates([
      estimateRateFromSignal(amSignal),
      estimateRateFromSignal(fmSignal),
      estimateRateFromSignal(bmSignal)
    ]);

    if (fusedRespiratoryRate > 5 && fusedRespiratoryRate < 30) {
      // 只在合理范围内更新
      setRespiratoryRate(Math.round(fusedRespiratoryRate));
    }
  }, [ecgData]);

  return { respiratoryRate };
}

// 提取振幅调制 (AM) 信号
// 呼吸导致心轴变位，影响R波振幅
function extractAmplitudeModulation(data: { timestamp: number; value: number }[]): { timestamp: number; value: number }[] {
  // 检测R波峰值
  const rPeaks = detectRPeaks(data);
  
  // 提取R波振幅作为AM信号
  return rPeaks.map(peak => ({
    timestamp: peak.timestamp,
    value: peak.value
  }));
}

// 提取频率调制 (FM) 信号
// 呼吸导致心率变异性 (HRV)
function extractFrequencyModulation(data: { timestamp: number; value: number }[]): { timestamp: number; value: number }[] {
  // 检测R波峰值
  const rPeaks = detectRPeaks(data);
  
  // 计算RR间隔
  const rrIntervals: { timestamp: number; value: number }[] = [];
  for (let i = 1; i < rPeaks.length; i++) {
    rrIntervals.push({
      timestamp: rPeaks[i].timestamp,
      value: rPeaks[i].timestamp - rPeaks[i-1].timestamp // RR间隔
    });
  }
  
  return rrIntervals;
}

// 提取基线调制 (BM) 信号
// 呼吸引起的肌肉活动影响ECG基线
function extractBaselineModulation(data: { timestamp: number; value: number }[]): { timestamp: number; value: number }[] {
  const baselineSignal: { timestamp: number; value: number }[] = [];
  const windowSize = 10; // 滑动窗口大小
  
  for (let i = 0; i < data.length - windowSize; i++) {
    // 计算窗口内的平均值作为基线估计
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += data[i + j].value;
    }
    const average = sum / windowSize;
    
    baselineSignal.push({
      timestamp: data[i + Math.floor(windowSize/2)].timestamp,
      value: average
    });
  }
  
  return baselineSignal;
}

// 检测ECG信号中的R波峰值
function detectRPeaks(data: { timestamp: number; value: number }[]): { timestamp: number; value: number }[] {
  const peaks = [];
  const threshold = calculateAdaptiveThreshold(data);
  
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].value > threshold && 
        data[i].value > data[i - 1].value && 
        data[i].value > data[i + 1].value) {
      peaks.push(data[i]);
    }
  }
  
  return peaks;
}

// 计算自适应阈值
function calculateAdaptiveThreshold(data: { timestamp: number; value: number }[]): number {
  // 简单实现：使用信号平均值加上标准差的倍数
  let sum = 0;
  let sumSquared = 0;
  
  for (const point of data) {
    sum += point.value;
    sumSquared += point.value * point.value;
  }
  
  const mean = sum / data.length;
  const variance = (sumSquared / data.length) - (mean * mean);
  const stdDev = Math.sqrt(variance);
  
  return mean + 1.5 * stdDev; // 阈值为平均值加上1.5倍标准差
}

// 从信号中估计呼吸率
function estimateRateFromSignal(signal: { timestamp: number; value: number }[]): number {
  if (signal.length < 2) return 0;
  
  // 应用快速傅里叶变换 (FFT) 分析信号频率
  const values = signal.map(point => point.value);
  const frequencies = performFFT(values);
  
  // 找出0.1-0.5Hz范围内的主频率（对应6-30次/分钟的呼吸率）
  const respiratoryFrequency = findDominantFrequency(frequencies, 0.1, 0.5);
  
  // 转换为每分钟呼吸次数
  return respiratoryFrequency * 60;
}

// 简化的FFT实现（实际应用中应使用更高效的FFT库）
function performFFT(values: number[]): { frequency: number; magnitude: number }[] {
  // 这里是简化实现，实际应用中应使用专业FFT库
  // 例如可以使用Web Audio API或第三方库如fft.js
  
  // 模拟FFT结果
  const sampleRate = 250; // 假设采样率为250Hz
  const frequencies: { frequency: number; magnitude: number }[] = [];
  
  // 简单的频谱分析模拟
  for (let freq = 0; freq < sampleRate / 2; freq += 0.01) {
    let real = 0;
    let imag = 0;
    
    for (let i = 0; i < values.length; i++) {
      const phase = (2 * Math.PI * freq * i) / sampleRate;
      real += values[i] * Math.cos(phase);
      imag -= values[i] * Math.sin(phase);
    }
    
    const magnitude = Math.sqrt(real * real + imag * imag) / values.length;
    frequencies.push({ frequency: freq, magnitude });
  }
  
  return frequencies;
}

// 在指定频率范围内找出主频率
function findDominantFrequency(
  frequencies: { frequency: number; magnitude: number }[], 
  minFreq: number, 
  maxFreq: number
): number {
  let maxMagnitude = 0;
  let dominantFrequency = 0;
  
  for (const { frequency, magnitude } of frequencies) {
    if (frequency >= minFreq && frequency <= maxFreq && magnitude > maxMagnitude) {
      maxMagnitude = magnitude;
      dominantFrequency = frequency;
    }
  }
  
  return dominantFrequency;
}

// 融合多种方法得到的呼吸率
function fuseRespiratoryRates(rates: number[]): number {
  // 过滤掉无效值
  const validRates = rates.filter(rate => rate > 0);
  
  if (validRates.length === 0) return 0;
  
  // 简单加权平均
  // 可以根据信号质量调整权重
  const weights = [0.4, 0.4, 0.2]; // AM, FM, BM的权重
  let weightedSum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < validRates.length; i++) {
    weightedSum += validRates[i] * weights[i];
    weightSum += weights[i];
  }
  
  return weightedSum / weightSum;
}