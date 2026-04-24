import React, { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { presets, presetCategories } from '../presets/index'
import { playSound } from '../engine/audio-context'

const PresetPanel: React.FC = () => {
  const { selectedPreset, selectPreset, addToHistory, customPresets, loadCustomPreset, deleteCustomPreset } = useAppStore()
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    presetCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  )
  const [myPresetsExpanded, setMyPresetsExpanded] = useState(true)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const handleSelectBuiltIn = (preset: typeof presets[0]) => {
    selectPreset(preset)
    setTimeout(() => {
      playSound(preset.params)
      addToHistory(preset.nameEn.toLowerCase().replace(/\s+/g, '_'))
    }, 50)
  }

  const handleSelectCustom = (preset: typeof customPresets[0]) => {
    loadCustomPreset(preset)
    setTimeout(() => {
      playSound(preset.params)
      addToHistory(preset.name)
    }, 50)
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-tf-accent text-sm font-bold mb-3 px-1 tf-glow-text">预设音效</h2>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
        {/* 内置预设分组 */}
        {presetCategories.map((category) => (
          <div key={category} className="tf-panel-card overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-tf-text-dim hover:text-tf-accent transition-colors"
            >
              <span className="uppercase tracking-wider">{category}</span>
              <span className={`transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expandedCategories[category] && (
              <div className="px-2 pb-2 space-y-1">
                {presets
                  .filter((p) => p.category === category)
                  .map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectBuiltIn(preset)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm transition-all
                        ${selectedPreset?.id === preset.id
                          ? 'bg-tf-accent/20 text-tf-accent font-medium border border-tf-accent/40'
                          : 'bg-tf-bg/50 text-tf-text hover:bg-tf-panel-hover hover:border-tf-border border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{preset.name}</span>
                        <span className={`text-xs ${selectedPreset?.id === preset.id ? 'text-tf-accent/70' : 'text-tf-text-dim'}`}>
                          {preset.nameEn}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}

        {/* 我的预设 */}
        {customPresets.length > 0 && (
          <div className="tf-panel-card overflow-hidden">
            <button
              onClick={() => setMyPresetsExpanded(!myPresetsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-tf-text-dim hover:text-tf-accent transition-colors"
            >
              <span className="uppercase tracking-wider">我的预设</span>
              <span className={`transform transition-transform ${myPresetsExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {myPresetsExpanded && (
              <div className="px-2 pb-2 space-y-1">
                {customPresets.map((preset) => (
                  <div key={preset.id} className="group relative">
                    <button
                      onClick={() => handleSelectCustom(preset)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm transition-all bg-tf-bg/50 text-tf-text hover:bg-tf-panel-hover hover:border-tf-border border border-transparent"
                    >
                      <div className="flex items-center justify-between">
                        <span>{preset.name}</span>
                        <span className="text-xs text-tf-text-dim">
                          {new Date(preset.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCustomPreset(preset.id) }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-tf-danger hover:bg-tf-danger/10 rounded transition-all"
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PresetPanel
