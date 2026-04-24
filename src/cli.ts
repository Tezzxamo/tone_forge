#!/usr/bin/env node
/**
 * ToneForge / 音锻 — 命令行接口 (AI增强版)
 *
 * 基础用法:
 *   npx tsx src/cli.ts --preset <id> -o <path>
 *   npx tsx src/cli.ts --random -o <path>
 *   npx tsx src/cli.ts --params <json-file> -o <path>
 *
 * AI 用法:
 *   npx tsx src/cli.ts --describe "低沉的爆炸声" -o ./sfx/boom.wav
 *   npx tsx src/cli.ts --describe "激光武器" --feedback-loop --iterations 5 -o ./sfx/laser.wav
 *   npx tsx src/cli.ts --analyze --preset explosion
 *
 * 服务模式:
 *   npx tsx src/cli.ts --api --api-port 8080
 *   npx tsx src/cli.ts --mcp
 */

import fs from 'fs'
import path from 'path'
import { presets } from './renderer/presets/index'
import { synthesize, randomizeParams } from './renderer/engine/sfxr'
import { encodeWav } from './renderer/engine/wav-encoder'
import { parseDescription } from './ai/description-parser'
import { runFeedbackLoop } from './ai/feedback-loop'
import { analyzeWaveform, formatAnalysis } from './ai/waveform-analyzer'
import { startAPIServer } from './server/api-server'
import { startMCPServer } from './mcp/mcp-server'
import type { SfxrParams } from './types/index'

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const keyMap: Record<string, string> = {
        h: 'help',
        l: 'list',
        p: 'preset',
        o: 'out',
        r: 'random',
        b: 'batch',
        v: 'volume',
        d: 'describe',
        f: 'format'
      }
      const key = keyMap[arg.slice(1)] || arg.slice(1)
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        args[key] = next
        i++
      } else {
        args[key] = true
      }
    }
  }
  return args
}

function printHelp(): void {
  console.log(`
🎵 ToneForge / 音锻 — 游戏音效生成工具 (CLI)

基础用法:
  npx tsx src/cli.ts [选项]

基础选项:
  -p, --preset <id>      使用预设音效 (如: ui-click, explosion)
  -r, --random           随机生成音效
      --params <file>    从 JSON 文件加载参数
  -o, --out <path>       输出文件路径 (默认: ./output.wav)
  -b, --batch <n>        批量生成 n 个变体
  -v, --volume <n>       设置主音量 0.0~1.0
  -l, --list             列出所有可用预设

AI 选项:
  -d, --describe <text>  通过自然语言描述生成音效
      --feedback-loop    启用 AI 反馈循环优化
      --iterations <n>   反馈循环最大迭代次数 (默认: 3)
      --analyze          分析参数波形特征 (不导出文件)

服务模式:
      --api              启动 HTTP API 服务器
      --api-port <port>  API 服务器端口 (默认: 3000)
      --mcp              启动 MCP Server (stdio)

输出格式:
      --format json      以 JSON 格式输出结果

环境变量:
  TONEFORGE_LLM_API_KEY    LLM API 密钥 (用于 AI 描述解析)
  TONEFORGE_LLM_BASE_URL   LLM API 基础地址 (默认: OpenAI)
  TONEFORGE_LLM_MODEL      LLM 模型名称 (默认: gpt-4o-mini)

示例:
  # 使用预设
  npx tsx src/cli.ts -p explosion -o ./sfx/boom.wav

  # AI 描述生成
  npx tsx src/cli.ts -d "低沉的爆炸声" -o ./sfx/boom.wav

  # AI 反馈循环优化
  npx tsx src/cli.ts -d "尖锐的激光武器声" --feedback-loop --iterations 5 -o ./sfx/laser.wav

  # 分析预设参数
  npx tsx src/cli.ts --analyze -p explosion

  # 启动 API 服务
  npx tsx src/cli.ts --api --api-port 8080
`)
}

function printPresets(): void {
  console.log('\n📋 可用预设列表:\n')
  const categories = [...new Set(presets.map((p) => p.category))]
  for (const category of categories) {
    console.log(`  [${category}]`)
    for (const preset of presets.filter((p) => p.category === category)) {
      console.log(`    ${preset.id.padEnd(18)} — ${preset.name} / ${preset.nameEn}`)
    }
    console.log('')
  }
}

function findPreset(query: string): (typeof presets)[0] | undefined {
  const q = query.toLowerCase().trim()
  let found = presets.find((p) => p.id === q)
  if (found) return found
  found = presets.find((p) => p.id === q.replace(/_/g, '-'))
  if (found) return found
  found = presets.find((p) => p.name === query)
  if (found) return found
  found = presets.find((p) => p.nameEn.toLowerCase() === q)
  if (found) return found
  found = presets.find(
    (p) =>
      p.id.includes(q) ||
      p.name.includes(query) ||
      p.nameEn.toLowerCase().includes(q)
  )
  return found
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function generateWav(params: SfxrParams, outPath: string): void {
  const { samples } = synthesize(params)
  const wavBuffer = encodeWav(samples)
  ensureDir(outPath)
  fs.writeFileSync(outPath, Buffer.from(wavBuffer))
}

function generateFileName(basePath: string, index?: number): string {
  const parsed = path.parse(basePath)
  if (index !== undefined) {
    const suffix = `_${String(index).padStart(2, '0')}`
    return path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext || '.wav'}`)
  }
  if (!parsed.ext) {
    return `${basePath}.wav`
  }
  return basePath
}

function outputJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

function outputText(lines: string[]): void {
  console.log(lines.join('\n'))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || Object.keys(args).length === 0) {
    printHelp()
    process.exit(0)
  }

  if (args.list) {
    printPresets()
    process.exit(0)
  }

  // 服务模式: API
  if (args.api) {
    const port = typeof args['api-port'] === 'string' ? parseInt(args['api-port'], 10) : 3000
    startAPIServer(port)
    return // 保持运行
  }

  // 服务模式: MCP
  if (args.mcp) {
    startMCPServer()
    return // 保持运行
  }

  const useJSON = args.format === 'json'
  const outBase = typeof args.out === 'string' ? args.out : './output.wav'
  const batchCount =
    typeof args.batch === 'string' ? Math.max(1, parseInt(args.batch, 10) || 1) : 1
  const volume =
    typeof args.volume === 'string'
      ? Math.max(0, Math.min(1, parseFloat(args.volume)))
      : 0.5

  // === AI 描述生成 ===
  if (args.describe) {
    const description = String(args.describe)
    const useFeedbackLoop = args['feedback-loop'] === true
    const iterations = typeof args.iterations === 'string' ? parseInt(args.iterations, 10) : 3

    if (useJSON) {
      console.log('{"status": "generating", "description": ' + JSON.stringify(description) + '}')
    } else {
      console.log(`🤖 AI 生成: "${description}"`)
      if (useFeedbackLoop) {
        console.log(`   反馈循环: ${iterations} 次迭代`)
      }
    }

    let params: SfxrParams
    let analysis: ReturnType<typeof analyzeWaveform>
    let meta: Record<string, unknown> = {}

    if (useFeedbackLoop) {
      const result = await runFeedbackLoop(description, { maxIterations: iterations })
      if (!result.success) {
        console.error('❌ 反馈循环失败:', result.error)
        process.exit(1)
      }
      params = result.finalParams
      analysis = result.finalAnalysis
      meta = {
        iterations: result.iterations,
        history: result.history.map(h => ({
          iteration: h.iteration,
          reason: h.adjustmentReason
        }))
      }
      if (!useJSON) {
        console.log(`   实际迭代: ${result.iterations} 次`)
      }
    } else {
      const parseResult = await parseDescription(description)
      params = parseResult.params
      const { samples } = synthesize(params)
      analysis = analyzeWaveform(samples, 44100, params)
      meta = { source: parseResult.source, matchedPreset: parseResult.matchedPreset }
      if (!useJSON) {
        console.log(`   解析来源: ${parseResult.source}${parseResult.matchedPreset ? ` (${parseResult.matchedPreset})` : ''}`)
      }
    }

    params.masterVolume = volume

    // 导出
    for (let i = 1; i <= batchCount; i++) {
      const filePath = generateFileName(outBase, batchCount > 1 ? i : undefined)
      generateWav(params, filePath)
      const relPath = path.relative(process.cwd(), filePath)

      if (useJSON) {
        outputJSON({
          success: true,
          description,
          filePath: relPath,
          params,
          analysis: {
            duration: analysis.duration,
            rms: analysis.rms,
            peak: analysis.peak,
            estimatedFreq: analysis.estimatedFreq,
            brightness: analysis.brightness,
            noisiness: analysis.noisiness,
            isPercussive: analysis.isPercussive,
            isBassy: analysis.isBassy,
            isSharp: analysis.isSharp
          },
          ...meta
        })
      } else {
        console.log(`✓ 已生成: ${relPath}`)
        console.log(`   时长: ${analysis.duration.toFixed(3)}s | 估算频率: ${analysis.estimatedFreq.toFixed(0)}Hz | 噪声度: ${(analysis.noisiness * 100).toFixed(0)}%`)
      }
    }
    return
  }

  // === 分析模式 ===
  if (args.analyze) {
    let params: SfxrParams

    if (args.preset) {
      const preset = findPreset(String(args.preset))
      if (!preset) {
        console.error(`❌ 未找到预设: "${args.preset}"`)
        process.exit(1)
      }
      params = preset.params
    } else if (args.params) {
      const paramsFile = String(args.params)
      if (!fs.existsSync(paramsFile)) {
        console.error(`❌ 参数文件不存在: ${paramsFile}`)
        process.exit(1)
      }
      params = JSON.parse(fs.readFileSync(paramsFile, 'utf-8')) as SfxrParams
    } else {
      console.error('❌ 分析模式需要 --preset 或 --params')
      process.exit(1)
    }

    const { samples } = synthesize(params)
    const analysis = analyzeWaveform(samples, 44100, params)

    if (useJSON) {
      outputJSON({ success: true, params, analysis })
    } else {
      outputText(['\n📊 波形分析报告\n', formatAnalysis(analysis), ''])
    }
    return
  }

  // === 基础生成模式 ===
  let params: SfxrParams

  if (args.params) {
    const paramsFile = String(args.params)
    if (!fs.existsSync(paramsFile)) {
      console.error(`❌ 参数文件不存在: ${paramsFile}`)
      process.exit(1)
    }
    try {
      const json = fs.readFileSync(paramsFile, 'utf-8')
      params = JSON.parse(json) as SfxrParams
    } catch {
      console.error('❌ 参数文件格式错误')
      process.exit(1)
    }
  } else if (args.random) {
    params = randomizeParams()
  } else if (args.preset) {
    const preset = findPreset(String(args.preset))
    if (!preset) {
      console.error(`❌ 未找到预设: "${args.preset}"`)
      console.error('   使用 --list 查看所有可用预设')
      process.exit(1)
    }
    params = { ...preset.params }
    if (!useJSON) {
      console.log(`✓ 使用预设: ${preset.name} (${preset.id})`)
    }
  } else {
    console.error('❌ 请指定生成方式: --preset, --random, --describe 或 --params')
    console.error('   使用 --help 查看详细用法')
    process.exit(1)
  }

  params.masterVolume = volume

  for (let i = 1; i <= batchCount; i++) {
    const filePath = generateFileName(outBase, batchCount > 1 ? i : undefined)
    generateWav(params, filePath)
    const relPath = path.relative(process.cwd(), filePath)

    if (useJSON) {
      const { samples } = synthesize(params)
      const analysis = analyzeWaveform(samples, 44100, params)
      outputJSON({ success: true, filePath: relPath, params, analysis })
    } else {
      console.log(`✓ 已生成: ${relPath}`)
    }
  }

  if (!useJSON) {
    console.log(`\n🎵 完成！共生成 ${batchCount} 个音效文件`)
  }
}

main().catch((err) => {
  console.error('❌ 错误:', err)
  process.exit(1)
})
