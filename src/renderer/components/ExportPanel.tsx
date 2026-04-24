import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { encodeWav } from '../engine/wav-encoder'
import { synthesize } from '../engine/sfxr'
import { playSound } from '../engine/audio-context'

const ExportPanel: React.FC = () => {
  const {
    params, outputDir, fileName, setOutputDir, setFileName,
    batchCount, setBatchCount, exportParams, importParams,
    history, loadFromHistory, addToHistory, addCustomPreset
  } = useAppStore()

  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [savePresetName, setSavePresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    }
  }, [])

  const showMessage = (msg: string) => {
    setMessage(msg)
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    messageTimerRef.current = setTimeout(() => setMessage(''), 3000)
  }

  const handleSelectDir = async () => {
    const dir = await window.electronAPI.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleExport = async () => {
    if (!outputDir) { showMessage('请先选择输出目录'); return }
    if (!fileName.trim()) { showMessage('请输入文件名'); return }
    setExporting(true)
    try {
      const { samples } = synthesize(params)
      const wavBuffer = encodeWav(samples)
      const filePath = `${outputDir}/${fileName}.wav`
      const result = await window.electronAPI.saveWav(wavBuffer, filePath)
      if (result.success) {
        showMessage(`已导出: ${fileName}.wav`)
        addToHistory(fileName)
      } else { showMessage(`导出失败: ${result.error}`) }
    } catch (err) { showMessage(`导出失败: ${err}`) }
    setExporting(false)
  }

  const handleBatchExport = async () => {
    if (!outputDir) { showMessage('请先选择输出目录'); return }
    if (!fileName.trim()) { showMessage('请输入文件名'); return }
    setExporting(true)
    try {
      for (let i = 1; i <= batchCount; i++) {
        const batchFileName = `${fileName}_${String(i).padStart(2, '0')}`
        const { samples } = synthesize(params)
        const wavBuffer = encodeWav(samples)
        const filePath = `${outputDir}/${batchFileName}.wav`
        await window.electronAPI.saveWav(wavBuffer, filePath)
      }
      showMessage(`批量导出完成: ${batchCount} 个文件`)
    } catch (err) { showMessage(`批量导出失败: ${err}`) }
    setExporting(false)
  }

  const handleExportJson = async () => {
    if (!outputDir) { showMessage('请先选择输出目录'); return }
    try {
      const json = exportParams()
      const filePath = `${outputDir}/${fileName}.json`
      const result = await window.electronAPI.saveJson(json, filePath)
      if (result.success) { showMessage(`参数已保存: ${fileName}.json`) }
      else { showMessage(`保存失败: ${result.error}`) }
    } catch (err) { showMessage(`保存失败: ${err}`) }
  }

  const handleImportJson = async () => {
    try {
      const result = await window.electronAPI.loadJson()
      if (result.success && result.data) {
        const ok = importParams(result.data)
        if (ok) showMessage('参数已加载')
        else showMessage('参数文件格式错误')
      }
    } catch (err) { showMessage(`加载失败: ${err}`) }
  }

  const handleSavePreset = () => {
    const name = savePresetName.trim()
    if (!name) { showMessage('请输入预设名称'); return }
    addCustomPreset(name)
    setSavePresetName('')
    setShowSavePreset(false)
    showMessage(`预设已保存: ${name}`)
  }

  return (
    <div className="space-y-3">
      <div className="tf-panel-card p-3 space-y-3">
        <h3 className="text-tf-text-dim text-xs font-semibold tf-glow-text">导出设置</h3>
        <div>
          <label className="text-tf-text-dim text-xs block mb-1">输出目录</label>
          <div className="flex gap-2">
            <input type="text" value={outputDir} readOnly placeholder="点击选择目录..."
              className="flex-1 bg-tf-bg border border-tf-border rounded-md px-2 py-1.5 text-xs text-tf-text placeholder-tf-text-dim focus:border-tf-accent focus:outline-none transition-colors" />
            <button onClick={handleSelectDir} className="tf-btn-secondary px-3 py-1.5 rounded-md text-xs">浏览</button>
          </div>
        </div>
        <div>
          <label className="text-tf-text-dim text-xs block mb-1">文件名</label>
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)}
            className="w-full bg-tf-bg border border-tf-border rounded-md px-2 py-1.5 text-xs text-tf-text focus:border-tf-accent focus:outline-none transition-colors" />
        </div>
        <div className="space-y-2">
          <button onClick={handleExport} disabled={exporting}
            className="tf-btn-primary w-full py-2 rounded-md text-sm disabled:opacity-50">
            {exporting ? '导出中...' : '导出 WAV'}
          </button>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={50} value={batchCount}
              onChange={(e) => setBatchCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-14 bg-tf-bg border border-tf-border rounded-md px-2 py-1 text-xs text-tf-text text-center focus:border-tf-accent focus:outline-none" />
            <button onClick={handleBatchExport} disabled={exporting}
              className="tf-btn-secondary flex-1 py-1.5 rounded-md text-xs disabled:opacity-50">批量导出</button>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-tf-border">
          <button onClick={handleExportJson} className="tf-btn-secondary flex-1 py-1.5 rounded-md text-xs">保存参数</button>
          <button onClick={handleImportJson} className="tf-btn-secondary flex-1 py-1.5 rounded-md text-xs">加载参数</button>
        </div>
      </div>

      <div className="tf-panel-card p-3 space-y-2">
        <h3 className="text-tf-text-dim text-xs font-semibold tf-glow-text">保存预设</h3>
        {!showSavePreset ? (
          <button onClick={() => setShowSavePreset(true)}
            className="tf-btn-secondary w-full py-1.5 rounded-md text-xs">
            + 添加到我的预设
          </button>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={savePresetName} placeholder="输入预设名称..."
              onChange={(e) => setSavePresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              className="flex-1 bg-tf-bg border border-tf-border rounded-md px-2 py-1 text-xs text-tf-text placeholder-tf-text-dim focus:border-tf-accent focus:outline-none" />
            <button onClick={handleSavePreset}
              className="tf-btn-primary px-3 py-1 rounded-md text-xs">保存</button>
            <button onClick={() => setShowSavePreset(false)}
              className="tf-btn-secondary px-3 py-1 rounded-md text-xs">取消</button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="tf-panel-card p-3">
          <h3 className="text-tf-text-dim text-xs font-semibold mb-2 tf-glow-text">历史记录</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {history.map((item) => (
              <button key={item.id} onClick={() => { loadFromHistory(item); setTimeout(() => playSound(item.params), 50) }}
                className="w-full text-left px-2 py-1 rounded-md text-xs text-tf-text hover:bg-tf-bg transition-colors truncate">
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="text-xs text-tf-accent text-center py-1 tf-glow-text">{message}</div>
      )}
    </div>
  )
}

export default ExportPanel
