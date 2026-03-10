# JATLAS (Jav Actress Tier Ledger & Asset System)

**私人数字资产风控大盘与天梯中枢。**

<div align="center">
  <h3>
    <a href="#-项目介绍-introduction">📖 项目介绍</a>
    <span> | </span>
    <a href="#-本地部署-deployment">🚀 本地部署</a>
  </h3>
</div>

---

<h2 id="-项目介绍-introduction">📖 项目介绍 (Introduction)</h2>

JATLAS 专为大规模本地视频收藏设计。用强类型数据和自动化规则，取代基于文件夹和人肉记忆的低效管理。

### 核心痛点 (The Problem)
* **存储失控**：缺乏水位限制，低价值资产无休止挤占物理空间。
* **记忆混乱**：资产随规模扩大而分散，难以精确追踪评级与存放路径。
* **信息滞后**：状态变更（如引退）未能及时同步，导致管理策略失效。

### 核心特性 (Core Features)

**1. 资产风控大盘 (Dashboard & Actionable Insights)**
将静态报表转化为执行指令：
* **生态透视**：监控各梯队（Tier）人数与资产占比，防范评级通胀。
* **红线阻断**：自动提取“爆仓资产”与“停滞资产”，生成清理待办清单。

![Dashboard 预览](./public/dashboard.png)
*(图：JATLAS v1.2 全局风控大盘)*

**2. Emby 自动对账 (Emby Sync Engine)**
基于局域网 Emby RESTful API 与 `PersonId` 实现数据抓取。将刮削器的真实库存一键覆写回大盘，保持逻辑看板与物理硬盘的绝对一致。

**3. 动态水位与乐观更新 (Dynamic Quota & Optimistic UI)**
* **视觉风控**：设定分类限额，通过 🟢 安全、🟡 警告、🔴 危险 全局 Token 自动对冲库存。
* **零延迟响应**：基于 Next.js Server Actions 与 `useOptimistic`，UI 状态 0.1 秒突变，后台静默同步。

![控制台列表预览](./public/actress.png)
*(图：JATLAS 资产控制台与动态水位线)*

**4. 事件溯源架构 (Event-Sourcing)**
采用 Next.js 同构架构与 Zinc 暗黑极简规范。数据库层独立部署 `AssetLog` 防篡改日志表，精确记录资产时间轴的每一笔增删流水。

### 技术底座 (Tech Stack)
* **框架**: React 18 + Next.js 14 (App Router)
* **数据流**: Server Actions + `useOptimistic`
* **持久化**: PostgreSQL + Prisma ORM
* **UI**: Tailwind CSS 3 + shadcn/ui

### 演进路线 (Roadmap)
* **v1.0 (Done)**: 核心 CRUD、动态水位线、Optimistic UI。
* **v1.1 (Done)**: 接入 Emby API 打通自动抓取，支持多 ID 绑定防分裂。
* **v1.2 (Done)**: 实装 `AssetLog` 日志体系，上线全局风控大盘。
* **v1.3 (Next)**: 接入 NAS API 监控物理硬盘，基于规则自动生成软链接 (Symlink)。
* **v2.0 (Future)**: 基于时间序列与日志分析资产增量斜率，预判审美转移。

<br>

---

<h2 id="-本地部署-deployment">🚀 本地部署 (Deployment)</h2>

JATLAS 被设计为物理隔离的 Desktop-Class Web App。

### 0. 前置环境
* **Node.js** (v18.17+)
* **PostgreSQL** (Mac 推荐 Postgres.app，开启静默自启)
* **Emby Server** (局域网可达)

### 1. 克隆与安装
```bash
git clone [https://github.com/xfcc/JATLAS.git](https://github.com/xfcc/JATLAS.git)
cd JATLAS
npm install

```

### 2. 环境变量配置

```bash
cp .env.example .env

```

编辑 `.env` 文件：

```env
# [核心] 数据库连接 (本地 Postgres 实例)
DATABASE_URL="postgresql://用户名:密码@localhost:5432/jatlas?schema=public"

# [可选] Emby 引擎配置 (留空则降级为纯手动记账)
EMBY_SERVER_URL="[http://192.168.](http://192.168.)x.x:8096" # 仅根地址，严禁带斜杠
EMBY_API_KEY="你的_EMBY_API_KEY"

```

### 3. 数据底座迁移

推送 Prisma 骨架与日志体系至本地数据库：

```bash
npx prisma migrate dev --name init

```

### 4. 引擎点火

```bash
npm run dev

```

访问 `http://localhost:3000`，风控中枢上线。

> **💡 极客建议 (Mac)**：
> 在项目根目录创建 `start-jatlas.command` 脚本，写入 `cd $(dirname "$0") && npm run dev` 并赋予执行权限 (`chmod +x`)，实现双击一键拉起控制台。