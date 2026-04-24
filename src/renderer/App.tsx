import React from 'react'
import PresetPanel from './components/PresetPanel'
import ParamPanel from './components/ParamPanel'
import Visualizer from './components/Visualizer'
import ExportPanel from './components/ExportPanel'

function App(): React.ReactElement {
  return (
    <div className="h-screen w-screen bg-tf-bg text-tf-text flex flex-col overflow-hidden">
      {/* 顶部标题栏 */}
      <header className="h-12 border-b border-tf-border flex items-center px-4 shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-tf-accent/5 via-transparent to-tf-accent/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-tf-accent/30 to-transparent" />
        <h1 className="text-tf-accent font-bold text-lg tf-glow-text relative z-10">
          ToneForge <span className="text-tf-text-dim text-sm font-normal">/ 音锻</span>
        </h1>
        <span className="ml-auto text-tf-text-dim text-xs relative z-10">游戏音效生成工具</span>
      </header>

      {/* 主体三栏布局 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：预设列表 */}
        <aside className="w-52 border-r border-tf-border p-3 overflow-hidden">
          <PresetPanel />
        </aside>

        {/* 中间：参数面板 */}
        <section className="flex-1 border-r border-tf-border p-3">
          <ParamPanel />
        </section>

        {/* 右侧：可视化与导出 */}
        <aside className="w-72 p-3 space-y-3 overflow-y-auto custom-scrollbar">
          <Visualizer />
          <ExportPanel />
        </aside>
      </main>
    </div>
  )
}

export default App
