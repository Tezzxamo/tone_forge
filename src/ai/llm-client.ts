import type { SfxrParams } from '../types/index'
import { SFXR_SYSTEM_PROMPT, OPTIMIZATION_SYSTEM_PROMPT } from './prompts/system-prompt'
import type { WaveformAnalysis } from './waveform-analyzer'

export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
}

function getConfig(): LLMConfig {
  return {
    apiKey: process.env['TONEFORGE_LLM_API_KEY'] || '',
    baseUrl: process.env['TONEFORGE_LLM_BASE_URL'] || 'https://api.openai.com/v1',
    model: process.env['TONEFORGE_LLM_MODEL'] || 'gpt-4o-mini'
  }
}

function isConfigured(): boolean {
  const cfg = getConfig()
  return cfg.apiKey.length > 0
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = getConfig()
  if (!cfg.apiKey) {
    throw new Error(
      'LLM not configured. Set TONEFORGE_LLM_API_KEY env variable.\n' +
      'Optional: TONEFORGE_LLM_BASE_URL (default: OpenAI), TONEFORGE_LLM_MODEL (default: gpt-4o-mini)'
    )
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM API error (${response.status}): ${text}`)
  }

  const data = await response.json() as LLMResponse
  return data.choices[0]?.message?.content || ''
}

function extractJSON(text: string): string {
  // Try to find JSON object in the response
  const match = text.match(/\{[\s\S]*\}/)
  if (match) return match[0]
  return text
}

function validateParams(params: Partial<SfxrParams>): SfxrParams {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  return {
    waveType: clamp(Math.round(params.waveType ?? 0), 0, 3) as 0 | 1 | 2 | 3,
    attackTime: clamp(params.attackTime ?? 0, 0, 1),
    sustainTime: clamp(params.sustainTime ?? 0.3, 0, 1),
    sustainPunch: clamp(params.sustainPunch ?? 0, 0, 1),
    decayTime: clamp(params.decayTime ?? 0.4, 0, 1),
    startFrequency: clamp(params.startFrequency ?? 0.3, 0, 1),
    minFrequency: clamp(params.minFrequency ?? 0, 0, 1),
    slide: clamp(params.slide ?? 0, -1, 1),
    deltaSlide: clamp(params.deltaSlide ?? 0, -1, 1),
    vibratoDepth: clamp(params.vibratoDepth ?? 0, 0, 1),
    vibratoSpeed: clamp(params.vibratoSpeed ?? 0, 0, 1),
    changeAmount: clamp(params.changeAmount ?? 0, -1, 1),
    changeSpeed: clamp(params.changeSpeed ?? 0, 0, 1),
    lpFilterCutoff: clamp(params.lpFilterCutoff ?? 1, 0, 1),
    lpFilterResonance: clamp(params.lpFilterResonance ?? 0, 0, 1),
    lpFilterCutoffSweep: clamp(params.lpFilterCutoffSweep ?? 0, -1, 1),
    hpFilterCutoff: clamp(params.hpFilterCutoff ?? 0, 0, 1),
    hpFilterCutoffSweep: clamp(params.hpFilterCutoffSweep ?? 0, -1, 1),
    phaserOffset: clamp(params.phaserOffset ?? 0, -1, 1),
    phaserSweep: clamp(params.phaserSweep ?? 0, -1, 1),
    repeatSpeed: clamp(params.repeatSpeed ?? 0, 0, 1),
    masterVolume: clamp(params.masterVolume ?? 0.5, 0, 1)
  }
}

/**
 * Parse a natural language description into sfxr parameters using LLM
 */
export async function parseDescription(description: string): Promise<SfxrParams> {
  const content = await callLLM(SFXR_SYSTEM_PROMPT, description)
  const jsonText = extractJSON(content)

  try {
    const parsed = JSON.parse(jsonText) as Partial<SfxrParams>
    return validateParams(parsed)
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON: ${err}. Response: ${content.substring(0, 200)}`)
  }
}

export interface OptimizationResult {
  adjustedParams: SfxrParams
  reasoning: string
}

/**
 * Optimize parameters based on waveform analysis feedback
 */
export async function optimizeParams(
  current: SfxrParams,
  description: string,
  analysis: WaveformAnalysis
): Promise<OptimizationResult> {
  const userPrompt = `Original description: ${description}

Current parameters:
${JSON.stringify(current, null, 2)}

Waveform analysis:
${JSON.stringify(analysis, null, 2)}

Please analyze what's wrong and adjust parameters to better match the desired sound.`

  const content = await callLLM(OPTIMIZATION_SYSTEM_PROMPT, userPrompt)
  const jsonText = extractJSON(content)

  try {
    const parsed = JSON.parse(jsonText) as { adjustedParams?: Partial<SfxrParams>; reasoning?: string }
    return {
      adjustedParams: validateParams(parsed.adjustedParams || {}),
      reasoning: parsed.reasoning || 'No reasoning provided'
    }
  } catch (err) {
    throw new Error(`Failed to parse optimization response: ${err}`)
  }
}

export { isConfigured, getConfig }
