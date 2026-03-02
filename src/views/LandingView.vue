<template>
  <div class="bg-black text-zinc-300 font-sans">
    <div class="landing-container mx-auto">

      <!-- Header -->
      <header class="py-6 flex justify-between items-center">
        <div class="font-bold text-lg text-white tracking-wider">• JATLAS</div>
        <a href="/console" class="text-sm text-zinc-400 hover:text-white transition-colors flex items-center">
          进入控制台
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </a>
      </header>

      <!-- Hero Section -->
      <section class="text-center pt-24 pb-32 relative">
        <div class="relative z-10">
          <div class="inline-flex items-center bg-zinc-900 border border-zinc-700 text-sm text-zinc-300 px-3 py-1 rounded-full mb-6">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            V0.5 BUILD - SYSTEM ONLINE
          </div>
          <h1 class="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-6">
            数字资产风控中枢
          </h1>
          <p class="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-loose mb-10">
            基于规则引擎与动态水位的私有化大盘。<br/>用极其冷酷的逻辑，终结仓鼠党的无意识超载与物理硬盘熵增。
          </p>
          <a href="/console" class="bg-white text-black font-semibold px-8 py-4 rounded-lg hover:bg-zinc-200 transition-colors inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 mr-2"><path d="m7 11 2-2-2-2"/><path d="M11 13h4"/></svg>
            初始化对账系统
          </a>
        </div>
      </section>

      <!-- Memory Section -->
      <section class="py-24">
        <div class="grid md:grid-cols-5 gap-16 items-center">
          <div class="md:col-span-3">
            <h2 class="text-4xl font-bold text-white mb-4">记忆是不可靠的介质。</h2>
            <p class="text-zinc-400 leading-loose">
              面对几百位演员和上万部本地资产，传统的“按物理硬盘+文件夹“分类管理模式必然走向系统熵增。你无法精准记住谁被分配在了哪个层级，更无法实时同步她们的生命周期。
            </p>
          </div>
          <div class="md:col-span-2">
            <p class="text-zinc-400 leading-loose border-l-2 border-zinc-700 pl-8">
              JATLAS 的诞生，就是用“数据库与规则引擎“对“人肉记忆”进行降维打击。用严密的层级字典取代感性偏好，将每一次下载行为纳入风控阀值。
            </p>
          </div>
        </div>
      </section>

      <!-- Architecture Section (Bento Grid) -->
      <section class="py-24">
        <h2 class="text-4xl font-bold text-white mb-4">架构与约束</h2>
        <p class="text-zinc-400 leading-loose mb-12">系统通过三大核心逻辑重塑你的仓储秩序。</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bento-card md:col-span-2">
            <h3 class="text-xl font-bold text-white mb-6">动态水位与视觉阻断</h3>
            <div class="flex flex-wrap gap-4 text-xs mb-6">
              <div class="flex items-center border border-red-800 bg-red-950/50 rounded-md px-3 py-1">
                <span class="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                <span>&gt; 110% Danger</span>
              </div>
              <div class="flex items-center border border-yellow-800 bg-yellow-950/50 rounded-md px-3 py-1">
                <span class="h-2 w-2 bg-yellow-400 rounded-full mr-2"></span>
                <span>&gt; 90% Warning</span>
              </div>
               <div class="flex items-center border border-green-800 bg-green-950/50 rounded-md px-3 py-1">
                <span class="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                <span>&lt; 90% Safe</span>
              </div>
            </div>
            <p class="text-zinc-400 leading-relaxed">设定每个分类的建议保存数量。系统实时对冲实际影片数，通过红黄绿三色阀值，精准暴露资产溢出风险，强制执行物理空间断舍离。</p>
          </div>
          <div class="bento-card">
            <h3 class="text-xl font-bold text-white mb-4">双轨级联天梯</h3>
            <p class="text-zinc-400 leading-relaxed mb-4">为「現役」与「引退」构建完全独立的评级通道。从 Premium 到 Archive，将感性偏好转化为严密的资产分类字典。</p>
            <p class="text-xs text-zinc-500 mb-2">Tier Structure</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="bento-tag">Premium</span>
              <span class="bento-tag">Classic</span>
              <span class="bento-tag">Impression</span>
            </div>
          </div>
          <div class="bento-card">
             <div class="text-xs text-blue-400 bg-blue-900/50 border border-blue-800 px-2 py-1 rounded-full mb-4 inline-block">PHASE 2 PREVIEW</div>
            <h3 class="text-xl font-bold text-white mb-4">Emby API 对账引擎</h3>
            <p class="text-zinc-400 leading-relaxed">未来将直接对接 Emby 局域网接口。废弃人工录入，毫秒级抓取底层刮削数据，实现逻辑看板与物理硬盘的 100% 自动化同步。</p>
          </div>
          <div class="bento-card md:col-span-2 relative overflow-hidden">
            <div class="absolute top-0 right-0 -mt-8 -mr-16 w-1/2 h-full opacity-5 pointer-events-none text-xs [mask-image:linear-gradient(to_right,transparent,black_50%)]">
              <pre class="text-zinc-500"><code>
@app.get("/actresses/{actress_id}")
def get_actress(actress_id: int, db: Session = Depends(get_db)):
    db_actress = crud.get_actress(db, actress_id=actress_id)
    if db_actress is None:
        raise HTTPException(status_code=404, detail="Actress not found")
    return db_actress

@app.post("/tiers/", response_model=schemas.Tier)
def create_tier(tier: schemas.TierCreate, db: Session = Depends(get_db)):
    return crud.create_tier(db=db, tier=tier)
              </code></pre>
            </div>
            <h3 class="text-xl font-bold text-white mb-4">物理级真空隐私</h3>
            <p class="text-zinc-400 leading-relaxed mb-4">零外部依赖，毫秒级 SQLite 单文件驱动，你的核心资产账本与隐秘偏好，永远只停留在 localhost 127.0.0.1。</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="bento-tag">Vue 3</span>
              <span class="bento-tag">FastAPI</span>
              <span class="bento-tag">SQLite3</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="text-center py-32">
        <h2 class="text-4xl font-bold text-white mb-4">准备好重塑秩序了吗？</h2>
        <p class="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed mb-10">停止盲目的物理囤积，立刻拉起你的风控大盘。</p>
        <a href="/console" class="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition-colors inline-flex items-center">
          进入 Console
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </a>
      </section>

    </div>
  </div>
</template>

<script>
export default {
  name: 'LandingView',
};
</script>
