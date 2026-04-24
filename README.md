# ToneForge / 音锻

> 一款受 sfxr 启发的桌面端游戏音效生成工具，支持 AI 描述生成、MCP 工具集成和 HTTP API。

## 功能特性

- **16 种游戏音效预设**：涵盖 UI、战斗、环境、系统等场景
- **实时参数调节**：波形、包络、音高、滤波器、效果器等 20+ 参数
- **AI 描述生成**：输入自然语言描述（如"低沉的爆炸声"），AI 自动合成参数
- **反馈循环优化**：多轮 AI 迭代优化，让音效更贴合描述
- **波形可视化**：Canvas 实时绘制波形预览
- **标准 WAV 导出**：44.1kHz / 16-bit / 单声道，兼容 Godot 等引擎
- **命令行接口（CLI）**：支持批量生成、预设调用、AI 生成、API 服务
- **MCP Server**：作为 AI 助手工具，通过自然语言直接生成音效
- **HTTP API**：提供 RESTful 接口，支持第三方集成

## 界面预览

```
┌─────────────────────────────────────────────────────────────┐
│  ToneForge / 音锻                       [随机] [▶ 播放] [导出▼] │
├──────────┬─────────────────────────────┬────────────────────┤
│  预设列表  │      参数调节面板            │    波形可视化       │
│  ───────  │  ┌─────────┐ ┌─────────┐   │  ┌──────────────┐  │
│  ▶ 爆炸   │  │  包络   │ │  音高   │   │  │              │  │
│  ▶ 剑挥击  │  │ Attack  │ │ Start   │   │  │   波形预览    │  │
│  ▶ 拾取   │  │ Sustain │ │ Slide   │   │  │   (Canvas)   │  │
│  ...      │  │ Decay   │ │ Vibrato │   │  │              │  │
│           │  └─────────┘ └─────────┘   │  └──────────────┘  │
│           │  ┌─────────┐ ┌─────────┐   │                    │
│           │  │  滤波   │ │  效果   │   │   导出设置         │
│           │  │ LP Cut  │ │ Repeat  │   │  ┌──────────────┐  │
│           │  │ HP Cut  │ │ Phaser  │   │  │ 输出目录      │  │
│           │  │ Reso    │ │         │   │  │ 文件名        │  │
│           │  └─────────┘ └─────────┘   │  │ 音量          │  │
│           │                             │  └──────────────┘  │
│           │      [方波] [锯齿] [正弦] [噪声]                   │
└──────────┴─────────────────────────────┴────────────────────┘
```

## 快速开始

### 开发模式

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
npm run preview
```

### 打包安装程序

```bash
npm run dist
```

## CLI 用法

### 基础生成

```bash
# 列出所有预设
npm run cli -- --list

# 使用预设
npm run cli -- --preset explosion -o ./sfx/boom.wav

# 随机生成
npm run cli -- --random -o ./sfx/random.wav

# 批量生成 5 个变体
npm run cli -- --preset sword_swing -b 5 -o ./sfx/sword.wav

# 从 JSON 参数文件加载
npm run cli -- --params ./my_params.json -o ./sfx/custom.wav
```

### AI 生成（需配置 LLM 环境变量）

```bash
# 自然语言描述生成
npm run cli -- --describe "低沉的爆炸声" -o ./sfx/boom.wav

# AI 反馈循环优化（最多 5 轮迭代）
npm run cli -- --describe "尖锐的激光武器声" --feedback-loop --iterations 5 -o ./sfx/laser.wav

# 分析预设波形特征
npm run cli -- --analyze --preset explosion
```

### 服务模式

```bash
# 启动 HTTP API 服务器（默认端口 3000）
npm run cli -- --api --api-port 8080

# 启动 MCP Server（stdio 模式）
npm run cli -- --mcp
```

### LLM 环境变量配置

```bash
export TONEFORGE_LLM_API_KEY="sk-xxx"
export TONEFORGE_LLM_BASE_URL="https://api.openai.com/v1"
export TONEFORGE_LLM_MODEL="gpt-4o-mini"
```

## MCP 集成

ToneForge 可作为 MCP Server 接入 Kimi Code CLI、Claude Code 等 Coding Agent：

```bash
kimi mcp add --transport stdio toneforge -- node node_modules/tsx/dist/cli.mjs src/cli.ts --mcp
```

提供 5 个工具：
- `generate_sound_by_description`：自然语言描述生成音效
- `generate_sound_by_params`：精确参数生成音效
- `optimize_sound`：AI 反馈循环优化
- `analyze_sound`：波形特征分析
- `list_presets`：列出所有内置预设

## HTTP API

启动 API 服务器后，可用以下端点：

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/presets` | 获取所有预设列表 |
| POST | `/generate` | 根据参数生成音效 |
| POST | `/describe` | 根据描述生成音效 |
| POST | `/optimize` | 反馈循环优化 |
| POST | `/analyze` | 分析波形特征 |

## 技术栈

- **桌面框架**：Electron 28 + React 18
- **构建工具**：electron-vite（Vite 5）
- **语言**：TypeScript 5（strict mode）
- **状态管理**：Zustand
- **样式**：Tailwind CSS 3 + PostCSS
- **音频引擎**：Web Audio API + sfxr 算法（TypeScript 重写）
- **CLI 运行器**：tsx
- **AI 集成**：OpenAI 兼容 API

## 引擎兼容性

| 属性 | 值 |
|------|:---|
| 格式 | WAV |
| 采样率 | 44100 Hz |
| 位深 | 16-bit |
| 声道 | 单声道 |

导出的 WAV 文件可直接在 Godot、Unity、Unreal 等引擎中使用。

## 许可证

MIT
