# JATLAS Desktop Client Refactor Roadmap

## Document Purpose

This roadmap tracks the **desktop-first** JATLAS client (Electron + SQLite + Prisma). The legacy Next.js web app has been removed from the repo; remaining work is packaging polish, QA, and release process.

Use this document as the single execution checklist during implementation.

## Target Architecture

- Shell: Electron
- Runtime: Node.js (main process + controlled preload bridge)
- UI: React renderer (Vite) inside Electron
- Data: Prisma + SQLite (default local mode)
- Integrations: Emby API + local/network storage path scanning
- Security baseline: `contextIsolation: true`, `nodeIntegration: false`, IPC-only privileged access

---

## Global Principles (Must Follow)

- Migrate in phases; do not run big-bang rewrites.
- Keep business logic independent from framework-specific entry points.
- Keep desktop privileged logic out of renderer.
- Preserve existing user workflows before optimization.
- Require acceptance criteria before moving to next phase.

---

## Milestones Overview

- M1: Business/core logic in framework-neutral `src/core`
- M2: Electron skeleton running with secure IPC
- M3: SQLite + first-run setup + migration tooling available
- M4: Core feature flows migrated and internally usable
- M5: Cross-platform packaging and release readiness

---

## Phase 0 - Scope Freeze and Delivery Baseline (1-2 days)

Status: **Frozen in implementation** (v1 scope matches shipped desktop)

### Objectives

- Freeze MVP scope for desktop v1.
- Define release quality gates.
- Confirm platform targets and release format.

### Tasks

- [x] Define MVP feature list:
  - [x] Login/auth baseline
  - [x] Actress/Tier CRUD
  - [x] Dashboard
  - [x] Emby sync (tier bulk + multi-select bulk)
  - [x] Storage path scan
  - [x] Storage **batch import** from folder names vs DB (implemented in desktop storage tab)
- [x] Confirm platform strategy:
  - [x] macOS: DMG + ZIP via `electron-builder`
  - [x] Windows: NSIS + portable via `electron-builder`
- [x] Decide data strategy:
  - [x] SQLite as default (desktop first-run + `DATABASE_URL`)
  - [x] PostgreSQL: **no** in desktop runtime; **migration script only** for one-off PG → SQLite
- [x] Define MVP acceptance gates:
  - [x] Installation / first-run documented (`README.md`, Phase 3 runbook)
  - [x] Core workflows: manual regression checklist (Phase 4)

### Exit Criteria

- Scope and acceptance gates documented and approved.

---

## Phase 1 - Core Layer Decoupling (5-7 days)

Status: Completed (implemented)

### Objectives

- Isolate reusable domain services from Next.js runtime specifics.
- Build a framework-neutral core callable from Node.

### Tasks

- [x] Create a dedicated core module (for services/use-cases):
  - [x] Dashboard domain service
  - [x] Actress service
  - [x] Tier service
  - [x] Emby sync service
  - [x] Storage scan/import service
- [x] Remove direct dependencies on:
  - [x] Next.js Server Actions in domain logic
  - [x] App Router route handlers in domain logic
- [x] Introduce explicit service interfaces and DTOs.
- [x] Add unit tests for migrated core services.
- [x] ~~Keep old web flow functional during extraction.~~ **Superseded:** Next.js UI removed; core remains in `src/core` for Node/tests/scripts.

### Exit Criteria

- Core services run in pure Node environment with passing tests.
- Domain logic consumable from Electron main and CLI/scripts (no Next dependency).

---

## Phase 2 - Desktop App Skeleton (3-5 days)

Status: Completed (implemented)

### Objectives

- Build secure Electron foundation with clean process boundaries.
- Validate first end-to-end IPC call.

### Tasks

- [x] Create desktop app structure:
  - [x] Main process
  - [x] Preload bridge
  - [x] Renderer app
- [x] Configure security:
  - [x] `contextIsolation: true`
  - [x] `nodeIntegration: false`
  - [x] Block untrusted remote content
- [x] Implement typed IPC contract:
  - [x] `renderer -> preload -> main -> core`
- [x] Build one vertical slice:
  - [x] UI button triggers one core service and renders response
- [x] Add basic app logging and error boundary.

### Exit Criteria

- Desktop shell launches on macOS and Windows dev environments.
- One functional secure IPC workflow validated.

---

## Phase 3 - Data Layer Migration and First-Run Setup (5-7 days)

Status: Completed (implemented)

### Objectives

- Move from external Postgres-first setup to desktop-local DB flow.
- Provide user-friendly configuration bootstrap.

### Tasks

- [x] Update Prisma datasource strategy for SQLite default mode.
- [x] Implement first-run setup wizard:
  - [x] Local DB path setup
  - [x] Optional Emby config
  - [x] Initial admin credential setup
- [x] Define startup lifecycle:
  - [x] Config check
  - [x] Schema/migration check
  - [x] App ready state
- [x] Add migration utility:
  - [x] PostgreSQL export path
  - [x] Import into SQLite
  - [x] Dry-run validation + rollback notes
- [x] Add backup/restore command or UI entry.

### Exit Criteria

- Fresh install can bootstrap without manual `.env` editing.
- Existing web data can be migrated to local SQLite with validation.

### Phase 3 Runbook (Implemented)

- SQLite bootstrap (desktop first-run):
  - Save config in desktop setup UI
  - App runs `prisma db push` automatically
- PostgreSQL -> SQLite migration script:
  - `SOURCE_DATABASE_URL=postgresql://... DATABASE_URL=file:./jatlas.db npm run migrate:pg-to-sqlite`
- Dry-run recommendation:
  - First run with a copied PostgreSQL database and `DATABASE_URL=file:./jatlas-dryrun.db`
  - Validate row counts for `Tier`, `Actress`, `AssetLog`
- Rollback:
  - Keep original PostgreSQL untouched
  - Keep generated `.sqlite` backups under `backups/`

---

## Phase 4 - Feature Porting (7-14 days)

Status: **Completed** for desktop MVP

**Repo hygiene:** The legacy Next.js stack has been **removed**. Shipping surface: `apps/desktop/`; shared logic: `src/core`, `src/lib`.

### Objectives

- Port all MVP business flows to desktop renderer + IPC services.
- ~~Maintain behavior parity with current web product.~~ **Superseded:** web removed; parity target is **prior web MVP** where still relevant.

### Migration Order (Strict)

1. Auth/session baseline
2. Actress/Tier CRUD
3. Dashboard + 6-month asset chart
4. Emby sync + progress (`GET_SYNC_TASK`); **Cancel** (`CANCEL_SYNC_TASK`); **Retry failed** after tier sync (re-runs movie-count sync for `events` with `result: error`)
5. Storage path scan (`SCAN_STORAGE`); SMB / AFP hints + Windows path normalize in `apps/desktop/core/storagePath.ts`. **Folder → batch actress import:** implemented via `BATCH_IMPORT_STORAGE_FOLDERS`.

### Tasks

- [x] IPC-backed MVP workspace (auth, CRUD, dashboard, sync, storage scan).
- [x] Async task model (poll-based):
  - [x] Lifecycle + progress + summary JSON
  - [x] **Cancellation** between actress iterations (cooperative; not mid–HTTP request)
  - [x] **Retry** for tier-sync failures via UI (movie-count sync for errored IDs)
- [x] **Optimistic UI** for CRUD (create/update/delete on actress + tier with rollback on failure)
- [x] Regression checklist (manual — see below)

### Regression checklist (run before tagging a release)

- [ ] First run: save config, DB init succeeds, login (with/without `ADMIN_PASSWORD`)
- [ ] Tiers: create / edit / delete; tier list actress counts
- [ ] Actresses: create / edit / delete; search; multi-select Emby ID + movie count sync; cancel mid-run
- [ ] Tiers: tier video sync; cancel; retry failed when Emby errors present
- [ ] Dashboard: stats + chart load
- [ ] Storage: scan resolves path; lists folders (mounted NAS / local)
- [ ] `Open app data folder` opens userData; `jatlas-main.log` written on uncaught errors

### Exit Criteria

- All **non-deferred** MVP flows usable in desktop app.

---

## Phase 5 - Cross-Platform Hardening and Packaging (5-7 days)

Status: **Baseline done** — signing, notarization, and real Windows QA remain

### Objectives

- Ensure production readiness across macOS and Windows.
- Produce signed installers and release artifacts.

### Tasks

- [x] Path compatibility (baseline):
  - [x] `path.normalize` / `path.win32` for local paths; strip quotes
  - [x] `afp://` → `/Volumes/...` (macOS); `smb://` → UNC on Windows, `/Volumes/host/...` on macOS
  - [ ] Exhaustive encoding edge cases (post-v1 as issues appear)
- [x] Build packaging pipeline:
  - [x] `npm run desktop:pack` → `electron-builder` (mac: dmg+zip, win: nsis+portable in config)
  - [ ] **Code signing** (Apple Developer ID, Windows cert) — **optional for local self-use**, required for external distribution
  - [ ] **Apple notarization** for Gatekeeper — **optional for local self-use**, required for smooth external distribution
- [x] Diagnostics:
  - [x] Main-process `jatlas-main.log` in userData (uncaughtException / unhandledRejection)
  - [x] IPC **Open app data folder** (logged-in session)
- [ ] Release channels (internal/stable) — process only
- [ ] Auto-update (`electron-updater` or equivalent) — **post-v1** unless prioritized

### Exit Criteria

- Installers generated and validated on both target OS.
- App passes smoke tests on clean machines.

**Current gap:** DMG/ZIP/portable/NSIS **build** works; **distribution-ready** builds need signing + notarization + Windows hardware smoke tests.

---

## Phase 6 - QA, Pilot, and Launch (3-5 days)

Status: **In progress** — automation optional; pilot = manual

### Objectives

- De-risk release through targeted E2E verification and pilot rollout.

### Tasks

- [x] Define critical-path coverage (manual E2E = Phase 4 regression checklist; automated Playwright-Electron **not** wired — add later if needed)
- [ ] Execute pilot with real-world data samples.
- [ ] Fix top crash/data-consistency issues from pilot feedback.
- [ ] Finalize release checklist and publish v1 desktop.

### Exit Criteria

- Pilot pass rate meets predefined threshold.
- No critical crash/data-loss blockers remain.

---

## Risk Register and Mitigations

- IPC boundary sprawl
  - Mitigation: strict typed contract, no direct DB access from renderer.
- Main-process blocking on long jobs
  - Mitigation: worker/task queue for heavy sync/scan operations.
- Migration failures with production-like data
  - Mitigation: dry-run, backups, verification reports.
- Windows path behavior mismatch
  - Mitigation: validate on real Windows early (not only simulated dev checks).

---

## Suggested Weekly Cadence

- Week 1: Phase 0 + Phase 1
- Week 2: Phase 2 + start Phase 3
- Week 3: finish Phase 3 + start Phase 4
- Week 4: continue Phase 4
- Week 5: Phase 5
- Week 6: Phase 6 + release

Adjust this timeline based on team size and test automation maturity.

---

## Execution Checklist (Quick View)

- [x] M1 complete (core decoupled)
- [x] M2 complete (desktop shell + IPC)
- [x] M3 complete (SQLite + setup + migration)
- [x] M4 complete (desktop MVP with storage batch import + optimistic CRUD)
- [x] M5 baseline (electron-builder + path/diagnostics); **pending:** signing, notarization, Windows QA
- [ ] Launch review complete (pilot + signed release + checklist)

---

## Change Control

When scope changes, update this document first:

- Add new requirements under the relevant phase.
- Update acceptance criteria and milestone impact.
- Record deferred items explicitly as post-v1 backlog.

This prevents sequence drift and keeps implementation incremental and controllable.
