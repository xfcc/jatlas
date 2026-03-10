# JATLAS (Jav Actress Tier Ledger & Asset System)

**一个为重度成人影片收藏爱好者打造的私人数字资产管理系统。**

<div align="center">
  <h3>
    <a href="#-项目介绍-introduction">📖 项目介绍</a>
    <span> | </span>
    <a href="#-本地部署-deployment">🚀 本地部署</a>
  </h3>
</div>

---

<h2 id="-项目介绍-introduction">📖 项目介绍 (Introduction)</h2>

JATLAS 旨在解决大规模本地视频收藏所面临的管理难题。如果您是拥有数千部影片的“仓鼠党”，并对传统文件夹管理方式感到力不从心，那么 JATLAS 将是您的理想解决方案。

### 核心痛点 (The Problem)

随着收藏规模的扩大，您可能会遇到以下问题：

*   **存储失控 (Storage Overload)**：无限制的下载最终导致宝贵的存储空间被低价值资产占满。
*   **记忆混乱 (Memory Chaos)**：难以精确记住每位演员的评级、类别和存放位置，导致资产分散和管理混乱。
*   **信息延迟 (Information Lag)**：演员状态（如引退）的更新不及时，使得原有的管理策略变得过时且效率低下。

### 解决方案 (The Solution)

**JATLAS 用“规则引擎”与“自动化”来取代“人肉记忆”，对您的收藏进行现代化管理。** 它通过自动化的数据同步与可视化的风控大盘，帮助您实现对海量影视资产的高效、实时、自动化的调仓和管理。

### 核心特性 (Core Features)

#### 1. 全局风控大盘与行动引擎 (Dashboard & Actionable Insights)
摒弃毫无意义的“死报表”，将数据升维为“待办指令”。
* **生态透视**：实时监控各梯队（Tier）的人数与资产占比，防范评级体系通胀。
* **红线阻断**：系统自动揪出“突破物理限额”的爆仓资产与“刮削停滞”的陈旧资产，将静态大盘转化为精准的“断舍离”执行清单。

![Dashboard 预览](./public/dashboard.png)
*(图：JATLAS v1.2 全局风控大盘)*

#### 2. Emby 零摩擦自动对账 (Emby Sync Engine)
彻底废弃人工手动录入影片数量的低效模式。
深度集成局域网 Emby RESTful API，基于底层唯一 `PersonId` 实现两段式精准抓取。一键将刮削器中的真实 `TotalRecordCount` 覆写回大盘，实现逻辑看板与物理硬盘的 100% 毫秒级同步。

#### 3. 动态水位与乐观流转 (Dynamic Quota & Optimistic UI)
* **视觉风控**：为每个分类设定“建议保存数量”，系统自动对冲实际库存。通过 🟢 安全、🟡 警告、🔴 危险 的全局 Design Tokens 实现强视觉阻断。
* **零延迟体验**：全面接入 Next.js Server Actions 与 `useOptimistic`。在调整配额的瞬间，前端 UI 与进度条实现 **0.1 秒无延迟突变**，后台静默完成同步。

![控制台列表预览](./public/actress.png)
*(图：JATLAS 资产控制台与动态水位线)*

#### 4. 极致冷峻的工程美学 (Engineering Elegance)
全站采用纯粹的 Next.js 同构架构，摒弃异构拼接。前端控制台采用冷灰 (Zinc) 极简风格，剥离一切干扰信息的 UI 元素。数据库层引入 **事件溯源 (Event-Sourcing)** 架构，通过 `AssetLog` 独立防篡改日志表，精准记录资产时间轴上的每一笔增删流水。

### 技术底座 (Tech Stack)

JATLAS 采用现代化的单体架构（Monolith），兼顾了极高的研发效能与极致的代码可读性：

* **核心框架**: React 18 + Next.js 14 (App Router 模式)。
* **数据流转**: Next.js Server Actions + `useOptimistic` Hook。
* **持久化层**: PostgreSQL (全面抛弃本地 SQLite 妥协，实现开发/生产环境绝对对齐) + Prisma ORM。
* **底层基建**: 具备防篡改特性的 Event-Sourcing 日志聚合架构。
* **视觉工程**: Tailwind CSS 3 + shadcn/ui + Zinc 暗黑系设计规范。

### 演进路线图 (Roadmap)

* **v1.0: 核心风控与底座重构 (Done)**
    * 完成基础 CRUD 与动态颜色水位线。
    * 落地 Optimistic UI，实现零延迟操作体验。
* **v1.1: Emby 实时对账引擎 (Done)**
    * 接入 Emby API，打通局域网自动化抓取链路。
    * 支持多 ID 绑定防范元数据分裂。
* **v1.2: 资产风控大盘与事件溯源 (Done)**
    * 重构底层写入逻辑，实装 `AssetLog` 日志体系。
    * 上线 Dashboard，实现 M1基本面、M2待办引擎、M3生态分布的可视化指引。
* **v1.3: 自动化物理编排 (Next)**
    * 接入局域网 NAS API，实时监控具体物理硬盘剩余空间。
    * 基于规则自动生成指向物理视频文件的“软链接 (Symlink)”，消除海量文件搬运的 I/O 损耗。
* **v2.0: 审美变迁雷达 (Future)**
    * 基于时间序列与日志流水，分析资产增量斜率。系统自动预警低优先级资产的异常增量，提前预判审美倾向转移。

<br>

---

<h2 id="-本地部署-deployment">🚀 本地部署 (Deployment)</h2>

JATLAS 被设计为一款绝对私有、物理隔离的 Desktop-Class Web App。请按照以下步骤在本地构建你的控制台。

### 0. 前置基建 (Prerequisites)
* **Node.js** (v18.17 或更高版本)
* **PostgreSQL** (Mac 用户推荐使用 Postgres.app 并在偏好设置中开启静默自启)
* **Emby Server** (用于自动化对账引擎，需在局域网内可达)

### 1. 克隆与依赖装载
```bash
git clone https://github.com/xfcc/JATLAS.git
cd JATLAS
npm install
```

### 2. 环境变量与密钥灌入

复制环境模板并准备配置你的私有网络参数：

```bash
cp .env.example .env
```

打开 `.env` 文件，必须配置以下核心变量：

```env
# [核心] 数据库连接 (指向你本地的 Postgres 实例)
DATABASE_URL="postgresql://你的用户名:密码@localhost:5432/jatlas?schema=public"

# [可选] Emby 对账引擎配置 (若不填，系统将平滑降级为纯手动记账模式)
EMBY_SERVER_URL="http://192.168.x.x:8096" # 仅需根地址，末尾严禁带斜杠
EMBY_API_KEY="你的_EMBY_后台生成的_API_KEY"
```

### 3. 数据底座构建 (Schema Migration)

将 Prisma 数据骨架与底层事件溯源日志推送到你的本地数据库：

```bash
npx prisma migrate dev --name init
```

### 4. 引擎点火 (Ignition)

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`。你的风控中枢已上线。

> **💡 极客建议 (Mac 用户)**：
> 厌倦了每次打开终端敲命令？在项目根目录创建一个 `start-jatlas.command` 脚本，写入 `cd $(dirname "$0") && npm run dev` 并赋予执行权限 (`chmod +x`)。以后双击该文件即可一键拉起控制台。
