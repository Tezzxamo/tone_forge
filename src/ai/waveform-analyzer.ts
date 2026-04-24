import type { SfxrParams } from '../types/index'

export interface WaveformAnalysis {
  /** 时长（秒） */
  duration: number
  /** 采样率 */
  sampleRate: number

  // === 响度 ===
  /** RMS 响度 (0-1) */
  rms: number
  /** 峰值电平 (0-1) */
  peak: number
  /** 动态范围 (dB) */
  dynamicRange: number

  // === 包络 ===
  /** 到达峰值的时间（秒） */
  attackTime: number
  /** 峰值后的衰减时间（秒，到 -60dB） */
  decayTime: number
  /** 峰值位置（样本索引） */
  peakIndex: number

  // === 音高 ===
  /** 估算基频 (Hz) */
  estimatedFreq: number
  /** 频率变化程度 (0-1) */
  freqVariation: number
  /** 音高变化方向: 'rising' | 'falling' | 'stable' */
  pitchDirection: 'rising' | 'falling' | 'stable'

  // === 频谱 ===
  /** 低频能量占比 <500Hz (0-1) */
  lowFreqEnergy: number
  /** 中频能量占比 500-4000Hz (0-1) */
  midFreqEnergy: number
  /** 高频能量占比 >4000Hz (0-1) */
  highFreqEnergy: number
  /** 明亮度：高频能量占比 (0-1) */
  brightness: number

  // === 音色 ===
  /** 噪声程度 (0-1, 0=纯音, 1=纯噪声) */
  noisiness: number
  /** 谐波丰富度 (0-1) */
  harmonicRichness: number
  /** 波形复杂度：熵值 (0-1) */
  complexity: number

  // === 综合评价 ===
  /** 是否短促音效 (attack+decay < 0.2s) */
  isPercussive: boolean
  /** 是否持续音效 (duration > 0.5s) */
  isSustained: boolean
  /** 是否低频为主 */
  isBassy: boolean
  /** 是否高频尖锐 */
  isSharp: boolean
}

/** 简单移动平均低通滤波器 */
function lowPass(samples: Float32Array, cutoffRatio: number): Float32Array {
  const windowSize = Math.max(1, Math.floor(1 / cutoffRatio))
  const result = new Float32Array(samples.length)
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i]
    if (i >= windowSize) sum -= samples[i - windowSize]
    result[i] = sum / Math.min(i + 1, windowSize)
  }
  return result
}

/** 计算 RMS 能量 */
function rms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

/** 计算峰值 */
function peakLevel(samples: Float32Array): number {
  let max = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > max) max = abs
  }
  return max
}

/** 自相关法估算基频 */
function estimateFundamental(samples: Float32Array, sampleRate: number): number {
  const maxLag = Math.min(samples.length, Math.floor(sampleRate / 40)) // 最低 40Hz
  const minLag = Math.floor(sampleRate / 4000) // 最高 4000Hz

  let bestLag = 0
  let bestCorr = -Infinity

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    const len = Math.min(samples.length - lag, 2048)
    for (let i = 0; i < len; i++) {
      corr += samples[i] * samples[i + lag]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (bestLag === 0) return 0
  return sampleRate / bestLag
}

/** 计算零交叉率变化（用于估算频率变化） */
function computeZeroCrossingRate(samples: Float32Array, frameSize: number): number[] {
  const rates: number[] = []
  for (let i = 0; i < samples.length - frameSize; i += frameSize) {
    let zc = 0
    for (let j = i + 1; j < i + frameSize; j++) {
      if ((samples[j] >= 0) !== (samples[j - 1] >= 0)) {
        zc++
      }
    }
    rates.push(zc / frameSize)
  }
  return rates
}

/** 计算样本熵（复杂度） */
function computeEntropy(samples: Float32Array): number {
  // 将样本量化为 32 个桶
  const bins = new Uint32Array(32)
  for (let i = 0; i < samples.length; i++) {
    const idx = Math.floor((samples[i] + 1) * 16)
    const clamped = Math.max(0, Math.min(31, idx))
    bins[clamped]++
  }

  let entropy = 0
  const total = samples.length
  for (let i = 0; i < 32; i++) {
    if (bins[i] > 0) {
      const p = bins[i] / total
      entropy -= p * Math.log2(p)
    }
  }
  // 归一化到 0-1（最大熵为 log2(32) = 5）
  return Math.min(1, entropy / 5)
}

/** 提取包络（滑动窗口 RMS） */
function extractEnvelope(samples: Float32Array, windowSize: number): Float32Array {
  const envelope = new Float32Array(samples.length)
  let sum = 0

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] * samples[i]
    sum += s
    if (i >= windowSize) sum -= samples[i - windowSize] * samples[i - windowSize]
    envelope[i] = Math.sqrt(sum / Math.min(i + 1, windowSize))
  }

  return envelope
}

/** 计算谐波丰富度：检测频谱峰值数量 */
function computeHarmonicRichness(samples: Float32Array, sampleRate: number): number {
  // 简化的自相关峰值检测
  const maxLag = Math.min(samples.length, Math.floor(sampleRate / 50))
  const correlations: number[] = []

  for (let lag = 20; lag < maxLag; lag += 10) {
    let corr = 0
    const len = Math.min(samples.length - lag, 1024)
    for (let i = 0; i < len; i++) {
      corr += samples[i] * samples[i + lag]
    }
    correlations.push(corr)
  }

  // 计算峰值的尖锐程度
  let peaks = 0
  for (let i = 1; i < correlations.length - 1; i++) {
    if (correlations[i] > correlations[i - 1] && correlations[i] > correlations[i + 1]) {
      peaks++
    }
  }

  return Math.min(1, peaks / 10)
}

/**
 * 分析波形样本，提取可量化的音频特征
 */
export function analyzeWaveform(
  samples: Float32Array,
  sampleRate: number = 44100,
  _params?: SfxrParams
): WaveformAnalysis {
  const duration = samples.length / sampleRate

  // 响度
  const rmsVal = rms(samples)
  const peakVal = peakLevel(samples)
  const dynamicRangeDb = peakVal > 0.0001 ? 20 * Math.log10(peakVal / Math.max(rmsVal, 0.00001)) : 0

  // 包络分析
  const windowSize = Math.floor(sampleRate * 0.005) // 5ms 窗口
  const envelope = extractEnvelope(samples, windowSize)

  let peakIndex = 0
  let maxEnv = 0
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] > maxEnv) {
      maxEnv = envelope[i]
      peakIndex = i
    }
  }
  const attackTime = peakIndex / sampleRate

  // 衰减时间：从峰值到 -60dB (0.001 倍)
  const threshold = maxEnv * 0.001
  let decayEnd = peakIndex
  for (let i = peakIndex; i < envelope.length; i++) {
    if (envelope[i] < threshold) {
      decayEnd = i
      break
    }
  }
  const decayTime = (decayEnd - peakIndex) / sampleRate

  // 音高分析
  const estimatedFreq = estimateFundamental(samples, sampleRate)
  const zcrFrames = computeZeroCrossingRate(samples, Math.floor(sampleRate * 0.02))

  let freqVariation = 0
  if (zcrFrames.length > 1) {
    let sumVar = 0
    for (let i = 1; i < zcrFrames.length; i++) {
      sumVar += Math.abs(zcrFrames[i] - zcrFrames[i - 1])
    }
    freqVariation = Math.min(1, sumVar / zcrFrames.length * 10)
  }

  // 音高方向
  let pitchDirection: 'rising' | 'falling' | 'stable' = 'stable'
  if (zcrFrames.length >= 3) {
    const first = zcrFrames.slice(0, Math.floor(zcrFrames.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(zcrFrames.length / 3)
    const last = zcrFrames.slice(Math.floor(zcrFrames.length * 2 / 3)).reduce((a, b) => a + b, 0) / (zcrFrames.length - Math.floor(zcrFrames.length * 2 / 3))
    const diff = last - first
    if (diff > 0.02) pitchDirection = 'rising'
    else if (diff < -0.02) pitchDirection = 'falling'
  }

  // 频谱能量分析（用简单滤波器分离频带）
  const lowPass500 = lowPass(samples, 500 / sampleRate)   // < 500Hz
  const lowPass4000 = lowPass(samples, 4000 / sampleRate) // < 4000Hz

  const lowEnergy = rms(lowPass500)
  const midAndLowEnergy = rms(lowPass4000)
  const totalEnergy = rmsVal

  // 高频 = 总 - 低通4000
  const highEnergy = Math.sqrt(Math.max(0, totalEnergy * totalEnergy - midAndLowEnergy * midAndLowEnergy))
  const midEnergy = Math.sqrt(Math.max(0, midAndLowEnergy * midAndLowEnergy - lowEnergy * lowEnergy))

  const energySum = lowEnergy + midEnergy + highEnergy + 0.00001
  const lowFreqEnergy = lowEnergy / energySum
  const midFreqEnergy = midEnergy / energySum
  const highFreqEnergy = highEnergy / energySum
  const brightness = highFreqEnergy + midFreqEnergy * 0.3

  // 音色分析
  const complexity = computeEntropy(samples)
  const harmonicRichness = computeHarmonicRichness(samples, sampleRate)

  // 噪声程度：如果基频检测失败（自相关峰值不明显），则认为是噪声
  // 简单判断：如果波形熵高且谐波丰富度低，则为噪声
  const noisiness = Math.min(1, complexity * 1.2 - harmonicRichness * 0.5)

  // 综合评价
  const isPercussive = (attackTime + decayTime) < 0.2
  const isSustained = duration > 0.5
  const isBassy = lowFreqEnergy > 0.5
  const isSharp = highFreqEnergy > 0.4 || estimatedFreq > 2000

  return {
    duration,
    sampleRate,
    rms: rmsVal,
    peak: peakVal,
    dynamicRange: dynamicRangeDb,
    attackTime,
    decayTime,
    peakIndex,
    estimatedFreq,
    freqVariation,
    pitchDirection,
    lowFreqEnergy,
    midFreqEnergy,
    highFreqEnergy,
    brightness,
    noisiness,
    harmonicRichness,
    complexity,
    isPercussive,
    isSustained,
    isBassy,
    isSharp
  }
}

/**
 * 将分析结果格式化为人类可读的报告
 */
export function formatAnalysis(analysis: WaveformAnalysis): string {
  const lines = [
    `时长: ${analysis.duration.toFixed(3)}s`,
    `响度: RMS=${analysis.rms.toFixed(4)}, 峰值=${analysis.peak.toFixed(4)}`,
    `包络: Attack=${(analysis.attackTime * 1000).toFixed(1)}ms, Decay=${(analysis.decayTime * 1000).toFixed(1)}ms`,
    `音高: ~${analysis.estimatedFreq.toFixed(0)}Hz, 变化=${(analysis.freqVariation * 100).toFixed(1)}%, 方向=${analysis.pitchDirection}`,
    `频谱: 低频=${(analysis.lowFreqEnergy * 100).toFixed(1)}%, 中频=${(analysis.midFreqEnergy * 100).toFixed(1)}%, 高频=${(analysis.highFreqEnergy * 100).toFixed(1)}%`,
    `音色: 噪声度=${(analysis.noisiness * 100).toFixed(1)}%, 复杂度=${(analysis.complexity * 100).toFixed(1)}%, 谐波丰富度=${(analysis.harmonicRichness * 100).toFixed(1)}%`,
    `特征: ${analysis.isPercussive ? '短促' : '持续'} | ${analysis.isBassy ? '低频为主' : ''} | ${analysis.isSharp ? '尖锐' : ''}`
  ]
  return lines.join('\n')
}
