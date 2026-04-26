# ToneForge / 音锻 — AGENTS.md

> 本文件供 AI 编码助手阅读。如果你对该项目一无所知，请先阅读此文件。

---

## 项目概述

**ToneForge（音锻）** 是一款受 sfxr 启发的桌面端游戏音效生成工具。用户通过调整参数或选择预设，实时合成各类游戏音效，并导出为标准 WAV 格式（44.1kHz / 16-bit / 单声道），可直接在 Godot 等游戏引擎中使用。

项目同时提供：
- **桌面 GUI 应用**：基于 Electron + React 的交互式界面
- **命令行接口（CLI）**：支持批量生成、预设调用、参数文件导入、AI 描述生成
- **MCP Server**：作为 Model Context Protocol 服务器，为 AI 助手提供音效生成工具
- **HTTP API 服务**：提供 RESTful 接口，支持第三方集成

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | ^28.2.0 |
| 前端框架 | React（函数组件 + Hooks） | ^18.2.0 |
| 语言 | TypeScript（strict: true） | ^5.3.3 |
| 构建工具 | electron-vite（基于 Vite 5） | ^2.0.0 |
| 状态管理 | Zustand | ^4.5.0 |
| 样式方案 | Tailwind CSS 3 + PostCSS | ^3.4.1 |
| 音频引擎 | Web Audio API | 浏览器原生 |
| CLI 运行器 | tsx | ^4.21.0 |
| AI 集成 | OpenAI 兼容 API | 通过环境变量配置 |

---

## 项目结构

```
toneforge/
├── src/
│   ├── main/
│   │   └── index.ts              # Electron 主进程：窗口创建、生命周期、IPC 处理
│   ├── preload/
│   │   └── index.ts              # contextBridge 暴露 API 给渲染进程
│   ├── renderer/
│   │   ├── main.tsx              # React 入口
│   │   ├── App.tsx               # 根组件（三栏布局）
│   │   ├── index.html            # HTML 模板（含 CSP）
│   │   ├── index.css             # Tailwind + 自定义滚动条/滑块样式
│   │   ├── components/
│   │   │   ├── PresetPanel.tsx   # 左侧：16 种预设列表（按分类展示）
│   │   │   ├── ParamPanel.tsx    # 中间：参数调节面板 + 随机/播放按钮
│   │   │   ├── SliderControl.tsx # 可复用滑块（支持 Shift 微调）
│   │   │   ├── WaveformType.tsx  # 波形类型选择（方波/锯齿/正弦/噪声）
│   │   │   ├── Visualizer.tsx    # 右侧：Canvas 波形可视化
│   │   │   └── ExportPanel.tsx   # 右侧：导出设置、历史记录、参数导入导出
│   │   ├── engine/
│   │   │   ├── sfxr.ts           # sfxr 核心合成引擎（TypeScript 重写）
│   │   │   ├── wav-encoder.ts    # WAV 编码器（RIFF/WAVE 格式）
│   │   │   └── audio-context.ts  # Web Audio API 封装（播放/波形获取）
│   │   ├── presets/
│   │   │   └── index.ts          # 16 种游戏音效预设定义
│   │   └── stores/
│   │       └── appStore.ts       # Zustand 全局状态管理
│   ├── ai/                       # AI 增强模块
│   │   ├── description-parser.ts # 自然语言描述解析为 sfxr 参数
│   │   ├── feedback-loop.ts      # AI 反馈循环优化参数
│   │   ├── llm-client.ts         # LLM API 客户端（OpenAI 兼容格式）
│   │   ├── waveform-analyzer.ts  # 波形分析与特征提取
│   │   └── prompts/              # LLM 系统提示词
│   ├── mcp/
│   │   └── mcp-server.ts         # MCP Server（stdio 传输，JSON Lines 协议）
│   ├── server/
│   │   └── api-server.ts         # HTTP API 服务器（独立进程）
│   ├── types/
│   │   └── index.ts              # 共享类型：SfxrParams、Preset、HistoryItem、IPC 通道
│   └── cli.ts                    # 命令行入口（独立于 Electron）
├── scripts/                      # 启动脚本（PowerShell / CMD）
├── out/                          # 构建输出目录（main / preload / renderer）
├── electron.vite.config.ts       # electron-vite 配置（三进程分别配置）
├── tsconfig.json                 # TypeScript 主配置（strict，路径别名）
├── tsconfig.node.json            # Node 配置（用于构建配置本身）
├── tailwind.config.js            # Tailwind 主题色配置（tf-* 前缀色板）
├── postcss.config.js             # PostCSS 插件配置
└── package.json                  # 依赖与脚本
```

---

## 构建与运行命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 打包为安装程序（electron-builder）
npm run dist

# CLI 基础用法
npm run cli -- --list
npm run cli -- --preset explosion -o ./sfx/explosion.wav
npm run cli -- --random -o ./sfx/random.wav

# CLI AI 用法（需配置 LLM 环境变量）
npm run cli -- --describe "低沉的爆炸声" -o ./sfx/boom.wav
npm run cli -- --describe "激光武器" --feedback-loop --iterations 5 -o ./sfx/laser.wav
npm run cli -- --analyze --preset explosion

# CLI 服务模式
npm run cli -- --api --api-port 8080
npm run cli -- --mcp
```

---

## 运行时架构

本项目采用 **Electron 多进程架构**：

1. **主进程（Main）** `src/main/index.ts`
   - 创建 `BrowserWindow`（1280×800，最小 960×640）
   - 处理 IPC：`SAVE_WAV`、`SELECT_OUTPUT_DIR`、`SAVE_JSON`、`LOAD_JSON`
   - 使用 Node.js `fs` 进行文件读写，使用 `dialog` 进行目录/文件选择
   - `contextIsolation: true`，`nodeIntegration: false`

2. **预加载脚本（Preload）** `src/preload/index.ts`
   - 通过 `contextBridge.exposeInMainWorld('electronAPI', ...)` 暴露安全的 API
   - 渲染进程通过 `window.electronAPI.*` 调用主进程功能

3. **渲染进程（Renderer）** `src/renderer/`
   - React 18 应用，根组件 `App.tsx` 采用三栏布局
   - 使用 Web Audio API 进行实时音频播放（`audio-context.ts`）
   - 合成引擎纯计算，不依赖外部库

4. **CLI** `src/cli.ts`
   - 直接引入渲染进程侧的 `sfxr.ts`、`wav-encoder.ts` 和 `presets/index.ts`
   - 使用 Node.js `fs` 写入文件，不依赖 Electron
   - 通过 `tsx` 直接运行 TypeScript
   - 支持 AI 描述生成（`--describe`）、反馈循环优化（`--feedback-loop`）、波形分析（`--analyze`）

5. **MCP Server** `src/mcp/mcp-server.ts`
   - 通过 `--mcp` 参数启动，使用 stdio 传输
   - 协议：JSON Lines（每条消息以 `\n` 结尾）
   - 提供 5 个工具：`generate_sound_by_description`、`generate_sound_by_params`、`optimize_sound`、`analyze_sound`、`list_presets`
   - 环境变量：`TONEFORGE_LLM_API_KEY`、`TONEFORGE_LLM_BASE_URL`、`TONEFORGE_LLM_MODEL`

6. **HTTP API Server** `src/server/api-server.ts`
   - 通过 `--api` 参数启动，默认端口 3000
   - 端点：`GET /presets`、`POST /generate`、`POST /describe`、`POST /optimize`、`POST /analyze`

---

## 路径别名

| 别名 | 对应路径 |
|------|---------|
| `@/*` | `src/renderer/*` |
| `@main/*` | `src/main/*` |
| `@preload/*` | `src/preload/*` |
| `@types/*` | `src/types/*` |

在 `tsconfig.json` 和 `electron.vite.config.ts` 中均已配置。

---

## 核心合成引擎

`sfxr.ts` 实现了完整的 sfxr 合成算法：

- **波形类型**：0=方波、1=锯齿波、2=正弦波、3=噪声
- **包络**：Attack / Sustain / Sustain Punch / Decay
- **音高**：Start Frequency / Min Frequency / Slide / Delta Slide
- **颤音**：Vibrato Depth / Vibrato Speed
- **变化**：Change Amount / Change Speed
- **滤波器**：LP Cutoff / Resonance / Cutoff Sweep、HP Cutoff / Cutoff Sweep
- **相位器**：Phaser Offset / Phaser Sweep
- **重复**：Repeat Speed
- **主音量**：Master Volume

所有参数在 `SfxrParams` 接口中定义为归一化的 `0~1` 范围（部分如 Slide 为 `-1~1`），在合成时转换为内部实际值。

---

## AI 模块

`src/ai/` 目录包含 AI 增强功能，均通过 OpenAI 兼容 API 调用 LLM：

- **`description-parser.ts`**：将自然语言描述（如"低沉的爆炸声"）解析为 sfxr 参数
- **`feedback-loop.ts`**：多轮迭代优化，生成 → 分析 → LLM 调整参数 → 再生成
- **`waveform-analyzer.ts`**：提取波形的时长、RMS、峰值、频率、亮度、噪声度等特征
- **`llm-client.ts`**：统一的 LLM HTTP 客户端，支持配置 baseUrl、model、apiKey

**环境变量配置**：
```bash
export TONEFORGE_LLM_API_KEY="sk-xxx"
export TONEFORGE_LLM_BASE_URL="https://api.openai.com/v1"  # 或 https://api.moonshot.cn/v1
export TONEFORGE_LLM_MODEL="gpt-4o-mini"                    # 或 moonshot-v1-8k
```

---

## 代码风格指南

- **语言**：所有注释和 UI 文本使用**中文**（zh-CN）。代码标识符使用英文。
- **TypeScript**：`strict: true`，`noUnusedLocals: true`，`noUnusedParameters: true`
- **React**：仅使用函数组件和 Hooks，不使用类组件
- **状态管理**：使用 Zustand，所有状态变更通过 Store Action 完成
- **样式**：使用 Tailwind CSS 工具类，自定义颜色以 `tf-` 为前缀定义在 `tailwind.config.js`
- **IPC**：通道常量统一定义在 `src/types/index.ts` 的 `IPC_CHANNELS` 对象中，禁止硬编码字符串

---

## 测试策略

**当前项目暂无自动化测试。** 验证方式以手动测试为主：

1. **GUI 测试**：`npm run dev` 启动后，点击各预设确认实时播放正常
2. **参数调节**：拖动滑块，确认 Shift 微调和空格播放生效
3. **导出测试**：选择目录后导出 WAV，确认文件能在 Godot 等引擎中播放
4. **CLI 测试**：`npm run cli -- --preset explosion -o test.wav` 验证命令行输出
5. **AI 测试**：`npm run cli -- --describe "爆炸声" -o ai_test.wav` 验证 LLM 解析
6. **MCP 测试**：`kimi mcp test toneforge` 验证 MCP 连接与工具列表

---

## 安全注意事项

1. **CSP**：`index.html` 中设置了 `Content-Security-Policy`，限制脚本和样式来源
2. **Context Isolation**：预加载脚本使用 `contextBridge`，渲染进程无直接 Node.js 访问权限
3. **文件路径**：所有文件写入均通过主进程 IPC 处理，渲染进程不直接操作 `fs`
4. **路径处理**：使用 Node.js `path` 模块处理路径，避免字符串拼接
5. **API 密钥**：LLM API key 通过环境变量传入，不在代码中硬编码

---

## 扩展建议

- 新增预设：在 `src/renderer/presets/index.ts` 中添加 `Preset` 对象
- 新增 IPC 通道：在 `src/types/index.ts` 的 `IPC_CHANNELS` 中定义常量，并在 `main/index.ts` 和 `preload/index.ts` 中同步注册
- 新增参数：修改 `SfxrParams` 接口、`appStore.ts` 默认值、`sfxr.ts` 合成逻辑，并在 `ParamPanel.tsx` 中添加对应滑块
- CLI 新功能：直接修改 `src/cli.ts`，它复用渲染进程的合成引擎，无需改动 Electron 部分
- MCP 新工具：在 `src/mcp/mcp-server.ts` 的 `TOOLS` 数组和 `handleToolCall` 中添加
- AI 新功能：修改 `src/ai/` 中的对应模块，复用 `llm-client.ts` 进行 LLM 调用
