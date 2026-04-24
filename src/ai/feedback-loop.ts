import type { SfxrParams } from '../types/index'
import { synthesize } from '../renderer/engine/sfxr'
import { parseDescription } from './description-parser'
import { optimizeParams } from './llm-client'
import { analyzeWaveform, formatAnalysis, type WaveformAnalysis } from './waveform-analyzer'

export interface FeedbackLoopResult {
  success: boolean
  finalParams: SfxrParams
  iterations: number
  history: Array<{
    iteration: number
    params: SfxrParams
    analysis: WaveformAnalysis
    adjustmentReason: string
  }>
  finalAnalysis: WaveformAnalysis
  samples: Float32Array
  error?: string
}

function paramsDistance(a: SfxrParams, b: SfxrParams): number {
  let sum = 0
  const keys = Object.keys(a) as (keyof SfxrParams)[]
  for (const key of keys) {
    sum += Math.abs((a[key] as number) - (b[key] as number))
  }
  return sum / keys.length
}

/**
 * Run a feedback loop: generate → analyze → optimize → repeat
 */
export async function runFeedbackLoop(
  description: string,
  options: {
    maxIterations?: number
    convergenceThreshold?: number
    initialParams?: SfxrParams
  } = {}
): Promise<FeedbackLoopResult> {
  const {
    maxIterations = 3,
    convergenceThreshold = 0.03,
    initialParams
  } = options

  const history: FeedbackLoopResult['history'] = []

  try {
    // Step 1: Parse description to get initial params
    let currentParams: SfxrParams
    if (initialParams) {
      currentParams = { ...initialParams }
    } else {
      const parseResult = await parseDescription(description)
      currentParams = parseResult.params
    }

    // Iterative optimization
    for (let i = 0; i < maxIterations; i++) {
      // Generate sound
      const { samples } = synthesize(currentParams)

      // Analyze waveform
      const analysis = analyzeWaveform(samples, 44100, currentParams)

      // If first iteration, just record and continue
      if (i === 0) {
        history.push({
          iteration: i + 1,
          params: { ...currentParams },
          analysis,
          adjustmentReason: 'Initial generation from description'
        })

        // If only 1 iteration requested, return immediately
        if (maxIterations === 1) {
          return {
            success: true,
            finalParams: currentParams,
            iterations: 1,
            history,
            finalAnalysis: analysis,
            samples
          }
        }
      }

      // Optimize
      const optimization = await optimizeParams(currentParams, description, analysis)
      const newParams = optimization.adjustedParams

      // Check convergence
      const distance = paramsDistance(currentParams, newParams)
      if (distance < convergenceThreshold) {
        history.push({
          iteration: i + 1,
          params: { ...newParams },
          analysis,
          adjustmentReason: `Converged (change=${distance.toFixed(4)}): ${optimization.reasoning}`
        })
        currentParams = newParams
        break
      }

      history.push({
        iteration: i + 1,
        params: { ...newParams },
        analysis,
        adjustmentReason: optimization.reasoning
      })

      currentParams = newParams
    }

    // Final generation with optimized params
    const { samples: finalSamples } = synthesize(currentParams)
    const finalAnalysis = analyzeWaveform(finalSamples, 44100, currentParams)

    return {
      success: true,
      finalParams: currentParams,
      iterations: history.length,
      history,
      finalAnalysis,
      samples: finalSamples
    }

  } catch (err) {
    return {
      success: false,
      finalParams: initialParams || {
        waveType: 0, attackTime: 0, sustainTime: 0.3, sustainPunch: 0, decayTime: 0.4,
        startFrequency: 0.3, minFrequency: 0, slide: 0, deltaSlide: 0,
        vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0,
        lpFilterCutoff: 1, lpFilterResonance: 0, lpFilterCutoffSweep: 0,
        hpFilterCutoff: 0, hpFilterCutoffSweep: 0, phaserOffset: 0, phaserSweep: 0,
        repeatSpeed: 0, masterVolume: 0.5
      },
      iterations: history.length,
      history,
      finalAnalysis: analyzeWaveform(new Float32Array(0)),
      samples: new Float32Array(0),
      error: String(err)
    }
  }
}

/**
 * Build a diagnosis string comparing desired sound vs actual analysis
 */

export { formatAnalysis, type WaveformAnalysis }
