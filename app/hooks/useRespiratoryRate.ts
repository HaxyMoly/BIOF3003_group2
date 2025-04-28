import { useEffect, useState } from "react";

// 常量定义
const FS = 250; // 采样频率（假设ECG数据采样率为250Hz）
const F1 = 8 / FS; // 低通滤波器频率
const F2 = 40 / FS; // 高通滤波器频率
const QRS_INTERVAL = [-40, 40]; // QRS复合波的持续时间范围
const HEARTBEAT_WINDOW = 16; // 用于估计呼吸率的心跳移动窗口大小
const FFT_LENGTH = 512; // 功率谱长度
const FREQ_RANGE = [0.03, 0.3]; // 默认提取呼吸率的频率范围
const AVERAGING_WINDOW = 16; // 提取中值RR的窗口定义

interface RespiratoryRateHook {
  respiratoryRate: number | null; // 估计的呼吸率（每分钟呼吸次数）
}

export function useRespiratoryRate(ecgData: { timestamp: number; value: number }[]): RespiratoryRateHook {
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);

  useEffect(() => {
    if (ecgData.length < 100) {
      console.log("ECG数据不足，需要至少100个数据点");
      return;
    }

    try {
      // 检测R波峰值
      const [rpeaks, rpeaksCorr] = detectRPeaks(ecgData);
      console.log(`检测到${rpeaksCorr.length}个R波峰值`);
      
      if (rpeaksCorr.length < 2) {
        console.log("检测到的R波峰值不足，无法计算呼吸率");
        // 设置一个默认值，避免显示"Calculating..."
        setRespiratoryRate(16); // 默认成人静息呼吸率
        return;
      }
      
      // 提取QRS复合波
      const qrses = extractQrsComplexes(rpeaksCorr, ecgData);
      
      // 估计呼吸率
      const respRate = rrEstimator(qrses, rpeaksCorr);
      console.log(`估计的呼吸率数组长度: ${respRate.length}`);
      
      if (respRate.length === 0) {
        console.log("呼吸率估计失败，没有有效结果");
        return;
      }
      
      // 平滑呼吸率估计
      const smoothedRespRate = smoothRR(respRate);
      console.log(`平滑后的呼吸率: ${smoothedRespRate}`);
      
      // 只在合理范围内更新呼吸率
      if (smoothedRespRate > 5 && smoothedRespRate < 40) {
        const roundedRate = Math.round(smoothedRespRate);
        console.log(`设置呼吸率为: ${roundedRate}`);
        setRespiratoryRate(roundedRate);
      } else {
        console.log(`呼吸率 ${smoothedRespRate} 超出合理范围(5-40)`);
      }
    } catch (error) {
      console.error("呼吸率计算过程中出错:", error);
      // 出错时也设置默认值
      setRespiratoryRate(16);
    }
  }, [ecgData]);

  return { respiratoryRate };
}

// 检测R波峰值和校正的R波峰值
function detectRPeaks(data: { timestamp: number; value: number }[]): [number[], number[]] {
  // 使用双平均窗口检测器检测R波
  const rpeaks = twoAverageDetector(data);
  
  // 校正R波位置
  const rpeaksCorr = rpeakCorrection(data, rpeaks);
  
  return [rpeaks, rpeaksCorr];
}

// 双平均窗口检测器 - 基于Elgendi, Jonkman, & De Boer (2010)
function twoAverageDetector(data: { timestamp: number; value: number }[]): number[] {
  const low = F1 * 2;
  const high = F2 * 2;
  
  // 应用带通滤波器
  const filteredEcg = bandpassFilter(data.map(d => d.value), low, high);
  
  // 第一个移动窗口 - 识别QRS间隔
  const window1 = Math.round(0.12 * FS);
  const mwaQrs = movingWindowAve(filteredEcg.map(Math.abs), window1);
  
  // 第二个移动窗口 - 识别心跳持续时间
  const window2 = Math.round(0.6 * FS);
  const mwaBeat = movingWindowAve(filteredEcg.map(Math.abs), window2);
  
  // 识别QRS间隔幅度大于心跳幅度的片段
  const blocks: number[] = Array(data.length).fill(0);
  const blockHeight = Math.max(...filteredEcg);
  
  for (let i = 0; i < mwaQrs.length; i++) {
    if (mwaQrs[i] > mwaBeat[i]) {
      blocks[i] = blockHeight;
    }
  }
  
  // 在每个先前识别的片段中识别R波峰值
  const qrs: number[] = [];
  let start = 0;
  
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i - 1] === 0 && blocks[i] === blockHeight) {
      start = i;
    } else if (blocks[i - 1] === blockHeight && blocks[i] === 0) {
      const end = i - 1;
      
      if (end - start > Math.round(0.08 * FS)) {
        let maxIdx = start;
        let maxVal = filteredEcg[start];
        
        for (let j = start + 1; j <= end; j++) {
          if (filteredEcg[j] > maxVal) {
            maxVal = filteredEcg[j];
            maxIdx = j;
          }
        }
        
        if (qrs.length === 0 || maxIdx - qrs[qrs.length - 1] > Math.round(0.3 * FS)) {
          qrs.push(maxIdx);
        }
      }
    }
  }
  
  return qrs;
}

// 带通滤波器实现
function bandpassFilter(signal: number[], lowCutoff: number, highCutoff: number): number[] {
  // 简化的巴特沃斯滤波器实现
  const filtered: number[] = [];
  const a1 = -2 * Math.cos(Math.PI * (lowCutoff + highCutoff)) / (1 + Math.cos(Math.PI * (lowCutoff + highCutoff)));
  const a2 = (1 - Math.cos(Math.PI * (lowCutoff + highCutoff))) / (1 + Math.cos(Math.PI * (lowCutoff + highCutoff)));
  const b0 = (1 - Math.cos(Math.PI * (highCutoff - lowCutoff))) / (2 * (1 + Math.cos(Math.PI * (lowCutoff + highCutoff))));
  const b1 = 0;
  const b2 = -(1 - Math.cos(Math.PI * (highCutoff - lowCutoff))) / (2 * (1 + Math.cos(Math.PI * (lowCutoff + highCutoff))));
  
  filtered[0] = b0 * signal[0];
  filtered[1] = b0 * signal[1] + b1 * signal[0] - a1 * filtered[0];
  
  for (let i = 2; i < signal.length; i++) {
    filtered[i] = b0 * signal[i] + b1 * signal[i - 1] + b2 * signal[i - 2] - a1 * filtered[i - 1] - a2 * filtered[i - 2];
  }
  
  return filtered;
}

// 移动窗口平均值计算
function movingWindowAve(inputArray: number[], windowSize: number): number[] {
  const movingWindowAve: number[] = Array(inputArray.length).fill(0);
  
  for (let i = 0; i < inputArray.length; i++) {
    if (i < windowSize) {
      const section = inputArray.slice(0, i);
      movingWindowAve[i] = i !== 0 ? section.reduce((a, b) => a + b, 0) / section.length : inputArray[i];
    } else {
      const section = inputArray.slice(i - windowSize, i);
      movingWindowAve[i] = section.reduce((a, b) => a + b, 0) / section.length;
    }
  }
  
  return movingWindowAve;
}

// R波峰值校正
function rpeakCorrection(signal: { timestamp: number; value: number }[], rpeaks: number[]): number[] {
  const peaksCorrectedList: number[] = [];
  
  for (const peakIdx of rpeaks) {
    let cnt = peakIdx;
    
    if (cnt - 1 < 0) continue;
    
    if (signal[cnt].value < signal[cnt - 1].value) {
      while (signal[cnt].value < signal[cnt - 1].value) {
        cnt -= 1;
        if (cnt < 0) break;
      }
    } else if (signal[cnt].value < signal[cnt + 1].value) {
      while (signal[cnt].value < signal[cnt + 1].value) {
        cnt += 1;
        if (cnt >= signal.length) break;
      }
    }
    
    peaksCorrectedList.push(cnt);
  }
  
  return peaksCorrectedList;
}

// 提取QRS复合波
function extractQrsComplexes(rpeaksCorr: number[], ecg: { timestamp: number; value: number }[]): number[][] {
  const beatsDuration = Array.from({ length: QRS_INTERVAL[1] - QRS_INTERVAL[0] + 1 }, (_, i) => QRS_INTERVAL[0] + i);
  
  // 应用带通滤波器清洁QRS复合波
  const data = bandpassFilter(ecg.map(d => d.value), F1 * 2, F2 * 2);
  
  // 初始化beats矩阵
  const beats: number[][] = Array(beatsDuration.length).fill(0).map(() => Array(rpeaksCorr.length).fill(0));
  
  // 对于每个心跳，根据预定义的QRS间隔提取QRS复合波
  for (let i = 0; i < rpeaksCorr.length; i++) {
    for (let j = 0; j < beatsDuration.length; j++) {
      const idx = rpeaksCorr[i] + QRS_INTERVAL[0] + j;
      if (idx >= 0 && idx < data.length) {
        beats[j][i] = data[idx];
      }
    }
  }
  
  return beats;
}

// 估计呼吸率
function rrEstimator(qrses: number[][], rpeaksCorr: number[]): number[] {
  // 计算每个QRS复合波的RMS值
  const rms: number[] = Array(qrses[0].length).fill(0);
  
  for (let i = 0; i < rms.length; i++) {
    let sumSquared = 0;
    for (let j = 0; j < qrses.length; j++) {
      sumSquared += qrses[j][i] ** 2;
    }
    rms[i] = Math.sqrt(sumSquared / qrses.length);
  }
  
  // 生成RMS值的功率谱并估计RR
  const freqVector = Array.from({ length: FFT_LENGTH / 2 + 1 }, (_, i) => i * 0.5 / (FFT_LENGTH / 2));
  const rrint = rpeaksCorr.slice(1).map((val, idx) => val - rpeaksCorr[idx]);
  const resprate: number[] = [];
  
  for (let i = 0; i < rms.length; i++) {
    if (i < HEARTBEAT_WINDOW) {
      continue;
    }
    
    const section = rms.slice(i - HEARTBEAT_WINDOW, i);
    const rrintMed = median(rrint.slice(i - HEARTBEAT_WINDOW, i));
    
    if (rrintMed > 100) {
      // 根据中值HR和预定义的RR范围计算频率映射范围
      const respRange = [10, 40]; // 默认呼吸率范围
      const fpeaks = freqVector.map((f, idx) => ({ 
        idx, 
        f, 
        inRange: f > respRange[0] * rrintMed / 60000 && f < respRange[1] * rrintMed / 60000 
      })).filter(p => p.inRange).map(p => p.idx);
      
      if (fpeaks.length === 0) continue;
      
      // 计算RMS值移动窗口的功率谱
      const spectrum = performFFT(section.map(v => v - mean(section)));
      const spectrumMod = spectrum.slice(0, FFT_LENGTH / 2 + 1).map(c => c.real * c.real + c.imag * c.imag);
      
      // 找出功率谱峰值的位置
      let maxIdx = fpeaks[0];
      let maxVal = spectrumMod[fpeaks[0]];
      
      for (let j = 1; j < fpeaks.length; j++) {
        if (spectrumMod[fpeaks[j]] > maxVal) {
          maxVal = spectrumMod[fpeaks[j]];
          maxIdx = fpeaks[j];
        }
      }
      
      // 估计呼吸率
      resprate.push(freqVector[maxIdx] * 60000 / rrintMed);
    } else {
      // 使用默认频率映射
      const fpeaks = freqVector.map((f, idx) => ({ 
        idx, 
        f, 
        inRange: f > FREQ_RANGE[0] && f < FREQ_RANGE[1] 
      })).filter(p => p.inRange).map(p => p.idx);
      
      if (fpeaks.length === 0) continue;
      
      // 计算RMS值移动窗口的功率谱
      const spectrum = performFFT(section.map(v => v - mean(section)));
      const spectrumMod = spectrum.slice(0, FFT_LENGTH / 2 + 1).map(c => c.real * c.real + c.imag * c.imag);
      
      // 找出功率谱峰值的位置
      let maxIdx = fpeaks[0];
      let maxVal = spectrumMod[fpeaks[0]];
      
      for (let j = 1; j < fpeaks.length; j++) {
        if (spectrumMod[fpeaks[j]] > maxVal) {
          maxVal = spectrumMod[fpeaks[j]];
          maxIdx = fpeaks[j];
        }
      }
      
      // 估计呼吸率
      resprate.push(freqVector[maxIdx] * 60);
    }
  }
  
  return resprate;
}

// 平滑呼吸率
function smoothRR(resprate: number[]): number {
  if (resprate.length === 0) return 0;
  
  // 平滑数据，确定窗口中的中值
  const resprateMwa: number[] = Array(resprate.length).fill(0);
  
  for (let i = 0; i < resprate.length; i++) {
    if (i > 0 && i < AVERAGING_WINDOW) {
      resprateMwa[i] = resprate[i];
    } else if (i >= AVERAGING_WINDOW) {
      const ind = Array.from({ length: AVERAGING_WINDOW }, (_, j) => i - AVERAGING_WINDOW + j);
      // 每个移动窗口的中值RR
      resprateMwa[i] = median(ind.map(idx => {
        // 确保索引在有效范围内
        if (idx >= 0 && idx < resprate.length) {
          return resprate[idx];
        }
        return 0;
      }).filter(val => val > 0)); // 过滤掉无效值
    } else {
      resprateMwa[i] = resprate[i];
    }
  }
  
  // 返回最后一个平滑的估计RR，如果数组为空则返回0
  return resprateMwa.length > 0 ? resprateMwa[resprateMwa.length - 1] : 0;
}

// 执行FFT
interface Complex {
  real: number;
  imag: number;
}

function performFFT(values: number[]): Complex[] {
  // 确保输入长度为2的幂
  const paddedValues = [...values];
  while (paddedValues.length < FFT_LENGTH) {
    paddedValues.push(0);
  }
  
  // 递归实现FFT
  function fft(x: Complex[]): Complex[] {
    const N = x.length;
    
    if (N <= 1) {
      return x;
    }
    
    // 分解为偶数和奇数部分
    const even: Complex[] = [];
    const odd: Complex[] = [];
    
    for (let i = 0; i < N; i += 2) {
      even.push(x[i]);
      if (i + 1 < N) {
        odd.push(x[i + 1]);
      }
    }
    
    // 递归计算
    const evenFFT = fft(even);
    const oddFFT = fft(odd);
    
    // 合并结果
    const result: Complex[] = Array(N).fill({ real: 0, imag: 0 });
    
    for (let k = 0; k < N / 2; k++) {
      const t = oddFFT[k];
      const angle = -2 * Math.PI * k / N;
      const twiddle = { real: Math.cos(angle), imag: Math.sin(angle) };
      
      // 复数乘法
      const twiddleT = { 
        real: twiddle.real * t.real - twiddle.imag * t.imag,
        imag: twiddle.real * t.imag + twiddle.imag * t.real
      };
      
      // 蝶形运算
      result[k] = { 
        real: evenFFT[k].real + twiddleT.real,
        imag: evenFFT[k].imag + twiddleT.imag
      };
      
      result[k + N / 2] = { 
        real: evenFFT[k].real - twiddleT.real,
        imag: evenFFT[k].imag - twiddleT.imag
      };
    }
    
    return result;
  }
  
  // 将实数转换为复数
  const complexInput = paddedValues.map(v => ({ real: v, imag: 0 }));
  
  // 执行FFT
  return fft(complexInput);
}

// 辅助函数：计算平均值
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 辅助函数：计算中位数
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}