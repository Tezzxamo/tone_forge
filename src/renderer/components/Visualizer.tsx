import React, { useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { getWaveformData } from '../engine/audio-context'

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const params = useAppStore((state) => state.params)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 根据容器实际尺寸设置 canvas 像素尺寸
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const width = Math.floor(rect.width)
    const height = 120

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    const samples = getWaveformData(params)

    // 清空
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, width, height)

    // 绘制网格线
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    // 绘制波形
    ctx.strokeStyle = '#00E5FF'
    ctx.lineWidth = 2
    ctx.beginPath()

    const step = Math.max(1, Math.floor(samples.length / width))
    const amplitude = height * 0.4

    for (let x = 0; x < width; x++) {
      const sampleIndex = x * step
      if (sampleIndex >= samples.length) break
      const y = height / 2 - samples[sampleIndex] * amplitude
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // 绘制填充
    ctx.fillStyle = 'rgba(0, 229, 255, 0.1)'
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    for (let x = 0; x < width; x++) {
      const sampleIndex = x * step
      if (sampleIndex >= samples.length) break
      const y = height / 2 - samples[sampleIndex] * amplitude
      ctx.lineTo(x, y)
    }
    ctx.lineTo(width, height / 2)
    ctx.closePath()
    ctx.fill()
  }, [params])

  return (
    <div ref={containerRef} className="tf-panel-card p-3">
      <h3 className="text-tf-text-dim text-xs font-semibold mb-2">波形预览</h3>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md"
        style={{ height: '120px', imageRendering: 'auto' }}
      />
    </div>
  )
}

export default Visualizer
