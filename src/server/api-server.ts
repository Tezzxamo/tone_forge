import http from 'http'
import url from 'url'
import fs from 'fs'
import path from 'path'
import type { SfxrParams } from '../types/index'
import { synthesize } from '../renderer/engine/sfxr'
import { encodeWav } from '../renderer/engine/wav-encoder'
import { presets, presetCategories } from '../renderer/presets/index'
import { parseDescription } from '../ai/description-parser'
import { runFeedbackLoop } from '../ai/feedback-loop'
import { analyzeWaveform } from '../ai/waveform-analyzer'

interface APIRequest {
  method: string
  pathname: string
  query: url.UrlWithParsedQuery['query']
  body: unknown
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve(null)
      }
    })
  })
}

function sendJSON(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data, null, 2))
}

function sendCORS(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const docsMarkdown = `# ToneForge AI API

## Endpoints

### GET /health
Health check.

### GET /presets
List all built-in presets.

### POST /generate
Generate sound from exact parameters.
Body: { params: SfxrParams, output?: string }

### POST /generate-by-description
Generate sound from natural language description.
Body: { description: string, output?: string }

### POST /feedback-loop
Generate with iterative optimization.
Body: { description: string, maxIterations?: number, output?: string }

### POST /analyze
Analyze parameters without generating file.
Body: { params: SfxrParams }

## Parameter Schema (SfxrParams)
All values 0~1 except slide/deltaSlide/changeAmount (-1~1).

- waveType: 0=square, 1=sawtooth, 2=sine, 3=noise
- attackTime, sustainTime, decayTime: envelope stages
- sustainPunch: transient spike at attack boundary
- startFrequency, minFrequency: pitch
- slide, deltaSlide: pitch change
- vibratoDepth, vibratoSpeed: vibrato
- changeAmount, changeSpeed: sudden pitch jumps
- lpFilterCutoff, lpFilterResonance, lpFilterCutoffSweep: low-pass filter
- hpFilterCutoff, hpFilterCutoffSweep: high-pass filter
- phaserOffset, phaserSweep: phaser effect
- repeatSpeed: repeat/stutter
- masterVolume: output gain
`

export function startAPIServer(port: number = 3000): http.Server {
  const server = http.createServer(async (req, res) => {
    sendCORS(res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const parsedUrl = url.parse(req.url || '', true)
    const pathname = parsedUrl.pathname || ''
    const body = await parseBody(req)
    const apiReq: APIRequest = {
      method: req.method || 'GET',
      pathname,
      query: parsedUrl.query,
      body
    }

    try {
      await handleRequest(apiReq, res)
    } catch (err) {
      sendJSON(res, 500, { success: false, error: String(err) })
    }
  })

  server.listen(port, () => {
    console.log(`ToneForge API server running at http://localhost:${port}`)
    console.log(`API docs: http://localhost:${port}/docs`)
  })

  return server
}

async function handleRequest(req: APIRequest, res: http.ServerResponse) {
  switch (req.pathname) {
    case '/health':
      sendJSON(res, 200, { status: 'ok', service: 'toneforge-api' })
      return

    case '/presets':
      sendJSON(res, 200, {
        success: true,
        categories: presetCategories,
        presets: presets.map(p => ({
          id: p.id,
          name: p.name,
          nameEn: p.nameEn,
          category: p.category
        }))
      })
      return

    case '/generate': {
      if (req.method !== 'POST') {
        sendJSON(res, 405, { success: false, error: 'Method not allowed' })
        return
      }
      const genBody = req.body as { params?: SfxrParams; output?: string }
      if (!genBody.params) {
        sendJSON(res, 400, { success: false, error: 'Missing params' })
        return
      }
      const { samples } = synthesize(genBody.params)
      const analysis = analyzeWaveform(samples, 44100, genBody.params)
      let filePath: string | undefined

      if (genBody.output) {
        const wavBuffer = encodeWav(samples)
        const dir = path.dirname(genBody.output)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(genBody.output, Buffer.from(wavBuffer))
        filePath = genBody.output
      }

      sendJSON(res, 200, {
        success: true,
        filePath,
        params: genBody.params,
        analysis,
        sampleCount: samples.length,
        duration: samples.length / 44100
      })
      return
    }

    case '/generate-by-description': {
      if (req.method !== 'POST') {
        sendJSON(res, 405, { success: false, error: 'Method not allowed' })
        return
      }
      const descBody = req.body as { description?: string; output?: string }
      if (!descBody.description) {
        sendJSON(res, 400, { success: false, error: 'Missing description' })
        return
      }

      const parseResult = await parseDescription(descBody.description)
      const { samples } = synthesize(parseResult.params)
      const analysis = analyzeWaveform(samples, 44100, parseResult.params)
      let filePath: string | undefined

      if (descBody.output) {
        const wavBuffer = encodeWav(samples)
        const dir = path.dirname(descBody.output)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(descBody.output, Buffer.from(wavBuffer))
        filePath = descBody.output
      }

      sendJSON(res, 200, {
        success: true,
        filePath,
        params: parseResult.params,
        source: parseResult.source,
        matchedPreset: parseResult.matchedPreset,
        analysis,
        sampleCount: samples.length,
        duration: samples.length / 44100
      })
      return
    }

    case '/feedback-loop': {
      if (req.method !== 'POST') {
        sendJSON(res, 405, { success: false, error: 'Method not allowed' })
        return
      }
      const fbBody = req.body as { description?: string; maxIterations?: number; output?: string }
      if (!fbBody.description) {
        sendJSON(res, 400, { success: false, error: 'Missing description' })
        return
      }

      const result = await runFeedbackLoop(fbBody.description, {
        maxIterations: fbBody.maxIterations || 3
      })

      if (!result.success) {
        sendJSON(res, 500, { success: false, error: result.error })
        return
      }

      let filePath: string | undefined
      if (fbBody.output) {
        const wavBuffer = encodeWav(result.samples)
        const dir = path.dirname(fbBody.output)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(fbBody.output, Buffer.from(wavBuffer))
        filePath = fbBody.output
      }

      sendJSON(res, 200, {
        success: true,
        filePath,
        finalParams: result.finalParams,
        iterations: result.iterations,
        history: result.history.map(h => ({
          iteration: h.iteration,
          adjustmentReason: h.adjustmentReason,
          analysis: {
            duration: h.analysis.duration,
            rms: h.analysis.rms,
            peak: h.analysis.peak,
            estimatedFreq: h.analysis.estimatedFreq,
            brightness: h.analysis.brightness,
            noisiness: h.analysis.noisiness
          }
        })),
        finalAnalysis: result.finalAnalysis,
        sampleCount: result.samples.length,
        duration: result.samples.length / 44100
      })
      return
    }

    case '/analyze': {
      if (req.method !== 'POST') {
        sendJSON(res, 405, { success: false, error: 'Method not allowed' })
        return
      }
      const analBody = req.body as { params?: SfxrParams }
      if (!analBody.params) {
        sendJSON(res, 400, { success: false, error: 'Missing params' })
        return
      }
      const { samples } = synthesize(analBody.params)
      const analysis = analyzeWaveform(samples, 44100, analBody.params)
      sendJSON(res, 200, {
        success: true,
        params: analBody.params,
        analysis,
        sampleCount: samples.length,
        duration: samples.length / 44100
      })
      return
    }

    case '/docs':
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(docsMarkdown)
      return

    default:
      sendJSON(res, 404, { success: false, error: `Not found: ${req.pathname}` })
  }
}
