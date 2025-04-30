import { useEffect, useState, useRef } from "react";

// 参数定义
const FS = 250;
const WINDOW_SIZE = 10; // 秒
const MIN_RESP_RATE = 5;
const MAX_RESP_RATE = 50;
const UPDATE_INTERVAL = 10000;

// 用于R波检测的参数
const QRS_DETECTION_WINDOW = 0.15 * FS; // 150ms窗口用于QRS检测
const REFRACTORY_PERIOD = 0.2 * FS; // 不应期200ms

interface ECGPoint {
  timestamp: number;
  value: number;
}

interface RespiratoryRateHook {
  respiratoryRate: number | null;
  respirationSignal?: number[];
  rPeaks?: number[];
  sPeaks?: number[];
}

export function useRespiratoryRate(ecgData: ECGPoint[]): RespiratoryRateHook {
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [respirationSignal, setRespirationSignal] = useState<number[]>([]);
  const [rPeaks, setRPeaks] = useState<number[]>([]);
  const [sPeaks, setSPeaks] = useState<number[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  // 添加累积呼吸信号的状态
  const accumulatedRespSignalRef = useRef<number[]>([]);
  
  useEffect(() => {
    if (ecgData.length < FS * 3) {
      console.log("呼吸率计算: 数据不足，需要至少3秒数据");
      return;
    }
      const ecgValues = ecgData.map(d => d.value);
      
      // 使用Hamilton-Tompkins算法检测R波和S波
      const { rPeakIndices, sPeakIndices } = detectRSPeaks(ecgValues);
      setRPeaks(rPeakIndices);
      setSPeaks(sPeakIndices);
      
      console.log(`呼吸率计算: 检测到 ${rPeakIndices.length} 个R波, ${sPeakIndices.length} 个S波`);
      
      // 计算R-S振幅差并进行三次样条插值
      const currentRespSignal = calculateRSAmplitudeAndInterpolate(ecgValues, rPeakIndices, sPeakIndices);
      
      // 累积呼吸信号
      if (currentRespSignal.length > 0) {
        // 将新的呼吸信号添加到累积信号中
        accumulatedRespSignalRef.current = [...accumulatedRespSignalRef.current, ...currentRespSignal];
        
        // 如果累积信号太长，保留最新的部分
        const maxAccumulatedLength = 5000; // 设置一个上限以避免内存问题
        if (accumulatedRespSignalRef.current.length > maxAccumulatedLength) {
          accumulatedRespSignalRef.current = accumulatedRespSignalRef.current.slice(-maxAccumulatedLength);
        }
        
        console.log(`呼吸率计算: 当前呼吸信号长度 ${currentRespSignal.length}，累积信号长度 ${accumulatedRespSignalRef.current.length}`);
        
        // 更新UI显示的呼吸信号（可以只显示最新的部分）
        setRespirationSignal(currentRespSignal);
        
        // 只有当累积的呼吸信号足够长时才计算呼吸率
        const minRequiredLength = 3000; // 需要至少3000个点
        if (accumulatedRespSignalRef.current.length >= minRequiredLength) {
          // 使用累积的呼吸信号计算呼吸率
          const respRate = estimateRespiratoryRateFromRSAmplitude(accumulatedRespSignalRef.current);
          console.log(`呼吸率计算: 原始呼吸率 ${respRate.toFixed(2)} breaths/min`);
          
          if (respRate > MIN_RESP_RATE && respRate < MAX_RESP_RATE) {
            console.log(`呼吸率计算: 设置有效呼吸率 ${Math.round(respRate)} breaths/min`);
            setRespiratoryRate(Math.round(respRate)/2);
          } else {
            console.log(`呼吸率计算: 呼吸率超出范围 (${MIN_RESP_RATE}-${MAX_RESP_RATE}), 值为 ${respRate.toFixed(2)}`);
            // 添加默认值设置，避免呼吸率始终为null
            setRespiratoryRate(respRate < MIN_RESP_RATE ? MIN_RESP_RATE : MAX_RESP_RATE);
          }
        } else {
          console.log(`呼吸率计算: 累积呼吸信号不足 ${minRequiredLength} 个点，当前 ${accumulatedRespSignalRef.current.length} 个点`);
        }
      } else {
        console.log("呼吸率计算: 无法生成有效的呼吸信号");
      }
  }, [ecgData]);

  return { respiratoryRate, respirationSignal, rPeaks, sPeaks };
}

// Hamilton-Tompkins算法检测R波和S波
function detectRSPeaks(signal: number[]): { rPeakIndices: number[], sPeakIndices: number[] } {
  // 将信号转换为ECGDataPoint格式以适配新的R波检测算法
  const signalPoints = signal.map((value, index) => ({ timestamp: index, value }));
  
  // 使用新的R波检测算法
  const rPeaks = detectRPeaks(signalPoints);
  const rPeakIndices = rPeaks.map(peak => peak.timestamp);
  
  // 在R波后寻找S波
  const sPeakIndices = findSPeaks(signal, rPeakIndices);
  
  return { rPeakIndices, sPeakIndices };
}

// 新的R波检测算法
function detectRPeaks(data: ECGPoint[]): ECGPoint[] {
  const peaks: ECGPoint[] = [];
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
}

// 添加信号平滑函数
function smoothSignal(signal: number[]): number[] {
  const windowSize = 5; // 平滑窗口大小
  const smoothed = new Array(signal.length).fill(0);
  
  for (let i = 0; i < signal.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(signal.length - 1, i + Math.floor(windowSize / 2));
    const window = signal.slice(start, end + 1);
    smoothed[i] = window.reduce((sum, val) => sum + val, 0) / window.length;
  }
  
  return smoothed;
}

function differentiateSignal(signal: number[]): number[] {
  const diff = new Array(signal.length).fill(0);
  for (let i = 1; i < signal.length; i++) {
    diff[i] = signal[i] - signal[i-1];
  }
  return diff;
}

function movingWindowIntegration(signal: number[], windowSize: number): number[] {
  const integrated = new Array(signal.length).fill(0);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    const start = Math.max(0, i - windowSize + 1);
    for (let j = start; j <= i; j++) {
      sum += signal[j];
    }
    integrated[i] = sum / (i - start + 1);
  }
  return integrated;
}

function findRPeaks(processedSignal: number[], originalSignal: number[]): number[] {
  const rPeaks: number[] = [];
  
  // 计算信号的平均值和标准差，用于自适应阈值
  const mean = processedSignal.reduce((a, b) => a + b, 0) / processedSignal.length;
  const stdDev = Math.sqrt(
    processedSignal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / processedSignal.length
  );
  
  // 初始阈值设置 - 使用更动态的阈值
  const thresholdFactor = 0.6; // 阈值因子
  const maxValue = Math.max(...processedSignal);
  let threshold = Math.max(mean + 2 * stdDev, thresholdFactor * maxValue);
  let lastPeakIndex = -REFRACTORY_PERIOD;
  
  for (let i = 1; i < processedSignal.length - 1; i++) {
    // 检查是否超过阈值且大于相邻点
    if (processedSignal[i] > threshold && 
        processedSignal[i] > processedSignal[i-1] && 
        processedSignal[i] >= processedSignal[i+1] &&
        i - lastPeakIndex > REFRACTORY_PERIOD) {
      
      // 在原始信号中找到实际的R波峰值
      let peakIndex = i;
      const searchWindow = Math.round(0.05 * FS); // 50ms窗口
      const searchStart = Math.max(0, i - searchWindow);
      const searchEnd = Math.min(originalSignal.length - 1, i + searchWindow);
      
      let maxVal = originalSignal[i];
      for (let j = searchStart; j <= searchEnd; j++) {
        if (originalSignal[j] > maxVal) {
          maxVal = originalSignal[j];
          peakIndex = j;
        }
      }
      
      rPeaks.push(peakIndex);
      lastPeakIndex = i;
      
      // 更新阈值 - 使用更平滑的阈值调整
      threshold = 0.7 * threshold + 0.3 * processedSignal[i];
    }
  }
  
  // 过滤不合理的R波间隔
  return filterRPeaks(rPeaks, originalSignal);
}

// 添加R波过滤函数，去除不合理的R波
function filterRPeaks(peaks: number[], signal: number[]): number[] {
  if (peaks.length < 2) return peaks;
  
  const filteredPeaks: number[] = [peaks[0]];
  const intervals: number[] = [];
  
  // 计算初始间隔
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i-1]);
  }
  
  // 计算间隔的中位数作为参考
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
  
  // 过滤不合理的间隔
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - filteredPeaks[filteredPeaks.length - 1];
    
    // 如果间隔在合理范围内（0.5-1.5倍中位数）或者信号强度足够高
    if ((interval >= 0.5 * medianInterval && interval <= 1.5 * medianInterval) || 
        signal[peaks[i]] > 1.5 * (signal.reduce((a, b) => a + b, 0) / signal.length)) {
      filteredPeaks.push(peaks[i]);
    }
  }
  
  return filteredPeaks;
}

function findSPeaks(signal: number[], rPeakIndices: number[]): number[] {
  const sPeaks: number[] = [];
  
  for (const rIndex of rPeakIndices) {
    // 在R波后的一小段时间内寻找S波（通常在R波后的30-120ms内）
    const searchStart = rIndex + 1;
    const searchEnd = Math.min(signal.length - 1, rIndex + Math.round(0.12 * FS));
    
    if (searchEnd <= searchStart) continue;
    
    let minVal = signal[searchStart];
    let sIndex = searchStart;
    
    // 寻找局部最小值作为S波
    for (let i = searchStart; i <= searchEnd; i++) {
      if (signal[i] < minVal) {
        minVal = signal[i];
        sIndex = i;
      }
    }
    
    // 验证S波是否为真正的局部最小值
    if (sIndex > searchStart && sIndex < searchEnd) {
      if (signal[sIndex] < signal[sIndex-1] && signal[sIndex] <= signal[sIndex+1]) {
        sPeaks.push(sIndex);
      }
    } else {
      sPeaks.push(sIndex); // 边界情况，仍然添加
    }
  }
  
  return sPeaks;
}

function calculateRSAmplitudeAndInterpolate(signal: number[], rIndices: number[], sIndices: number[]): number[] {
  // 确保R波和S波的数量匹配
  const minLength = Math.min(rIndices.length, sIndices.length);
  const rsAmplitudes: {index: number, amplitude: number}[] = [];
  
  // 计算每对R-S波的振幅差
  for (let i = 0; i < minLength; i++) {
    if (rIndices[i] < sIndices[i]) { // 确保S波在R波之后
      const rAmplitude = signal[rIndices[i]];
      const sAmplitude = signal[sIndices[i]];
      const amplitude = rAmplitude - sAmplitude; // R-S振幅差
      rsAmplitudes.push({
        index: Math.floor((rIndices[i] + sIndices[i]) / 2), // 使用R-S波的中点作为索引
        amplitude
      });
    }
  }
  
  if (rsAmplitudes.length < 2) {
    // 如果没有足够的R-S对，返回空数组
    return [];
  }
  
  // 使用三次样条插值生成连续的呼吸信号
  return cubicSplineInterpolation(rsAmplitudes, signal.length);
}

function cubicSplineInterpolation(points: {index: number, amplitude: number}[], length: number): number[] {
  if (points.length < 2) return new Array(length).fill(0);
  
  // 排序点
  points.sort((a, b) => a.index - b.index);
  
  const n = points.length;
  const x = points.map(p => p.index);
  const y = points.map(p => p.amplitude);
  
  // 计算三次样条插值的系数
  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(x[i + 1] - x[i]);
  }
  
  // 计算对角矩阵
  const alpha: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    alpha.push(3 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1]));
  }
  
  // 解三对角矩阵
  const l: number[] = [1];
  const mu: number[] = [0];
  const z: number[] = [0];
  
  for (let i = 1; i < n - 1; i++) {
    l.push(2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]);
    mu.push(h[i] / l[i]);
    z.push((alpha[i - 1] - h[i - 1] * z[i - 1]) / l[i]);
  }
  
  l.push(1);
  z.push(0);
  
  const c: number[] = new Array(n).fill(0);
  const b: number[] = new Array(n - 1).fill(0);
  const d: number[] = new Array(n - 1).fill(0);
  
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (y[j + 1] - y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  
  // 生成插值结果
  const result = new Array(length).fill(0);
  
  // 对每个点进行插值
  for (let i = 0; i < length; i++) {
    // 如果点在样条范围外，使用最近的端点值
    if (i <= x[0]) {
      result[i] = y[0];
      continue;
    }
    if (i >= x[n - 1]) {
      result[i] = y[n - 1];
      continue;
    }
    
    // 找到点所在的区间
    let j = 0;
    while (j < n - 1 && i > x[j + 1]) j++;
    
    // 计算插值
    const dx = i - x[j];
    result[i] = y[j] + b[j] * dx + c[j] * dx * dx + d[j] * dx * dx * dx;
  }
  
  return normalizeSignal(result);
}

function estimateRespiratoryRateFromRSAmplitude(respirationSignal: number[]): number {
  if (respirationSignal.length < WINDOW_SIZE * FS) {
    console.log(`呼吸率估计: 信号长度不足 (${respirationSignal.length} < ${WINDOW_SIZE * FS})`);
    // 返回一个默认值而不是直接返回
    return (MIN_RESP_RATE + MAX_RESP_RATE) / 2;
  }
  
  try {
    const rate = estimateRespiratoryRateZeroCrossing(respirationSignal);
    console.log(`呼吸率估计: 零交叉法计算结果 ${rate.toFixed(2)} breaths/min`);
    return rate;
  } catch (error) {
    console.error("呼吸率估计: 计算过程出错", error);
    return (MIN_RESP_RATE + MAX_RESP_RATE) / 2;
  }
}

function normalizeSignal(signal: number[]): number[] {
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const zeroMean = signal.map(v => v - mean);
  const maxAbs = Math.max(...zeroMean.map(Math.abs)) || 1;
  return zeroMean.map(v => v / maxAbs);
}

function bandpassFilter(signal: number[], low: number, high: number, fs: number): number[] {
  const nyquist = fs / 2;
  const lowNorm = low / nyquist;
  const highNorm = high / nyquist;

  // Use simple IIR Butterworth filter (2nd order)
  const [b, a] = butterworthBandpassCoefficients(lowNorm, highNorm);
  return applyIIRFilter(signal, b, a);
}

function butterworthBandpassCoefficients(low: number, high: number): [number[], number[]] {
  // Simplified 2nd order bandpass filter for demonstrative purposes
  const bw = high - low;
  const f0 = (high + low) / 2;

  const w0 = 2 * Math.PI * f0;
  const Q = f0 / bw;

  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);

  const b = [
    alpha,
    0,
    -alpha
  ];

  const a = [
    1 + alpha,
    -2 * cosW0,
    1 - alpha
  ];

  return [
    b.map(v => v / (1 + alpha)),
    a.map(v => v / (1 + alpha))
  ];
}

function applyIIRFilter(signal: number[], b: number[], a: number[]): number[] {
  const out = new Array(signal.length).fill(0);
  for (let i = 0; i < signal.length; i++) {
    out[i] = b[0] * signal[i] +
             (i > 0 ? b[1] * signal[i - 1] : 0) +
             (i > 1 ? b[2] * signal[i - 2] : 0) -
             (i > 0 ? a[1] * out[i - 1] : 0) -
             (i > 1 ? a[2] * out[i - 2] : 0);
  }
  return out;
}

// 使用零交叉法估计呼吸频率
function estimateRespiratoryRateZeroCrossing(signal: number[]): number {
  // 获取最近的WINDOW_SIZE秒数据
  const window = signal.slice(-WINDOW_SIZE * FS);
  
  // 去均值
  const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
  const zeroMean = window.map(v => v - mean);
  
  // 应用带通滤波器，只保留呼吸频率范围内的信号 (0.1-0.5 Hz，对应6-30 breaths/min)
  const filteredSignal = bandpassFilter(zeroMean, 0.1, 0.5, FS);
  
  // 计算零交叉点
  const zeroCrossings = countZeroCrossings(filteredSignal);
  
  // 计算零交叉率 (每秒零交叉次数)
  const zeroCrossingRate = zeroCrossings / (WINDOW_SIZE);
  
  // 由于每个完整周期有两次零交叉(上升和下降)，所以频率是零交叉率的一半
  const frequency = zeroCrossingRate / 2;
  
  console.log(`零交叉法: 检测到 ${zeroCrossings} 个零交叉点，零交叉率 ${zeroCrossingRate.toFixed(2)} Hz`);
  
  // 转换为每分钟呼吸次数
  return frequency * 60;
}

// 计算信号中的零交叉点数量
function countZeroCrossings(signal: number[]): number {
  let count = 0;
  
  // 应用滞后比较器来减少噪声引起的虚假零交叉
  const hysteresis = 0.02; // 滞后阈值，可以根据信号特性调整
  let isAboveZero = signal[0] > hysteresis;
  
  for (let i = 1; i < signal.length; i++) {
    // 使用滞后比较器检测零交叉
    // 只有当信号从明显低于零变为明显高于零，或者从明显高于零变为明显低于零时才计数
    if (isAboveZero && signal[i] < -hysteresis) {
      isAboveZero = false;
      count++;
    } else if (!isAboveZero && signal[i] > hysteresis) {
      isAboveZero = true;
      count++;
    }
  }
  
  return count;
}

// 应用汉宁窗函数
function applyHanningWindow(signal: number[]): number[] {
  return signal.map((value, index) => {
    const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * index / (signal.length - 1)));
    return value * hannWindow;
  });
}

// 计算FFT（完整实现）
function computeFFT(signal: number[]): number[] {
  // 确保信号长度是2的幂，便于FFT计算
  const paddedSignal = padToPowerOfTwo(signal);
  const n = paddedSignal.length;
  
  // 创建复数数组表示信号
  const complex: {real: number, imag: number}[] = paddedSignal.map(value => ({
    real: value,
    imag: 0
  }));
  
  // 执行原地FFT
  fft(complex, n);
  
  // 计算幅度谱
  const magnitudes = complex.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
  
  return magnitudes;
}

// 将信号填充到2的幂长度
function padToPowerOfTwo(signal: number[]): number[] {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(signal.length)));
  const paddedSignal = [...signal];
  
  // 用0填充到2的幂长度
  while (paddedSignal.length < nextPowerOfTwo) {
    paddedSignal.push(0);
  }
  
  return paddedSignal;
}

// 原地FFT实现（Cooley-Tukey算法）
function fft(complex: {real: number, imag: number}[], n: number): void {
  // 位反转排序
  bitReverseSort(complex, n);
  
  // 蝶形运算
  for (let stage = 1; stage <= Math.log2(n); stage++) {
    const m = Math.pow(2, stage);
    const halfM = m / 2;
    
    // 计算旋转因子的基本单位
    const omega: {real: number, imag: number} = {
      real: Math.cos(2 * Math.PI / m),
      imag: -Math.sin(2 * Math.PI / m)
    };
    
    for (let k = 0; k < n; k += m) {
      // 初始旋转因子
      let w: {real: number, imag: number} = {real: 1, imag: 0};
      
      for (let j = 0; j < halfM; j++) {
        const evenIndex = k + j;
        const oddIndex = k + j + halfM;
        
        // 蝶形运算的偶数部分
        const even = {
          real: complex[evenIndex].real,
          imag: complex[evenIndex].imag
        };
        
        // 蝶形运算的奇数部分乘以旋转因子
        const odd = {
          real: complex[oddIndex].real * w.real - complex[oddIndex].imag * w.imag,
          imag: complex[oddIndex].real * w.imag + complex[oddIndex].imag * w.real
        };
        
        // 蝶形运算结果
        complex[evenIndex] = {
          real: even.real + odd.real,
          imag: even.imag + odd.imag
        };
        
        complex[oddIndex] = {
          real: even.real - odd.real,
          imag: even.imag - odd.imag
        };
        
        // 更新旋转因子
        const nextW = {
          real: w.real * omega.real - w.imag * omega.imag,
          imag: w.real * omega.imag + w.imag * omega.real
        };
        w = nextW;
      }
    }
  }
}

// 位反转排序
function bitReverseSort(complex: {real: number, imag: number}[], n: number): void {
  const bits = Math.log2(n);
  
  for (let i = 0; i < n; i++) {
    const reversedIndex = reverseBits(i, bits);
    
    // 只交换一次（避免重复交换）
    if (i < reversedIndex) {
      const temp = complex[i];
      complex[i] = complex[reversedIndex];
      complex[reversedIndex] = temp;
    }
  }
}

// 位反转函数
function reverseBits(num: number, bits: number): number {
  let reversed = 0;
  
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (num & 1);
    num >>= 1;
  }
  
  return reversed;
}
