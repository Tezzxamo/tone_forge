// sfxr 核心合成引擎
// 基于 sfxr / jsfxr 算法，TypeScript 重写

import type { SfxrParams } from '../../types/index'

const SAMPLE_RATE = 44100

export interface SynthesizedSound {
  samples: Float32Array
  duration: number
}

export function synthesize(params: SfxrParams): SynthesizedSound {
  // 参数转换（将 0~1 归一化参数转为实际合成参数）
  const p = normalizeParams(params)

  // 计算总时长（秒）
  const totalTime = p.attack + p.sustain + p.decay
  const totalSamples = Math.ceil(totalTime * SAMPLE_RATE)

  const samples = new Float32Array(totalSamples)

  // 合成器状态
  let phase = 0
  let fperiod = 100.0 / (p.startFrequency * p.startFrequency + 0.001)
  let period = Math.floor(fperiod)
  const maxperiod = Math.floor(100.0 / (p.minFrequency * p.minFrequency + 0.001))
  let slide = 1.0 - p.slide * p.slide * p.slide * 0.01
  let dslide = -p.deltaSlide * p.deltaSlide * p.deltaSlide * 0.000001

  // 方波占空比
  let squareDuty = 0.5 - p.duty * 0.5
  let squareSlide = -p.dutySweep * 0.00005

  // 振动
  let vibratoPhase = 0
  const vibratoSpeed = p.vibratoSpeed * p.vibratoSpeed * 0.01
  const vibratoAmplitude = p.vibratoDepth * 0.5

  // 音高变化
  let changePhase = 0
  const changeSpeed = p.changeSpeed * p.changeSpeed * 0.001
  const changeAmount = p.changeAmount > 0 ? 1.0 - p.changeAmount * p.changeAmount * 0.9 : 1.0 + p.changeAmount * p.changeAmount * 10.0

  // 滤波器状态
  let fltp = 0, fltdp = 0, fltw = Math.pow(p.lpFilterCutoff, 3) * 0.1
  let fltwD = 1.0 + p.lpFilterCutoffSweep * 0.0001
  let fltdmp = 5.0 / (1.0 + Math.pow(p.lpFilterResonance, 2) * 20.0) * (0.01 + fltw)
  if (fltdmp > 0.8) fltdmp = 0.8
  let fltphp = 0
  let flthp = Math.pow(p.hpFilterCutoff, 2) * 0.1
  let flthpD = 1.0 + p.hpFilterCutoffSweep * 0.0003

  // 相位器
  let phaserPhase = 0
  let phaserDelta = p.phaserSweep * p.phaserSweep * p.phaserSweep * 0.0002
  const phaserInt = Math.floor(Math.pow(p.phaserOffset, 2) * 1020)
  if (p.phaserOffset < 0) phaserDelta = -phaserDelta
  const phaserBuffer = new Float32Array(1024)

  // 重复
  let repeatPhase = 0
  let repeatLimit = Math.floor(Math.pow(1.0 - p.repeatSpeed, 2) * 20000 + 32)
  if (p.repeatSpeed === 0) repeatLimit = 0

  // 包络
  let envVolume = 0
  let envStage = 0
  let envTime = 0
  const envLength = [
    Math.max(1, Math.floor(p.attack * p.attack * 100000)),
    Math.max(1, Math.floor(p.sustain * p.sustain * 100000)),
    Math.max(1, Math.floor(p.decay * p.decay * 100000))
  ]

  // 噪声生成器状态
  let noiseBuffer: number[] = []
  for (let i = 0; i < 32; i++) {
    noiseBuffer.push(Math.random() * 2 - 1)
  }

  // 主合成循环
  for (let i = 0; i < totalSamples; i++) {
    // 重复逻辑
    if (repeatLimit !== 0) {
      repeatPhase++
      if (repeatPhase >= repeatLimit) {
        repeatPhase = 0
        // 重置合成器状态
        period = Math.floor(fperiod)
        squareDuty = 0.5 - p.duty * 0.5
        phase = 0
        fltp = 0
        fltdp = 0
        fltphp = 0
        flthp = Math.pow(p.hpFilterCutoff, 2) * 0.1
        phaserPhase = 0
        envVolume = 0
        envStage = 0
        envTime = 0
      }
    }

    // 包络
    envTime++
    while (envStage < 3 && envTime > envLength[envStage]) {
      envTime -= envLength[envStage]
      envStage++
    }
    switch (envStage) {
      case 0:
        envVolume = envTime / envLength[0]
        break
      case 1:
        envVolume = 1.0 + (1.0 - envTime / envLength[1]) * 2.0 * p.sustainPunch
        break
      case 2:
        envVolume = 1.0 - envTime / envLength[2]
        break
      case 3:
        envVolume = 0
        break
    }

    // 音高变化
    changePhase += changeSpeed
    if (changePhase > 1.0) {
      changePhase = 0
      fperiod *= changeAmount
    }

    // 振动
    vibratoPhase += vibratoSpeed
    const vibratoOffset = Math.sin(vibratoPhase) * vibratoAmplitude * fperiod * 0.5

    // 滑音
    slide += dslide
    fperiod *= slide
    if (fperiod > maxperiod) {
      fperiod = maxperiod
      if (p.minFrequency > 0) slide = 1.0
    }
    period = Math.max(2, Math.floor(fperiod + vibratoOffset))

    // 方波占空比
    squareDuty += squareSlide
    if (squareDuty < 0) squareDuty = 0
    if (squareDuty > 0.5) squareDuty = 0.5

    // 相位器
    phaserPhase += phaserDelta
    const phaserIntCur = Math.floor(phaserPhase + phaserInt)
    let phaserBufferIndex = phaserIntCur & 1023

    // 生成波形
    phase++
    if (phase >= period) {
      phase = 0
      // 更新噪声缓冲
      if (p.waveType === 3) {
        for (let j = 0; j < 32; j++) {
          noiseBuffer[j] = Math.random() * 2 - 1
        }
      }
    }

    let sample = 0
    const phasePos = phase / period

    switch (p.waveType) {
      case 0: // 方波
        sample = phasePos < squareDuty ? 0.5 : -0.5
        break
      case 1: // 锯齿波
        sample = 1.0 - phasePos * 2.0
        break
      case 2: // 正弦波
        sample = Math.sin(phasePos * Math.PI * 2.0)
        break
      case 3: // 噪声
        sample = noiseBuffer[Math.floor(phasePos * 32)]
        break
    }

    // 应用 LP 滤波器
    const pp = fltp
    fltw *= fltwD
    if (fltw < 0) fltw = 0
    if (fltw > 0.1) fltw = 0.1
    fltdmp = 5.0 / (1.0 + Math.pow(p.lpFilterResonance, 2) * 20.0) * (0.01 + fltw)
    if (fltdmp > 0.8) fltdmp = 0.8

    fltdp += (sample - fltp) * fltw
    fltdp -= fltdp * fltdmp
    fltp += fltdp

    // 应用 HP 滤波器
    flthp *= flthpD
    if (flthp < 0.00001) flthp = 0.00001
    fltphp += fltp - pp
    fltphp -= fltphp * flthp
    sample = fltphp

    // 应用相位器
    phaserBuffer[phaserBufferIndex] = sample
    sample += phaserBuffer[(phaserBufferIndex - phaserIntCur + 1024) & 1023]
    sample *= 0.5

    // 应用音量包络和主音量
    sample *= envVolume * p.masterVolume

    samples[i] = sample
  }

  return {
    samples,
    duration: totalTime
  }
}

// 将归一化参数转换为实际合成参数
interface InternalParams {
  waveType: number
  attack: number
  sustain: number
  sustainPunch: number
  decay: number
  startFrequency: number
  minFrequency: number
  slide: number
  deltaSlide: number
  vibratoDepth: number
  vibratoSpeed: number
  changeAmount: number
  changeSpeed: number
  lpFilterCutoff: number
  lpFilterResonance: number
  lpFilterCutoffSweep: number
  hpFilterCutoff: number
  hpFilterCutoffSweep: number
  phaserOffset: number
  phaserSweep: number
  repeatSpeed: number
  duty: number
  dutySweep: number
  masterVolume: number
}

function normalizeParams(params: SfxrParams): InternalParams {
  return {
    waveType: params.waveType,
    attack: params.attackTime,
    sustain: params.sustainTime,
    sustainPunch: params.sustainPunch,
    decay: params.decayTime,
    startFrequency: params.startFrequency,
    minFrequency: params.minFrequency,
    slide: params.slide,
    deltaSlide: params.deltaSlide,
    vibratoDepth: params.vibratoDepth,
    vibratoSpeed: params.vibratoSpeed,
    changeAmount: params.changeAmount,
    changeSpeed: params.changeSpeed,
    lpFilterCutoff: params.lpFilterCutoff,
    lpFilterResonance: params.lpFilterResonance,
    lpFilterCutoffSweep: params.lpFilterCutoffSweep,
    hpFilterCutoff: params.hpFilterCutoff,
    hpFilterCutoffSweep: params.hpFilterCutoffSweep,
    phaserOffset: params.phaserOffset,
    phaserSweep: params.phaserSweep,
    repeatSpeed: params.repeatSpeed,
    duty: 0,
    dutySweep: 0,
    masterVolume: params.masterVolume
  }
}

export function randomizeParams(): SfxrParams {
  return {
    waveType: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
    attackTime: Math.pow(Math.random(), 2),
    sustainTime: Math.pow(Math.random(), 2),
    sustainPunch: Math.pow(Math.random(), 3),
    decayTime: Math.random(),
    startFrequency: Math.random(),
    minFrequency: 0,
    slide: Math.random() * 2 - 1,
    deltaSlide: 0,
    vibratoDepth: Math.random() < 0.5 ? 0 : Math.random(),
    vibratoSpeed: Math.random(),
    changeAmount: Math.random() < 0.5 ? 0 : Math.random() * 2 - 1,
    changeSpeed: Math.random(),
    lpFilterCutoff: 1,
    lpFilterResonance: Math.random() < 0.5 ? 0 : Math.random(),
    lpFilterCutoffSweep: Math.random() < 0.5 ? 0 : Math.random() * 2 - 1,
    hpFilterCutoff: 0,
    hpFilterCutoffSweep: 0,
    phaserOffset: Math.random() < 0.5 ? 0 : Math.random() * 2 - 1,
    phaserSweep: Math.random() < 0.5 ? 0 : Math.random() * 2 - 1,
    repeatSpeed: Math.random() < 0.5 ? 0 : Math.random(),
    masterVolume: 0.5
  }
}

export function mutateParams(params: SfxrParams, amount: number = 0.1): SfxrParams {
  const mutated: SfxrParams = { ...params }
  const keys = Object.keys(params) as (keyof SfxrParams)[]
  for (const key of keys) {
    if (key === 'waveType') {
      if (Math.random() < amount) {
        mutated.waveType = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3
      }
    } else {
      const val = params[key] as number
      const delta = (Math.random() * 2 - 1) * amount
      let newVal = val + delta
      if (newVal < 0) newVal = 0
      if (newVal > 1) newVal = 1
      ;(mutated as unknown as Record<string, number>)[key] = newVal
    }
  }
  return mutated
}
