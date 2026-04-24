import type { SfxrParams } from '../../types/index'
import { synthesize } from './sfxr'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext({ sampleRate: 44100 })
  }
  return audioCtx
}

export function playSound(params: SfxrParams): void {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const { samples } = synthesize(params)

  const buffer = ctx.createBuffer(1, samples.length, 44100)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buffer.copyToChannel(samples as any, 0)

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

export function getWaveformData(params: SfxrParams): Float32Array {
  const { samples } = synthesize(params)
  return samples
}

export function closeAudioContext(): void {
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
}
