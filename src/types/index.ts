// IPC 通道常量
export const IPC_CHANNELS = {
  SAVE_WAV: 'save-wav',
  SELECT_OUTPUT_DIR: 'select-output-dir',
  SAVE_JSON: 'save-json',
  LOAD_JSON: 'load-json'
} as const

// sfxr 参数接口
export interface SfxrParams {
  waveType: 0 | 1 | 2 | 3
  attackTime: number
  sustainTime: number
  sustainPunch: number
  decayTime: number
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
  masterVolume: number
}

// 预设定义
export interface Preset {
  id: string
  name: string
  nameEn: string
  category: string
  params: SfxrParams
}

// 用户自定义预设
export interface CustomPreset {
  id: string
  name: string
  category: string
  params: SfxrParams
  createdAt: number
}

// 历史记录项
export interface HistoryItem {
  id: string
  timestamp: number
  params: SfxrParams
  name: string
}

// 导出设置
export interface ExportSettings {
  outputDir: string
  fileName: string
  masterVolume: number
}

// 窗口 API 类型
declare global {
  interface Window {
    electronAPI: {
      saveWav: (buffer: ArrayBuffer, filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
      selectOutputDir: () => Promise<string | null>
      saveJson: (data: string, filePath: string) => Promise<{ success: boolean; error?: string }>
      loadJson: () => Promise<{ success: boolean; data?: string; error?: string }>
    }
  }
}
