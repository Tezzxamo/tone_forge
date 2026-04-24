import type { Preset, SfxrParams } from '../../types/index'

function p(params: Partial<SfxrParams>): SfxrParams {
  return {
    waveType: 0,
    attackTime: 0,
    sustainTime: 0.3,
    sustainPunch: 0,
    decayTime: 0.4,
    startFrequency: 0.3,
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
    masterVolume: 0.5,
    ...params
  }
}

export const presets: Preset[] = [
  // === UI 音效 ===
  {
    id: 'ui-click',
    name: 'UI 点击',
    nameEn: 'UI Click',
    category: 'UI',
    params: p({
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.015,
      sustainPunch: 0.35,
      decayTime: 0.08,
      startFrequency: 0.82,
      slide: 0.15,
      lpFilterCutoff: 0.85,
      lpFilterResonance: 0.2,
      masterVolume: 0.45
    })
  },
  {
    id: 'ui-hover',
    name: 'UI 悬停',
    nameEn: 'UI Hover',
    category: 'UI',
    params: p({
      waveType: 2,
      attackTime: 0,
      sustainTime: 0.02,
      sustainPunch: 0.1,
      decayTime: 0.12,
      startFrequency: 0.75,
      slide: 0.25,
      lpFilterCutoff: 0.9,
      masterVolume: 0.2
    })
  },
  {
    id: 'ui-error',
    name: 'UI 错误',
    nameEn: 'UI Error',
    category: 'UI',
    params: p({
      waveType: 3,
      attackTime: 0,
      sustainTime: 0.12,
      sustainPunch: 0.2,
      decayTime: 0.35,
      startFrequency: 0.18,
      slide: -0.25,
      vibratoDepth: 0.35,
      vibratoSpeed: 0.6,
      lpFilterCutoff: 0.25,
      lpFilterResonance: 0.4,
      hpFilterCutoff: 0.15,
      masterVolume: 0.45
    })
  },
  {
    id: 'item-pickup',
    name: '拾取物品',
    nameEn: 'Item Pickup',
    category: 'UI',
    params: p({
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.06,
      sustainPunch: 0.3,
      decayTime: 0.22,
      startFrequency: 0.55,
      minFrequency: 0.15,
      slide: 0.45,
      vibratoDepth: 0.15,
      vibratoSpeed: 0.7,
      lpFilterCutoff: 0.9,
      masterVolume: 0.4
    })
  },

  // === 战斗音效 ===
  {
    id: 'sword-swing',
    name: '剑挥击',
    nameEn: 'Sword Swing',
    category: '战斗',
    params: p({
      waveType: 3,
      attackTime: 0.02,
      sustainTime: 0.04,
      sustainPunch: 0.15,
      decayTime: 0.2,
      startFrequency: 0.72,
      minFrequency: 0.1,
      slide: -0.55,
      lpFilterCutoff: 0.5,
      lpFilterCutoffSweep: -0.35,
      lpFilterResonance: 0.25,
      masterVolume: 0.45
    })
  },
  {
    id: 'sword-hit',
    name: '剑命中',
    nameEn: 'Sword Hit',
    category: '战斗',
    params: p({
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.015,
      sustainPunch: 0.65,
      decayTime: 0.14,
      startFrequency: 0.48,
      minFrequency: 0.08,
      slide: -0.35,
      lpFilterCutoff: 0.65,
      lpFilterResonance: 0.45,
      vibratoDepth: 0.1,
      vibratoSpeed: 0.8,
      masterVolume: 0.5
    })
  },
  {
    id: 'heavy-hit',
    name: '重击',
    nameEn: 'Heavy Hit',
    category: '战斗',
    params: p({
      waveType: 1,
      attackTime: 0.01,
      sustainTime: 0.06,
      sustainPunch: 0.55,
      decayTime: 0.45,
      startFrequency: 0.2,
      minFrequency: 0.05,
      slide: -0.2,
      lpFilterCutoff: 0.35,
      lpFilterResonance: 0.35,
      lpFilterCutoffSweep: -0.25,
      hpFilterCutoff: 0.08,
      masterVolume: 0.6
    })
  },
  {
    id: 'shield-block',
    name: '盾牌格挡',
    nameEn: 'Shield Block',
    category: '战斗',
    params: p({
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.04,
      sustainPunch: 0.5,
      decayTime: 0.35,
      startFrequency: 0.28,
      minFrequency: 0.1,
      slide: 0.05,
      vibratoDepth: 0.25,
      vibratoSpeed: 0.45,
      lpFilterCutoff: 0.55,
      lpFilterResonance: 0.3,
      phaserOffset: 0.15,
      masterVolume: 0.5
    })
  },
  {
    id: 'arrow-shoot',
    name: '射箭',
    nameEn: 'Arrow Shoot',
    category: '战斗',
    params: p({
      waveType: 3,
      attackTime: 0.01,
      sustainTime: 0.02,
      sustainPunch: 0.2,
      decayTime: 0.22,
      startFrequency: 0.68,
      minFrequency: 0.2,
      slide: -0.65,
      lpFilterCutoff: 0.55,
      lpFilterCutoffSweep: -0.3,
      masterVolume: 0.4
    })
  },

  {
    id: 'fireball',
    name: '火球',
    nameEn: 'Fireball',
    category: '战斗',
    params: p({
      waveType: 3,
      attackTime: 0.08,
      sustainTime: 0.15,
      sustainPunch: 0.35,
      decayTime: 0.55,
      startFrequency: 0.32,
      minFrequency: 0.05,
      slide: -0.35,
      vibratoDepth: 0.35,
      vibratoSpeed: 0.35,
      lpFilterCutoff: 0.35,
      lpFilterResonance: 0.2,
      lpFilterCutoffSweep: -0.3,
      changeAmount: 0.3,
      changeSpeed: 0.25,
      masterVolume: 0.5
    })
  },
  {
    id: 'explosion',
    name: '爆炸',
    nameEn: 'Explosion',
    category: '战斗',
    params: p({
      waveType: 3,
      attackTime: 0,
      sustainTime: 0.12,
      sustainPunch: 0.75,
      decayTime: 0.65,
      startFrequency: 0.12,
      minFrequency: 0.02,
      slide: -0.15,
      lpFilterCutoff: 0.25,
      lpFilterCutoffSweep: -0.35,
      lpFilterResonance: 0.15,
      hpFilterCutoff: 0.08,
      masterVolume: 0.7
    })
  },
  {
    id: 'enemy-hit',
    name: '敌人受击',
    nameEn: 'Enemy Hit',
    category: '战斗',
    params: p({
      waveType: 0,
      attackTime: 0,
      sustainTime: 0.015,
      sustainPunch: 0.55,
      decayTime: 0.16,
      startFrequency: 0.3,
      minFrequency: 0.08,
      slide: -0.4,
      lpFilterCutoff: 0.45,
      lpFilterResonance: 0.25,
      vibratoDepth: 0.12,
      vibratoSpeed: 0.65,
      masterVolume: 0.45
    })
  },
  {
    id: 'enemy-death',
    name: '敌人死亡',
    nameEn: 'Enemy Death',
    category: '战斗',
    params: p({
      waveType: 1,
      attackTime: 0.02,
      sustainTime: 0.08,
      sustainPunch: 0.3,
      decayTime: 0.65,
      startFrequency: 0.35,
      minFrequency: 0.05,
      slide: -0.45,
      lpFilterCutoff: 0.35,
      lpFilterCutoffSweep: -0.25,
      lpFilterResonance: 0.2,
      changeAmount: 0.35,
      changeSpeed: 0.2,
      vibratoDepth: 0.2,
      vibratoSpeed: 0.3,
      masterVolume: 0.5
    })
  },

  // === 系统音效 ===
  {
    id: 'level-up',
    name: '升级',
    nameEn: 'Level Up',
    category: '系统',
    params: p({
      waveType: 0,
      attackTime: 0.02,
      sustainTime: 0.12,
      sustainPunch: 0.25,
      decayTime: 0.45,
      startFrequency: 0.35,
      minFrequency: 0.1,
      slide: 0.55,
      changeAmount: 0.45,
      changeSpeed: 0.35,
      vibratoDepth: 0.18,
      vibratoSpeed: 0.55,
      lpFilterCutoff: 0.85,
      lpFilterResonance: 0.15,
      masterVolume: 0.5
    })
  },
  {
    id: 'room-clear',
    name: '房间清理',
    nameEn: 'Room Clear',
    category: '系统',
    params: p({
      waveType: 0,
      attackTime: 0.03,
      sustainTime: 0.15,
      sustainPunch: 0.2,
      decayTime: 0.55,
      startFrequency: 0.42,
      minFrequency: 0.12,
      slide: 0.25,
      changeAmount: -0.35,
      changeSpeed: 0.35,
      vibratoDepth: 0.15,
      vibratoSpeed: 0.5,
      lpFilterCutoff: 0.8,
      lpFilterResonance: 0.2,
      phaserOffset: 0.2,
      phaserSweep: 0.08,
      masterVolume: 0.5
    })
  },
  {
    id: 'door-open',
    name: '开门',
    nameEn: 'Door Open',
    category: '系统',
    params: p({
      waveType: 1,
      attackTime: 0.12,
      sustainTime: 0.15,
      sustainPunch: 0.1,
      decayTime: 0.35,
      startFrequency: 0.18,
      minFrequency: 0.05,
      slide: 0.35,
      lpFilterCutoff: 0.35,
      lpFilterResonance: 0.25,
      lpFilterCutoffSweep: 0.15,
      vibratoDepth: 0.08,
      vibratoSpeed: 0.25,
      masterVolume: 0.4
    })
  },
  {
    id: 'memory-collect',
    name: '收集记忆',
    nameEn: 'Memory Collect',
    category: '系统',
    params: p({
      waveType: 2,
      attackTime: 0.05,
      sustainTime: 0.15,
      sustainPunch: 0.15,
      decayTime: 0.5,
      startFrequency: 0.58,
      minFrequency: 0.2,
      slide: 0.45,
      vibratoDepth: 0.3,
      vibratoSpeed: 0.5,
      lpFilterCutoff: 0.85,
      lpFilterResonance: 0.15,
      phaserOffset: 0.35,
      phaserSweep: 0.12,
      changeAmount: 0.25,
      changeSpeed: 0.2,
      masterVolume: 0.4
    })
  }
]

export const presetCategories = [...new Set(presets.map(p => p.category))]
