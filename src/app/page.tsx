
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
        <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs px-4 py-1.5 rounded-full mb-8 tracking-wider backdrop-blur-sm select-none flex items-center gap-2 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          V1.0 BUILD · SYSTEM ONLINE
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-600 text-center mb-6 drop-shadow-sm select-none leading-tight">
          私人 JAV 资产管理中枢
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto text-center leading-relaxed mb-12 select-none font-light tracking-wide">
          Jav Actress Tier Ledger & Asset System <br />
          为你的“仓鼠症”与“囤积癖”提供一个冷峻的量化解决方案。
        </p>
      </main>

      <section className="max-w-5xl mx-auto px-6 py-24 border-y border-white/20 opacity-0 animate-fade-up delay-200">
        <h2 className="text-3xl md:text-5xl font-bold text-zinc-100 mb-8 tracking-tight">记忆是不可靠的介质。</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <p className="text-zinc-400 leading-relaxed text-lg">
            面对近千位女优和上万部本地 AV 资产，传统的“按物理硬盘+文件夹”分类管理模式必然走向系统熵增。你无法精准记住谁被分配在了哪个层级，更无法实时同步她们的生命周期。
          </p>
          <p className="text-zinc-400 leading-relaxed text-lg">
            JATLAS 的诞生，就是用“数据库与规则引擎”对“人肉记忆”进行降维打击。用严密的层级字典取代感性偏好，将每一次下载行为纳入风控阈值。
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-32 opacity-0 animate-fade-up delay-300">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-black text-white mb-4">解决方案</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">三大核心逻辑，为你重塑仓储秩序，直击“仓鼠党”与“囤积癖”的痛点。</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Card A: Visual Risk Control */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md">
            <h3 className="text-2xl font-bold text-zinc-100 mb-4">视觉风控</h3>
            <p className="text-zinc-400/90 leading-relaxed mb-6 text-base">
              全局 Design Tokens 驱动的红绿灯系统，用明确的规则替换感性描述，精准暴露资产溢出风险。
            </p>
            <div className="flex flex-col space-y-3 font-mono text-sm">
              <div className="flex items-center gap-3 text-green-400"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>Safe: 容量健康</div>
              <div className="flex items-center gap-3 text-yellow-400"><div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>Warning: 20% 以内超载</div>
              <div className="flex items-center gap-3 text-red-400"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>Danger: 强制断舍离</div>
            </div>
          </div>

          {/* Card B: Millisecond-level Mutations */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md">
            <h3 className="text-2xl font-bold text-zinc-100 mb-4">毫秒级突变</h3>
            <p className="text-zinc-400/90 leading-relaxed mb-6 text-base">
              强调 Optimistic UI 和 Next.js Server Actions。主打“0.1 秒无延迟突变”与“原子化拦截平滑回滚”，告别 Loading 动画折磨。
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs text-zinc-300 font-mono">Optimistic UI</span>
              <span className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs text-zinc-300 font-mono">Server Actions</span>
            </div>
          </div>

          {/* Card C: Dual-track Ladder */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-8 rounded-3xl hover:border-zinc-700/80 transition-colors backdrop-blur-md">
            <h3 className="text-2xl font-bold text-zinc-100 mb-4">双轨天梯</h3>
            <p className="text-zinc-400/90 leading-relaxed text-base">
              补充“现役/引退”生命周期与层级绑定的逻辑，点出“信息滞后灾难”的痛点解法，将感性偏好转化为严密的资产分类字典。
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center opacity-0 animate-fade-up delay-400">
        <h2 className="text-3xl font-bold text-white mb-4">技术底座</h2>
        <p className="text-zinc-400 text-lg max-w-3xl mx-auto mb-8">
          全站采用冷灰 (Zinc) 极简风格，剥离一切干扰信息的 UI 元素。我们选择并只选择最冷峻的技术栈，斩断历史包袱。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-zinc-300">
          <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm">React 18</div>
          <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm">Next.js 14 (App Router)</div>
          <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm">PostgreSQL</div>
          <div className="px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-sm">Prisma</div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-800/50">
        <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">演进路线图</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">我们从终局视野出发，规划了四个核心演进阶段。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-xl">
                <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full mb-4">Phase 1: Done</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">底座大一统</h3>
                <p className="text-zinc-400 text-sm">Next.js + PgSQL 底座与 Optimistic UI 落地。</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-xl">
                <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full mb-4">Phase 2: Next</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">毫秒级刮削</h3>
                <p className="text-zinc-400 text-sm">Emby RESTful API 对账。</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-xl opacity-60">
                <span className="inline-block px-3 py-1 bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-bold rounded-full mb-4">Phase 3: Future</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">自动化调仓</h3>
                <p className="text-zinc-400 text-sm">局域网 NAS API 软链接 (Symlink) 编排。</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-xl opacity-60">
                <span className="inline-block px-3 py-1 bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-bold rounded-full mb-4">Phase 4: Future</span>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">动态天梯</h3>
                <p className="text-zinc-400 text-sm">时间序列喜好变迁雷达。</p>
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
