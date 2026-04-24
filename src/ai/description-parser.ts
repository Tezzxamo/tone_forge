import type { SfxrParams } from '../types/index'
import { parseDescription as llmParse, isConfigured } from './llm-client'
import { presets } from '../renderer/presets/index'

// Keyword → preset ID mapping for fallback
const keywordMappings: Array<{ keywords: string[]; presetId: string }> = [
  { keywords: ['点击', 'click', 'tap', 'press', 'button'], presetId: 'ui-click' },
  { keywords: ['悬停', 'hover', 'roll over', 'mouse over'], presetId: 'ui-hover' },
  { keywords: ['错误', 'error', 'fail', 'wrong', 'buzz', 'denied'], presetId: 'ui-error' },
  { keywords: ['拾取', 'pickup', 'collect', 'coin', 'gem', 'item', '获取'], presetId: 'item-pickup' },
  { keywords: ['挥击', 'swing', 'swoosh', 'whoosh', 'slash', '砍'], presetId: 'sword-swing' },
  { keywords: ['命中', 'hit', 'impact', 'clash', 'strike', '砍中'], presetId: 'sword-hit' },
  { keywords: ['重击', 'heavy', 'smash', 'crush', 'pound', '猛击'], presetId: 'heavy-hit' },
  { keywords: ['盾牌', 'shield', 'block', 'parry', '防御', '格挡'], presetId: 'shield-block' },
  { keywords: ['射箭', 'arrow', 'shoot', 'bow', '射'], presetId: 'arrow-shoot' },
  { keywords: ['火球', 'fireball', 'fire', 'flame', 'burn', '魔法'], presetId: 'fireball' },
  { keywords: ['爆炸', 'explosion', 'boom', 'blast', 'bomb', '炸'], presetId: 'explosion' },
  { keywords: ['受击', 'hurt', 'damage', 'ouch', '被打'], presetId: 'enemy-hit' },
  { keywords: ['死亡', 'death', 'die', 'defeat', 'kill', '死'], presetId: 'enemy-death' },
  { keywords: ['升级', 'level up', 'levelup', 'up', 'win', 'victory', '胜利'], presetId: 'level-up' },
  { keywords: ['清理', 'clear', 'room clear', 'stage clear', '过关'], presetId: 'room-clear' },
  { keywords: ['开门', 'door', 'open', 'creak', '机关'], presetId: 'door-open' },
  { keywords: ['记忆', 'memory', 'dream', 'ethereal', 'fairy', '精灵'], presetId: 'memory-collect' },
  { keywords: ['激光', 'laser', 'beam', 'pew', '射击', '枪'], presetId: 'arrow-shoot' },
  { keywords: ['跳跃', 'jump', 'bounce', 'hop', '弹'], presetId: 'item-pickup' },
  { keywords: ['通知', 'alert', 'alarm', 'notification', '提醒'], presetId: 'ui-click' }
]

function keywordFallback(description: string): SfxrParams | null {
  const lower = description.toLowerCase()
  for (const mapping of keywordMappings) {
    for (const kw of mapping.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        const preset = presets.find(p => p.id === mapping.presetId)
        if (preset) {
          return { ...preset.params }
        }
      }
    }
  }
  return null
}

export interface ParseResult {
  params: SfxrParams
  source: 'llm' | 'keyword' | 'default'
  matchedPreset?: string
}

/**
 * Parse a natural language description into sfxr parameters.
 * Tries LLM first, falls back to keyword matching, then default.
 */
export async function parseDescription(description: string): Promise<ParseResult> {
  if (!description || !description.trim()) {
    throw new Error('Description cannot be empty')
  }

  // Try LLM first if configured
  if (isConfigured()) {
    try {
      const params = await llmParse(description)
      return { params, source: 'llm' }
    } catch (err) {
      console.warn(`LLM parsing failed, falling back to keyword matching: ${err}`)
    }
  }

  // Fallback to keyword matching
  const fallback = keywordFallback(description)
  if (fallback) {
    const matchedPreset = keywordMappings.find(m =>
      m.keywords.some(k => description.toLowerCase().includes(k.toLowerCase()))
    )?.presetId
    return { params: fallback, source: 'keyword', matchedPreset }
  }

  // Ultimate fallback: random-ish default with slight variations
  return {
    params: {
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.1,
      sustainPunch: 0.2,
      decayTime: 0.3,
      startFrequency: 0.4,
      minFrequency: 0,
      slide: 0,
      deltaSlide: 0,
      vibratoDepth: 0,
      vibratoSpeed: 0,
      changeAmount: 0,
      changeSpeed: 0,
      lpFilterCutoff: 1,
      lpFilterResonance: 0,
      lpFilterCutoffSweep: 0,
      hpFilterCutoff: 0,
      hpFilterCutoffSweep: 0,
      phaserOffset: 0,
      phaserSweep: 0,
      repeatSpeed: 0,
      masterVolume: 0.5
    },
    source: 'default'
  }
}
