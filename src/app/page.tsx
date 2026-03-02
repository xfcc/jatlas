
import { ChevronRight, Milestone, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto opacity-0 animate-fade-up">
            <div className="text-xl font-black tracking-widest text-white select-none flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse-slow"></div>
                JATLAS
            </div>
            <Link href="/console" className="border border-zinc-800 hover:bg-zinc-800 hover:text-white px-5 py-2 rounded-lg text-sm text-zinc-400 transition-all duration-200 cursor-pointer flex items-center gap-2">
                <span>进入控制台</span>
                <ChevronRight size={16} />
            </Link>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center pt-48 pb-32 px-4 opacity-0 animate-fade-up delay-100">
        <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs px-4 py-1.5 rounded-full mb-8 tracking-wider backdrop-blur-sm select-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          V0.5 BUILD · SYSTEM ONLINE
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-600 text-center mb-6 drop-shadow-sm select-none leading-tight">
          数字资产风控中枢
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto text-center leading-relaxed mb-12 select-none font-light tracking-wide">
          基于规则引擎与动态水位的私有化大盘。<br className="hidden md:block" />
          用极其冷酷的逻辑，终结仓鼠党的无意识超载与物理硬盘熵增。
        </p>
        <Link href="/console" className="bg-white text-zinc-950 font-bold px-10 py-5 rounded-xl hover:bg-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] flex items-center gap-3">
          <Zap size={20} />
          初始化对账系统
        </Link>
      </main>

      <section className="max-w-5xl mx-auto px-6 py-24 border-y border-zinc-800/50 opacity-0 animate-fade-up delay-200">
        <h2 className="text-3xl md:text-5xl font-bold text-zinc-100 mb-8 tracking-tight">记忆是不可靠的介质。</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <p className="text-zinc-400 leading-relaxed text-lg">
            面对几百位演员和上万部本地资产，传统的“按物理硬盘+文件夹”分类管理模式必然走向系统熵增。你无法精准记住谁被分配在了哪个层级，更无法实时同步她们的生命周期。
          </p>
          <p className="text-zinc-400 leading-relaxed text-lg">
            JATLAS 的诞生，就是用“数据库与规则引擎”对“人肉记忆”进行降维打击。用严密的层级字典取代感性偏好，将每一次下载行为纳入风控阈值。
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-32 opacity-0 animate-fade-up delay-300">
        <div className="mb-16">
          <h2 className="text-4xl font-black text-white mb-4">架构与约束</h2>
          <p className="text-zinc-400 text-lg">系统通过三大核心逻辑重塑你的仓储秩序。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-zinc-900/30 border border-zinc-800/60 p-10 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md group relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-zinc-800/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-zinc-700/30 transition-all"></div>
            <div className="flex space-x-3 mb-10">
              <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 font-mono">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                {'>'} 110% Danger
              </div>
              <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 font-mono">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
                {'>'} 100% Warning
              </div>
              <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 font-mono">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                 &lt;= 100% Safe
              </div>
            </div>
            <h3 className="text-3xl font-bold text-zinc-100 mb-4 tracking-tight relative z-10">动态水位与视觉阻断</h3>
            <p className="text-zinc-400/90 leading-relaxed max-w-xl text-lg relative z-10">
              设定每个分类的建议保存数量。系统实时对冲实际影片数，通过红黄绿三色阈值，精准暴露资产溢出风险，强制执行物理空间断舍离。
            </p>
          </div>
          <div className="md:col-span-4 bg-zinc-900/30 border border-zinc-800/60 p-10 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-4 tracking-tight">双轨级联天梯</h3>
              <p className="text-zinc-400/90 leading-relaxed text-base">
                为「现役」与「引退」构建完全独立的评级通道。从 Premium 到 Archive，将感性偏好转化为严密的资产分类字典。
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-800/50">
              <div className="text-sm font-mono text-zinc-500 mb-2">Tier Structure</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded text-xs text-zinc-300">Premium</span>
                <span className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded text-xs text-zinc-300">Classic</span>
                <span className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded text-xs text-zinc-300">Impression</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-5 bg-zinc-900/30 border border-zinc-800/60 p-10 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-6">
              <Milestone size={12} />
              PHASE 2 PREVIEW
            </div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-4 tracking-tight">Emby API 对账引擎</h3>
            <p className="text-zinc-400/90 leading-relaxed text-base mb-6">
              未来将直接劫持 Emby 局域网接口。废弃人工录入，毫秒级抓取底层刮削数据，实现逻辑看板与物理硬盘的 100% 自动化同步。
            </p>
          </div>
          <div className="md:col-span-7 bg-zinc-900/30 border border-zinc-800/60 p-10 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-[-10%] top-[-20%] opacity-10 font-mono text-xs text-zinc-500 whitespace-pre pointer-events-none select-none">
              def calc_risk(c, l): return 'SAFE' if l==0 or c/l&lt;=1 else 'WARNING' if c/l&lt;=1.1 else 'DANGER'
            </div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-4 tracking-tight z-10">物理级真空隐私</h3>
            <p className="text-zinc-400/90 leading-relaxed text-base mb-8 max-w-lg z-10">
              零外部依赖，毫秒级 SQLite 单文件驱动。你的核心资产账本与隐秘偏好，永远只停留在 localhost 127.0.0.1。
            </p>
            <div className="flex gap-4 z-10">
              <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-300">Vue 3</div>
              <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-300">FastAPI</div>
              <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-300">SQLite3</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-24 text-center opacity-0 animate-fade-up delay-400">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">准备好重塑秩序了吗？</h2>
        <p className="text-zinc-400 text-xl mb-10">
          停止盲目的物理囤积，立刻拉起你的风控大盘。
        </p>
        <Link href="/console" className="bg-zinc-100 text-zinc-900 font-bold px-12 py-5 rounded-xl hover:bg-white transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 mx-auto">
          进入 Console <ChevronRight size={20} />
        </Link>
      </section>
    </>
  );
}
