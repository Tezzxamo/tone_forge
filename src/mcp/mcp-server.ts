import { synthesize } from '../renderer/engine/sfxr'
import { encodeWav } from '../renderer/engine/wav-encoder'
import { presets, presetCategories } from '../renderer/presets/index'
import { parseDescription } from '../ai/description-parser'
import { runFeedbackLoop } from '../ai/feedback-loop'
import { analyzeWaveform } from '../ai/waveform-analyzer'
import type { SfxrParams } from '../types/index'
import fs from 'fs'
import path from 'path'

// Lightweight MCP (Model Context Protocol) implementation over stdio
// Protocol: JSON-RPC 2.0 messages separated by newlines

interface MCPMessage {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string }
}

const TOOLS = [
  {
    name: 'generate_sound_by_description',
    description: 'Generate a game sound effect from a natural language description. Returns the generated parameters and optionally saves to a file.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language description of the desired sound (e.g., "deep explosion with rumble")' },
        output_path: { type: 'string', description: 'Optional file path to save the WAV file' }
      },
      required: ['description']
    }
  },
  {
    name: 'generate_sound_by_params',
    description: 'Generate a sound effect from exact sfxr parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'SfxrParams object with all synthesis parameters' },
        output_path: { type: 'string', description: 'Optional file path to save the WAV file' }
      },
      required: ['params']
    }
  },
  {
    name: 'optimize_sound',
    description: 'Generate a sound effect with iterative AI feedback loop optimization. The AI will generate, analyze, and refine the sound up to N iterations.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language description of the desired sound' },
        max_iterations: { type: 'number', description: 'Maximum optimization iterations (default: 3)', default: 3 },
        output_path: { type: 'string', description: 'Optional file path to save the WAV file' }
      },
      required: ['description']
    }
  },
  {
    name: 'analyze_sound',
    description: 'Analyze the waveform characteristics of given sfxr parameters without generating a file.',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'SfxrParams object to analyze' }
      },
      required: ['params']
    }
  },
  {
    name: 'list_presets',
    description: 'List all available built-in sound effect presets.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
]

function sendMessage(msg: MCPMessage) {
  const data = JSON.stringify(msg)
  // 兼容 JSON Lines 协议（mcp Python SDK 使用）
  process.stdout.write(data + '\n')
}

function sendResult(id: number | string, result: unknown) {
  sendMessage({ jsonrpc: '2.0', id, result })
}

function sendError(id: number | string, code: number, message: string) {
  sendMessage({ jsonrpc: '2.0', id, error: { code, message } })
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'generate_sound_by_description': {
      const description = String(args.description || '')
      const outputPath = args.output_path ? String(args.output_path) : undefined
      const parseResult = await parseDescription(description)
      const { samples } = synthesize(parseResult.params)
      const analysis = analyzeWaveform(samples, 44100, parseResult.params)

      let filePath: string | undefined
      if (outputPath) {
        const wavBuffer = encodeWav(samples)
        const dir = path.dirname(outputPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(outputPath, Buffer.from(wavBuffer))
        filePath = outputPath
      }

      return {
        success: true,
        description,
        params: parseResult.params,
        source: parseResult.source,
        matched_preset: parseResult.matchedPreset,
        file_path: filePath,
        duration_seconds: samples.length / 44100,
        analysis: {
          estimated_freq_hz: Math.round(analysis.estimatedFreq),
          brightness: Math.round(analysis.brightness * 100) + '%',
          noisiness: Math.round(analysis.noisiness * 100) + '%',
          is_percussive: analysis.isPercussive,
          is_bassy: analysis.isBassy,
          is_sharp: analysis.isSharp
        }
      }
    }

    case 'generate_sound_by_params': {
      const params = args.params as SfxrParams
      const outputPath = args.output_path ? String(args.output_path) : undefined
      const { samples } = synthesize(params)
      const analysis = analyzeWaveform(samples, 44100, params)

      let filePath: string | undefined
      if (outputPath) {
        const wavBuffer = encodeWav(samples)
        const dir = path.dirname(outputPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(outputPath, Buffer.from(wavBuffer))
        filePath = outputPath
      }

      return {
        success: true,
        params,
        file_path: filePath,
        duration_seconds: samples.length / 44100,
        analysis: {
          estimated_freq_hz: Math.round(analysis.estimatedFreq),
          brightness: Math.round(analysis.brightness * 100) + '%',
          noisiness: Math.round(analysis.noisiness * 100) + '%'
        }
      }
    }

    case 'optimize_sound': {
      const description = String(args.description || '')
      const maxIterations = typeof args.max_iterations === 'number' ? args.max_iterations : 3
      const outputPath = args.output_path ? String(args.output_path) : undefined

      const result = await runFeedbackLoop(description, { maxIterations })

      if (!result.success) {
        return { success: false, error: result.error }
      }

      let filePath: string | undefined
      if (outputPath) {
        const wavBuffer = encodeWav(result.samples)
        const dir = path.dirname(outputPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(outputPath, Buffer.from(wavBuffer))
        filePath = outputPath
      }

      return {
        success: true,
        description,
        final_params: result.finalParams,
        iterations: result.iterations,
        file_path: filePath,
        duration_seconds: result.samples.length / 44100,
        optimization_history: result.history.map((h: typeof result.history[0]) => ({
          iteration: h.iteration,
          reason: h.adjustmentReason
        })),
        final_analysis: {
          estimated_freq_hz: Math.round(result.finalAnalysis.estimatedFreq),
          brightness: Math.round(result.finalAnalysis.brightness * 100) + '%',
          noisiness: Math.round(result.finalAnalysis.noisiness * 100) + '%'
        }
      }
    }

    case 'analyze_sound': {
      const params = args.params as SfxrParams
      const { samples } = synthesize(params)
      const analysis = analyzeWaveform(samples, 44100, params)

      return {
        success: true,
        params,
        duration_seconds: samples.length / 44100,
        analysis: {
          duration: analysis.duration,
          rms: analysis.rms,
          peak: analysis.peak,
          attack_time_ms: Math.round(analysis.attackTime * 1000),
          decay_time_ms: Math.round(analysis.decayTime * 1000),
          estimated_freq_hz: Math.round(analysis.estimatedFreq),
          freq_variation: Math.round(analysis.freqVariation * 100) + '%',
          pitch_direction: analysis.pitchDirection,
          low_freq: Math.round(analysis.lowFreqEnergy * 100) + '%',
          mid_freq: Math.round(analysis.midFreqEnergy * 100) + '%',
          high_freq: Math.round(analysis.highFreqEnergy * 100) + '%',
          brightness: Math.round(analysis.brightness * 100) + '%',
          noisiness: Math.round(analysis.noisiness * 100) + '%',
          complexity: Math.round(analysis.complexity * 100) + '%',
          harmonic_richness: Math.round(analysis.harmonicRichness * 100) + '%',
          is_percussive: analysis.isPercussive,
          is_sustained: analysis.isSustained,
          is_bassy: analysis.isBassy,
          is_sharp: analysis.isSharp
        }
      }
    }

    case 'list_presets': {
      return {
        success: true,
        categories: presetCategories,
        presets: presets.map(p => ({
          id: p.id,
          name: p.name,
          name_en: p.nameEn,
          category: p.category
        }))
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

async function handleMessage(msg: MCPMessage) {
  if (!msg.method) return

  // 通知（无 id）不需要响应
  if (msg.method === 'notifications/initialized') {
    return
  }

  switch (msg.method) {
    case 'initialize': {
      sendResult(msg.id!, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'toneforge', version: '1.0.0' }
      })
      break
    }

    case 'tools/list': {
      sendResult(msg.id!, { tools: TOOLS })
      break
    }

    case 'tools/call': {
      const params = msg.params as { name?: string; arguments?: Record<string, unknown> } | undefined
      if (!params?.name) {
        sendError(msg.id!, -32602, 'Invalid params: missing tool name')
        return
      }
      try {
        const result = await handleToolCall(params.name, params.arguments || {})
        sendResult(msg.id!, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
      } catch (err) {
        sendError(msg.id!, -32603, `Tool execution error: ${err}`)
      }
      break
    }

    default:
      // 只有带 id 的请求才发送错误响应
      if (msg.id !== undefined) {
        sendError(msg.id, -32601, `Method not found: ${msg.method}`)
      }
  }
}

export function startMCPServer(): void {
  let buffer = ''

  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk

    // 尝试 Content-Length 协议
    while (true) {
      const headerMatch = buffer.match(/Content-Length:\s*(\d+)\r\n\r\n/)
      if (!headerMatch) break

      const contentLength = parseInt(headerMatch[1], 10)
      const headerEnd = buffer.indexOf('\r\n\r\n') + 4
      const bodyStart = headerEnd
      const bodyEnd = bodyStart + contentLength

      if (buffer.length < bodyEnd) break

      const body = buffer.slice(bodyStart, bodyEnd)
      buffer = buffer.slice(bodyEnd)

      try {
        const msg = JSON.parse(body) as MCPMessage
        handleMessage(msg)
      } catch (err) {
        // Invalid JSON, ignore
      }
    }

    // 兼容 JSON Lines 协议（mcp Python SDK 使用）
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留不完整的最后一行
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = JSON.parse(trimmed) as MCPMessage
        handleMessage(msg)
      } catch (err) {
        // Invalid JSON, ignore
      }
    }
  })

  process.stdin.on('end', () => {
    process.exit(0)
  })

  console.error('ToneForge MCP server started on stdio')
}
