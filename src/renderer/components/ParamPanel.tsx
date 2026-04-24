import React, { useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { playSound } from '../engine/audio-context'
import SliderControl from './SliderControl'
import WaveformType from './WaveformType'
import { paramDescriptions } from '../data/paramDescriptions'

const ParamPanel: React.FC = () => {
  const {
    params,
    setParam,
    shiftPressed,
    setShiftPressed,
    randomize,
    addToHistory
  } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(true)
      if (e.code === 'Space') {
        e.preventDefault()
        const currentParams = useAppStore.getState().params
        playSound(currentParams)
        useAppStore.getState().addToHistory()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setShiftPressed])

  const handlePlay = useCallback(() => {
    playSound(params)
    addToHistory()
  }, [params, addToHistory])

  const handleParamChange = useCallback((key: keyof typeof params, value: number) => {
    setParam(key, value as never)
  }, [setParam])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-tf-accent text-sm font-bold tf-glow-text">参数调节</h2>
        <div className="flex gap-2">
          <button
            onClick={randomize}
            className="tf-btn-secondary px-3 py-1.5 rounded-md text-xs"
          >
            🎲 随机
          </button>
          <button
            onClick={handlePlay}
            className="tf-btn-primary px-4 py-1.5 rounded-md text-xs"
          >
            ▶ 播放 (空格)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">波形类型</h3>
          <WaveformType
            value={params.waveType}
            onChange={(v) => setParam('waveType', v)}
          />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">包络 (ADSR)</h3>
          <SliderControl label="Attack" value={params.attackTime} onChange={(v) => handleParamChange('attackTime', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.attackTime} />
          <SliderControl label="Sustain" value={params.sustainTime} onChange={(v) => handleParamChange('sustainTime', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.sustainTime} />
          <SliderControl label="Sustain Punch" value={params.sustainPunch} onChange={(v) => handleParamChange('sustainPunch', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.sustainPunch} />
          <SliderControl label="Decay" value={params.decayTime} onChange={(v) => handleParamChange('decayTime', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.decayTime} />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">音高</h3>
          <SliderControl label="Start Freq" value={params.startFrequency} onChange={(v) => handleParamChange('startFrequency', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.startFrequency} />
          <SliderControl label="Min Freq" value={params.minFrequency} onChange={(v) => handleParamChange('minFrequency', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.minFrequency} />
          <SliderControl label="Slide" value={params.slide} min={-1} max={1} onChange={(v) => handleParamChange('slide', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.slide} />
          <SliderControl label="Delta Slide" value={params.deltaSlide} min={-1} max={1} onChange={(v) => handleParamChange('deltaSlide', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.deltaSlide} />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">颤音 & 变化</h3>
          <SliderControl label="Vibrato Depth" value={params.vibratoDepth} onChange={(v) => handleParamChange('vibratoDepth', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.vibratoDepth} />
          <SliderControl label="Vibrato Speed" value={params.vibratoSpeed} onChange={(v) => handleParamChange('vibratoSpeed', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.vibratoSpeed} />
          <SliderControl label="Change Amount" value={params.changeAmount} min={-1} max={1} onChange={(v) => handleParamChange('changeAmount', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.changeAmount} />
          <SliderControl label="Change Speed" value={params.changeSpeed} onChange={(v) => handleParamChange('changeSpeed', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.changeSpeed} />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">滤波器</h3>
          <SliderControl label="LP Cutoff" value={params.lpFilterCutoff} onChange={(v) => handleParamChange('lpFilterCutoff', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.lpFilterCutoff} />
          <SliderControl label="LP Resonance" value={params.lpFilterResonance} onChange={(v) => handleParamChange('lpFilterResonance', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.lpFilterResonance} />
          <SliderControl label="LP Cutoff Sweep" value={params.lpFilterCutoffSweep} min={-1} max={1} onChange={(v) => handleParamChange('lpFilterCutoffSweep', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.lpFilterCutoffSweep} />
          <SliderControl label="HP Cutoff" value={params.hpFilterCutoff} onChange={(v) => handleParamChange('hpFilterCutoff', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.hpFilterCutoff} />
          <SliderControl label="HP Cutoff Sweep" value={params.hpFilterCutoffSweep} min={-1} max={1} onChange={(v) => handleParamChange('hpFilterCutoffSweep', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.hpFilterCutoffSweep} />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">效果</h3>
          <SliderControl label="Phaser Offset" value={params.phaserOffset} min={-1} max={1} onChange={(v) => handleParamChange('phaserOffset', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.phaserOffset} />
          <SliderControl label="Phaser Sweep" value={params.phaserSweep} min={-1} max={1} onChange={(v) => handleParamChange('phaserSweep', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.phaserSweep} />
          <SliderControl label="Repeat Speed" value={params.repeatSpeed} onChange={(v) => handleParamChange('repeatSpeed', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.repeatSpeed} />
        </div>

        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2">输出</h3>
          <SliderControl label="Master Volume" value={params.masterVolume} onChange={(v) => handleParamChange('masterVolume', v)} shiftPressed={shiftPressed} tooltip={paramDescriptions.masterVolume} />
        </div>
      </div>
    </div>
  )
}

export default ParamPanel
