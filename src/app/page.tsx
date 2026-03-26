
import {
  ChevronRight,
  Eye,
  Zap,
  Layers,
  Activity,
  Shield,
  Database,
  Server,
} from "lucide-react";
import Link from "next/link";

/** 与导航、正文、页脚共用同一列宽与水平内边距 */
const landingShell = "max-w-5xl mx-auto px-6";

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-6">
      <span className="text-[11px] font-mono text-zinc-600 tracking-[0.2em] uppercase select-none">
        {label}
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div
          className={`flex items-center justify-between py-3.5 opacity-0 animate-fade-up ${landingShell}`}
        >
          <div className="flex items-center gap-3 select-none">
            <div className="flex items-center gap-2 text-lg font-black tracking-widest text-white">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-slow" />
              JATLAS
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <span className="text-[11px] text-zinc-500 font-mono tracking-wider hidden sm:inline">
              数字资产管控中枢
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-600 text-[10px] px-2.5 py-1 rounded-full tracking-[0.12em] select-none items-center gap-1.5 font-mono hidden sm:flex">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              V1.2
            </div>
            <Link
              href="/console"
              className="border border-zinc-800 hover:bg-zinc-800 hover:text-white px-4 py-1.5 rounded-lg text-sm text-zinc-400 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              进入控制台
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Problem ── */}
      <section
        id="manifesto"
        className={`${landingShell} pt-20 pb-16 opacity-0 animate-fade-up delay-100`}
      >
        <SectionLabel label="The Problem" />

        <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-3 tracking-tight leading-tight">
          记忆是不可靠的介质，
          <span className="text-zinc-500">文件夹是注定崩塌的秩序。</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400/80 font-mono text-[11px] tracking-[0.15em]">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
              STORAGE OVERFLOW
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">存储失控</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              无水位限制的物理囤积模式下，低价值资产无休止挤占空间，直到硬盘报警才被迫介入——但此时清理成本已不可控。
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400/80 font-mono text-[11px] tracking-[0.15em]">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
              MEMORY CHAOS
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">记忆混乱</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              近千量级的资产散布多级目录，人脑无法精确追踪每一项的评级、路径与归属。规模越大，信息熵越高。
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-400/80 font-mono text-[11px] tracking-[0.15em]">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
              SYNC LATENCY
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">信息滞后</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              状态变更（引退、重新出道、改名）无法实时同步至管理策略，层级配置与真实偏好长期脱节。
            </p>
          </div>
        </div>
      </section>

      {/* ── Solutions ── */}
      <section
        className={`${landingShell} py-16 opacity-0 animate-fade-up delay-300`}
      >
        <SectionLabel label="Solutions" />

        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            量化管控，取代感性判断
          </h2>
          <p className="text-zinc-500 text-base max-w-2xl">
            四大核心引擎，从风控可视化、极速交互、生命周期管理到事件溯源，构建完整的资产管控闭环。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visual Risk Control */}
          <div className="bento-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                <Eye size={16} className="text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  视觉风控系统
                </h3>
                <p className="text-[11px] text-zinc-600 font-mono tracking-wider">
                  VISUAL RISK CONTROL
                </p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed text-sm mb-4">
              全局 Design Tokens
              驱动的三级预警机制。每一个层级的容量状态，都被抽象为可量化的信号灯——取代「好像快满了」的模糊感知。
            </p>
            <div className="flex flex-col space-y-2.5 font-mono text-xs">
              <div className="flex items-center gap-3 text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--shadow-green-glow)]" />
                SAFE — 容量健康，正常运作
              </div>
              <div className="flex items-center gap-3 text-yellow-400/90 bg-yellow-500/5 border border-yellow-500/10 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_var(--shadow-yellow-glow)]" />
                WARNING — 接近阈值，建议调仓
              </div>
              <div className="flex items-center gap-3 text-red-400/90 bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_var(--shadow-red-glow)]" />
                DANGER — 超载触发，强制断舍离
              </div>
            </div>
          </div>

          {/* Optimistic Mutation */}
          <div className="bento-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                <Zap size={16} className="text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  零延迟突变引擎
                </h3>
                <p className="text-[11px] text-zinc-600 font-mono tracking-wider">
                  OPTIMISTIC MUTATION
                </p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed text-sm mb-4">
              基于 Next.js Server Actions 与 React useOptimistic 构建。UI 在
              0.1s
              内完成状态切换，后台静默持久化。失败时原子化回滚，无需加载动画干扰操作流。
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bento-tag text-xs font-mono">
                Server Actions
              </span>
              <span className="bento-tag text-xs font-mono">useOptimistic</span>
              <span className="bento-tag text-xs font-mono">
                Atomic Rollback
              </span>
            </div>
          </div>

          {/* Dual-Track Lifecycle */}
          <div className="bento-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                <Layers size={16} className="text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  双轨生命周期
                </h3>
                <p className="text-[11px] text-zinc-600 font-mono tracking-wider">
                  DUAL-TRACK LIFECYCLE
                </p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed text-sm">
              独立维护「现役」与「引退」两条天梯通道，每条通道绑定独立的层级字典与容量配额。当演员状态变更时，系统自动触发跨通道迁移，确保分类策略与真实状态绝对同步。
            </p>
          </div>

          {/* Event Sourcing */}
          <div className="bento-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                <Activity size={16} className="text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  事件溯源日志
                </h3>
                <p className="text-[11px] text-zinc-600 font-mono tracking-wider">
                  EVENT SOURCING
                </p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed text-sm">
              独立部署 AssetLog
              防篡改日志表，精确记录每一笔资产变动的时间、类型与快照。支撑全局风控大盘的历史回溯与增量分析，为未来的趋势预判提供数据基底。
            </p>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section
        className={`${landingShell} py-16 opacity-0 animate-fade-up delay-400`}
      >
        <SectionLabel label="Tech Stack" />

        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            技术底座
          </h2>
          <p className="text-zinc-500 text-base max-w-xl">
            全栈同构架构，从视图层到持久化层采用统一的 TypeScript
            类型约束，剥离一切冗余抽象。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono tracking-[0.15em] uppercase">
              <Shield size={12} />
              Frontend
            </div>
            <div className="space-y-2">
              {[
                ["React", "v18"],
                ["Next.js", "v14 App Router"],
                ["Tailwind CSS", "v3"],
                ["shadcn/ui", "Radix"],
              ].map(([name, ver]) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/50 border border-zinc-800/60 rounded-lg"
                >
                  <span className="text-sm text-zinc-300">{name}</span>
                  <span className="text-[11px] text-zinc-600 font-mono">
                    {ver}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono tracking-[0.15em] uppercase">
              <Database size={12} />
              Backend & Data
            </div>
            <div className="space-y-2">
              {[
                ["Server Actions", "RSC"],
                ["PostgreSQL", "RDBMS"],
                ["Prisma", "ORM"],
              ].map(([name, ver]) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/50 border border-zinc-800/60 rounded-lg"
                >
                  <span className="text-sm text-zinc-300">{name}</span>
                  <span className="text-[11px] text-zinc-600 font-mono">
                    {ver}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono tracking-[0.15em] uppercase">
              <Server size={12} />
              Infrastructure
            </div>
            <div className="space-y-2">
              {[
                ["Emby API", "Sync"],
                ["Docker", "Compose"],
                ["TypeScript", "Strict"],
              ].map(([name, ver]) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/50 border border-zinc-800/60 rounded-lg"
                >
                  <span className="text-sm text-zinc-300">{name}</span>
                  <span className="text-[11px] text-zinc-600 font-mono">
                    {ver}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className={`${landingShell} py-16`}>
        <SectionLabel label="Roadmap" />

        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            演进路线
          </h2>
          <p className="text-zinc-500 text-base max-w-xl">
            从底座到智能，逐阶段释放管控能力。每个版本聚焦一个核心命题。
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-blue-500/30 to-zinc-800/20 hidden md:block" />

          <div className="space-y-2">
            {/* v1.0 */}
            <div className="flex gap-6 items-start">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="pb-6">
                <span className="text-[11px] font-mono text-emerald-400 tracking-[0.15em]">
                  v1.0 — SHIPPED
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1 mb-2">
                  底座与核心交互
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  Next.js + PostgreSQL 架构落地。实装 CRUD、动态水位线、Optimistic
                  UI，完成从零到一的核心突变闭环。
                </p>
              </div>
            </div>

            {/* v1.1 */}
            <div className="flex gap-6 items-start">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="pb-6">
                <span className="text-[11px] font-mono text-emerald-400 tracking-[0.15em]">
                  v1.1 — SHIPPED
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1 mb-2">
                  Emby 自动对账引擎
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  接入局域网 Emby RESTful API，基于 PersonId
                  实现一键库存抓取。支持多 ID
                  绑定防止数据分裂，保持逻辑看板与物理硬盘的绝对一致。
                </p>
              </div>
            </div>

            {/* v1.2 */}
            <div className="flex gap-6 items-start">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="pb-6">
                <span className="text-[11px] font-mono text-emerald-400 tracking-[0.15em]">
                  v1.2 — SHIPPED
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1 mb-2">
                  事件溯源与风控大盘
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  实装 AssetLog 防篡改日志体系，上线全局风控
                  Dashboard。将静态报表转化为可执行的管控指令：生态透视、红线阻断、清理待办。
                </p>
              </div>
            </div>

            {/* v1.3 — In Progress */}
            <div className="flex gap-6 items-start">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="pb-6">
                <span className="text-[11px] font-mono text-blue-400 tracking-[0.15em]">
                  v1.3 — IN PROGRESS
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1 mb-2">
                  NAS 物理层联动
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  接入 NAS API
                  监控物理硬盘使用率，基于层级规则自动生成软链接编排指令，打通逻辑层与物理存储的最后一公里。
                </p>
              </div>
            </div>

            {/* v2.0 — Planned */}
            <div className="flex gap-6 items-start opacity-50">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                </div>
              </div>
              <div>
                <span className="text-[11px] font-mono text-zinc-500 tracking-[0.15em]">
                  v2.0 — PLANNED
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mt-1 mb-2">
                  趋势预判与动态天梯
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  基于时间序列日志分析资产增量斜率，预判审美偏好转移，实现天梯的自适应调仓建议。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className={`${landingShell} py-16 opacity-0 animate-fade-up delay-400`}
      >
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight leading-tight">
              停止盲目囤积，<span className="text-zinc-500">拉起你的风控大盘。</span>
            </h2>
            <p className="text-zinc-500 text-sm">
              从这里开始，让每一次资产决策都有据可依。
            </p>
          </div>
          <Link
            href="/console"
            className="inline-flex items-center gap-2 bg-white text-zinc-900 font-semibold px-8 py-3 rounded-lg hover:bg-zinc-200 transition-all hover:scale-[1.02] text-sm flex-shrink-0"
          >
            进入 Console <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/50 py-8">
        <div className={`flex items-center justify-between ${landingShell}`}>
          <span className="text-[11px] text-zinc-600 font-mono select-none">
            JATLAS v1.2
          </span>
          <span className="text-[11px] text-zinc-700 select-none">
            Desktop-Class Web App · Physical Isolation
          </span>
        </div>
      </footer>
    </>
  );
}
