# JATLAS — Agent Handoff Brief

> 给下一个接手 agent 的快速上手文档。读完本文后再翻 `README.md` 与 `DESKTOP_REFACTOR_ROADMAP.md` 即可。

---

## 1. 项目是什么 / 为什么存在

**JATLAS** = *Jav Actress Tier Ledger & Asset System*。

它是一款**纯本地、个人使用**的桌面客户端，用来管理本地/NAS 上影视收藏的「分级 + 演员台账 + 资产计数」。三件核心事：

1. **Tier 分级 + Actress 台账**：把演员按 Tier 分级，每个 Tier 可设视频数量上限（用作风险/超额提醒）。
2. **与 Emby 联动**：通过 Emby HTTP API 自动绑定 `emby_id`、按 `PersonIds` 拉视频数量，落库到本地 Prisma SQLite。
3. **存储扫描 + 批量导入**：扫描本地路径或 SMB/AFP 挂载的 NAS 目录，把目录名（演员名）批量导入为 Tier 下的 Actress 记录。

附带一个 6 个月的资产入库/出库/收录扩张图表（基于 `AssetLog` 事件源）。

> 项目历史：早期是 Next.js + PostgreSQL Web 应用（`src/app/...` 一堆 server actions / route handlers）。现在已经**完整迁移到 Electron + SQLite 桌面客户端**，旧的 Next 页面/路由/components 全部从仓库删除（参见当前 git status 中大量 `D` 文件）。`src/core/services/*` 是上一轮"框架解耦"留下的 Node 纯逻辑，但桌面运行时已经不再走这里 —— 真正在跑的是 `apps/desktop/core/*` 下的桌面版（见第 3 节）。

---

## 2. 当前仓库状态（重要：未提交！）

`git status` 上有大量改动**还没有 commit**。这不是 dirty 的小修补，而是**整次大重构落到工作区但没 commit**。具体形态：

- **新增（untracked）**：
  - `apps/desktop/**`：Electron 壳 + preload + Vite/React renderer + 桌面专用 core 服务。
  - `src/core/services/*`、`src/core/tasks/*`、`src/core/utils/*`：框架无关的 Node 服务层（Phase 1 解耦产物）。
  - `src/__tests__/actress.service.test.ts`、`tier.service.test.ts`、`db.maintenance.test.ts`：迁移后的 Jest 单测。
  - `scripts/migrate-pg-to-sqlite.ts`：一次性 PG → SQLite 迁移脚本。
  - `DESKTOP_REFACTOR_ROADMAP.md`：六阶段路线图（M1–M5 已完成，M6 进行中）。
- **修改**：`README.md`、`package.json`、`prisma/schema.prisma`（已切到 SQLite）、`prisma/seed.ts`、`tsconfig.json`、`.eslintrc.json`、`.env.example`、`.gitignore`、`scripts/sync-emby-ids.ts`。
- **删除**：所有 Next.js 页面与组件 (`src/app/**`, `src/components/**`, `src/hooks/**`, `src/lib/actions.ts`, `src/middleware.ts`, `next.config.*`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `next-env.d.ts`)，以及若干旧测试 (`src/__tests__/actress.actions.test.ts` 等)。
- **保留的旧 Web 残留**（仍 tracked）：`src/lib/db.ts`, `src/lib/emby.ts`, `src/lib/storagePath.ts`, `src/lib/textNormalize.ts`, `src/lib/importStoragePathCache.ts`, `src/__tests__/emby.test.ts`, `src/__tests__/importStoragePathCache.test.ts`, `src/__tests__/textNormalize.test.ts`, `src/router/`（空目录）。这些被 `src/core/services/*` 和 `apps/desktop/core/*` 当作工具/兼容层使用，未来可清理。

> **第一个动作建议**：和用户确认是否要把这一大坨改动按主题拆分成几个 commit（比如：① 删 Next、② 加 src/core 解耦、③ 加 apps/desktop、④ 切 SQLite + 迁移脚本、⑤ 文档更新）。这会让历史可读，也方便回滚。

最近一次已 commit 的提交是 `3b765897 feat: import name NFC match, actress filters, storage path cache`（仍是 Next 时代）。

---

## 3. 架构（运行时只看这一节就够）

```
apps/desktop/
├── electron/
│   ├── main.ts          # Electron 主进程：BrowserWindow + 注册全部 ipcMain.handle
│   └── preload.ts       # contextBridge 暴露 window.desktopApi（按 IPC_CHANNELS 一一映射）
├── shared/
│   └── ipc.ts           # IPC_CHANNELS 常量 + IpcInvokeMap 类型契约（renderer/main 共享）
├── renderer/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── global.d.ts  # 声明 window.desktopApi
│       └── App.tsx      # 单文件 ~930 行的 SPA：tab=dashboard|tiers|actresses|storage
├── core/                # 桌面运行时的 Node 业务逻辑（注意：不是 src/core）
│   ├── prismaClient.ts          # 单例 PrismaClient
│   ├── configService.ts         # 读写 userData/desktop-config.json，写 process.env
│   ├── bootstrapService.ts      # 首次配置后 execFile('npx prisma db push')
│   ├── desktopProbeService.ts   # 健康快照
│   ├── desktopDataService.ts    # tiers/actresses/dashboard/assetLogChart/scanStorage/batchImport CRUD
│   ├── desktopTaskStore.ts      # 全局 Map<taskId, TaskState> + 取消标记（globalThis 单例）
│   ├── desktopTaskSyncService.ts# 三个长任务：syncEmbyIds / syncMovieCounts / tierVideoCountSync
│   ├── embyApi.ts               # fetchEmbyIdsByName / fetchActressCountFromEmby
│   ├── embyIdJsonDesktop.ts     # SQLite 下 emby_id 的 JSON string 编解码
│   ├── storagePath.ts           # smb://, afp:// → 平台路径；listChildDirectoryNames（NFC 规范）
│   └── textNormalize.ts
├── tsconfig.electron.json   # 编译 electron/ + shared/ + core/ 到 dist-electron/
└── vite.config.ts           # 编译 renderer/ 到 dist/renderer/
```

**进程边界**：`renderer ─ ipcRenderer.invoke ─→ preload ─→ ipcMain.handle ─→ apps/desktop/core/*`。
**安全基线**：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，外链用 `shell.openExternal`，禁止 in-page 跳转。
**鉴权**：内存里的 `isDesktopAuthenticated` 布尔；`LOGIN` channel 比对 `process.env.ADMIN_PASSWORD`；未配 `ADMIN_PASSWORD` 时直接放行（本地自用语义）。

**长任务模型（poll-based）**：
- `START_*` 立即返回 `{taskId}`，后台 `void (async () => {...})()` 执行。
- 状态写入 `desktopTasks: Map<taskId, TaskState>`（`desktopTaskStore.ts`，挂在 `globalThis`）。
- Renderer 每 450ms `getSyncTask(taskId)` 轮询，`status` 以 `completed`/`completed:cancelled`/`error:` 前缀终止。
- 取消是**协作式**：迭代到下一个 actress 之前检查 `cancelRequested`，**不会**打断进行中的 HTTP 请求。
- Tier 同步在 `summary` 里聚合 `success/skipped/error/netDelta/...`；UI 提供 "Retry failed"，把 `events` 里 `result==='error'` 的 `actressId` 重新跑一次 movie-count 同步。

**首次启动流程**：`GET_BOOTSTRAP_STATE` → 若没 `userData/desktop-config.json` 则 renderer 显示 setup 表单 → `SAVE_CONFIG_AND_INIT` 写文件 + 设 env + 跑 `prisma db push` → 进入登录页。

---

## 4. 数据模型（Prisma + SQLite）

`prisma/schema.prisma`（注意 provider 已是 `sqlite`）：

```prisma
model Tier { id Int @id @default(autoincrement()), name @unique, video_limit Int?, status @default("active"), actresses Actress[], created_at, updated_at }
model Actress { id, name @unique, tier@relation, tierId, video_count Int, emby_id String @default("[]"), created_at, updated_at }
model AssetLog { id, actress_id, actress_name, action_type ("CREATE"|"UPDATE"|"DELETE"), video_delta Int, created_at, updated_at }
```

**注意点**：
- `emby_id` 在 SQLite 下是 **JSON 字符串**（PG 时代是 `String[]`）。读写一律走 `normalizeEmbyIdList` / `toEmbyIdJson`（`apps/desktop/core/embyIdJsonDesktop.ts`）。`Actress.emby_id` 默认 `"[]"`。
- 所有改动 `video_count` 的路径都要写 `AssetLog`（仪表盘 6 月图表依赖）。
- `AssetLog` 没有外键约束，删除演员后日志保留（带 `actress_name` 历史快照）。

---

## 5. 关键命令 / 脚本

```bash
npm install                    # 含 postinstall: prisma generate
cp .env.example .env           # 桌面端运行其实读 userData 下的 desktop-config.json，这个 .env 给 scripts/tests 用
npx prisma db push             # 第一次手工初始化（桌面端首启会自动跑一次）

npm run dev                    # = npm run desktop:dev：tsc --watch electron + vite + electron 同时跑
npm run build                  # 编译 electron + 打包 renderer
npm start                      # electron dist-electron/electron/main.js
npm run desktop:pack           # build + electron-builder（mac: dmg+zip / win: portable+nsis）

npm test                       # jest（覆盖 src/__tests__/*.ts）
npm run lint                   # eslint src + scripts，max-warnings 0

npm run migrate:pg-to-sqlite   # 需要 SOURCE_DATABASE_URL=postgres://...  +  DATABASE_URL=file:./jatlas.db
```

> 当前 lint 配置：`apps/desktop/**` **不在** lint 目标里（看 `package.json` 的 `lint` 脚本只覆盖 `src scripts`）。要不要把桌面代码也纳入 lint 是后续可以做的事。

---

## 6. 路线图 / 当前进度（来源：`DESKTOP_REFACTOR_ROADMAP.md`）

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 范围冻结 / 平台策略 / 验收门 | 完成 |
| Phase 1 | 把领域逻辑解耦到 `src/core` | 完成 |
| Phase 2 | Electron 骨架 + 安全 IPC | 完成 |
| Phase 3 | SQLite 默认 + 首次配置向导 + PG→SQLite 迁移工具 | 完成 |
| Phase 4 | MVP 功能迁移：auth/CRUD/dashboard/Emby sync(+cancel/+retry)/storage scan + batch import + 乐观 UI | 完成 |
| Phase 5 | 跨平台打包 | **基线完成**，待办：① 代码签名（macOS Developer ID + Win 证书）② Apple notarization ③ 真机 Windows 烟测 |
| Phase 6 | QA / Pilot / 发布 | **进行中**，待办：① pilot 实测 ② 顶级问题修复 ③ 发版 checklist |

剩余工作清单还包括 roadmap 里 Phase 4 的**手工回归 checklist** 没 check 完，要在 tag release 前过一遍：首次配置 → 登录 → tier/actress CRUD → 多选 Emby ID 同步 + 取消 → tier 视频同步 + retry → dashboard → storage scan → log/userData 入口。

---

## 7. 你（下一个 agent）需要知道的"坑"

1. **两套 core 同时存在**：
   - `src/core/services/*` 是 Phase 1 框架解耦的产物，被单测和 `scripts/sync-emby-ids.ts` 使用，但**不是桌面运行时**。
   - `apps/desktop/core/*` 才是 Electron 主进程实际调用的。
   - 修业务逻辑要想清楚：① 只改桌面 → 改 `apps/desktop/core/*`；② 改 Node 通用 + 桌面 → 两边同步，长远建议把 `apps/desktop/core` 收编到 `src/core` 里、桌面只剩 IPC 适配层。

2. **`emby_id` 跨形态**：旧测试/脚本可能把它当 `string[]`，新的 SQLite 下是 JSON 字符串。修任何与之相关的代码先确认在哪一侧。

3. **任务状态在 `globalThis`**：`desktopTaskStore.ts` 有意挂全局 Map，热重载/dev 重启会丢任务。生产没问题，dev 时不要被这个吓到。

4. **取消不打断 HTTP**：UI 上 cancel 是"做完当前这个 actress 之后停"。不要在 PR 里写 "instant cancel"。

5. **`scripts/sync-emby-ids.ts` 还引用 `@/core/services/...`**：路径别名 `@/*` → `./src/*`（见 `tsconfig.json`）。如果要统一桌面/脚本，要小心别把这个路径打断。

6. **`asarUnpack`**：Prisma 的 `.prisma/client`（含 native query engine）必须解出 asar，已经在 `package.json` build 里配好了；动 electron-builder 配置时别误删。

7. **大量未提交改动**：开新工作前先和用户确认 commit 切分策略，否则任何 `git stash`/`reset` 都很危险。

---

## 8. 怎么快速验证你的修改

- 改业务逻辑：`npm test`（Jest 覆盖 `actress.service` / `tier.service` / `db.maintenance` / `emby` / `textNormalize` / `importStoragePathCache`）。
- 改 IPC contract：先在 `apps/desktop/shared/ipc.ts` 同步加 channel + 类型，然后 main + preload + renderer 三处一起改，`tsc -p apps/desktop/tsconfig.electron.json` 没报错就说明类型贯通。
- 端到端：`npm run dev` 起开发环境，按 roadmap 第 4 阶段那份手工 checklist 跑一遍。

---

## 9. 一句话总结给下一个 agent

> 这是一个本地自用的 Electron 桌面应用，用 Prisma + SQLite 存"演员分级台账"，调 Emby HTTP API 同步 ID 与影片数，能扫 NAS 目录批量建档。代码刚从 Next.js+Postgres 大重构成 Electron+SQLite，**重构改动还堆在工作区没 commit**；运行时入口是 `apps/desktop/`，业务逻辑在 `apps/desktop/core/`，IPC 契约在 `apps/desktop/shared/ipc.ts`。剩余工作是发布相关的签名/公证/Windows 真机 QA + 一份手工回归 checklist。
