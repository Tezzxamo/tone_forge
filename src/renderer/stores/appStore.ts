import { create } from 'zustand'
import type { SfxrParams, HistoryItem, Preset, CustomPreset } from '../../types/index'
// built-in presets not directly used in store
import { randomizeParams } from '../engine/sfxr'

const CUSTOM_PRESETS_KEY = 'toneforge_custom_presets'

function loadCustomPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CustomPreset[]
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore
  }
  return []
}

function saveCustomPresets(presets: CustomPreset[]) {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

interface AppState {
  params: SfxrParams
  selectedPreset: Preset | null
  history: HistoryItem[]
  outputDir: string
  fileName: string
  shiftPressed: boolean
  batchCount: number
  customPresets: CustomPreset[]

  setParams: (params: SfxrParams) => void
  setParam: <K extends keyof SfxrParams>(key: K, value: SfxrParams[K]) => void
  selectPreset: (preset: Preset) => void
  randomize: () => void
  mutate: () => void
  addToHistory: (name?: string) => void
  loadFromHistory: (item: HistoryItem) => void
  setOutputDir: (dir: string) => void
  setFileName: (name: string) => void
  setShiftPressed: (pressed: boolean) => void
  setBatchCount: (count: number) => void
  exportParams: () => string
  importParams: (json: string) => boolean
  addCustomPreset: (name: string, category?: string) => void
  deleteCustomPreset: (id: string) => void
  loadCustomPreset: (preset: CustomPreset) => void
}

const defaultParams: SfxrParams = {
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
  masterVolume: 0.5
}

export const useAppStore = create<AppState>((set, get) => ({
  params: { ...defaultParams },
  selectedPreset: null,
  history: [],
  outputDir: '',
  fileName: 'sound_effect',
  shiftPressed: false,
  batchCount: 5,
  customPresets: loadCustomPresets(),

  setParams: (params) => set({ params: { ...params }, selectedPreset: null }),

  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
      selectedPreset: null
    })),

  selectPreset: (preset) =>
    set({
      params: { ...preset.params },
      selectedPreset: preset,
      fileName: preset.nameEn.toLowerCase().replace(/\s+/g, '_')
    }),

  randomize: () =>
    set({
      params: randomizeParams(),
      selectedPreset: null
    }),

  mutate: () =>
    set((state) => {
      const base = { ...state.params }
      const keys = Object.keys(base) as (keyof SfxrParams)[]
      for (const key of keys) {
        if (key === 'waveType') continue
        if (Math.random() < 0.3) {
          const val = base[key] as number
          const delta = (Math.random() * 2 - 1) * 0.15
          let newVal = val + delta
          if (newVal < 0) newVal = 0
          if (newVal > 1) newVal = 1
          ;(base as Record<string, number>)[key] = newVal
        }
      }
      return { params: base, selectedPreset: null }
    }),

  addToHistory: (name) =>
    set((state) => {
      const itemName = name || state.fileName || '未命名'
      // 如果与上一条历史记录同名，则不重复添加
      if (state.history.length > 0 && state.history[0].name === itemName) {
        return { history: state.history }
      }
      const item: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        params: { ...state.params },
        name: itemName
      }
      const newHistory = [item, ...state.history].slice(0, 10)
      return { history: newHistory }
    }),

  loadFromHistory: (item) =>
    set({
      params: { ...item.params },
      selectedPreset: null
    }),

  setOutputDir: (dir) => set({ outputDir: dir }),

  setFileName: (name) => set({ fileName: name }),

  setShiftPressed: (pressed) => set({ shiftPressed: pressed }),

  setBatchCount: (count) => set({ batchCount: count }),

  exportParams: () => {
    return JSON.stringify(get().params, null, 2)
  },

  importParams: (json) => {
    try {
      const params = JSON.parse(json) as SfxrParams
      set({ params, selectedPreset: null })
      return true
    } catch {
      return false
    }
  },

  addCustomPreset: (name, category = '我的预设') => {
    const preset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim() || '未命名预设',
      category,
      params: { ...get().params },
      createdAt: Date.now()
    }
    set((state) => {
      const newPresets = [preset, ...state.customPresets]
      saveCustomPresets(newPresets)
      return { customPresets: newPresets }
    })
  },

  deleteCustomPreset: (id) => {
    set((state) => {
      const newPresets = state.customPresets.filter((p) => p.id !== id)
      saveCustomPresets(newPresets)
      return { customPresets: newPresets }
    })
  },

  loadCustomPreset: (preset) => {
    set({
      params: { ...preset.params },
      selectedPreset: null,
      fileName: preset.name.toLowerCase().replace(/\s+/g, '_')
    })
  }
}))
