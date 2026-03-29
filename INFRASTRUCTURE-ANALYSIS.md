# Infrastructure Analysis: RustFS, Apalis, and Vite+

Analysis of three proposed changes for `better-tanstart-template-clean`.
Each section covers what the technology is, how it compares to what we currently use,
the effort required to switch, and a concrete recommendation.

---

## 1. MinIO → RustFS

### What Is RustFS?

RustFS is an S3-compatible object storage server written in Rust, designed as a direct
MinIO alternative. It exposes the same S3 API on the same default ports (9000 for API,
9001 for console), uses the same bucket/object model, and ships as a Docker image.

**GitHub:** https://github.com/rustfs/rustfs
**Current version:** v1.0.0-alpha.90 (March 2025)
**License:** Apache 2.0 (important — see below)
**Docker image:** `rustfs/rustfs:latest`

### How It Compares to MinIO

| | MinIO | RustFS |
|---|---|---|
| Language | Go | Rust |
| License | **AGPL v3** | **Apache 2.0** |
| S3 API compatibility | Full | Full (drop-in) |
| Default ports | 9000 / 9001 | 9000 / 9001 |
| Web console | Yes | Yes |
| Maturity | Production / battle-tested | **Alpha** |
| Performance claim | Baseline | ~2.3x faster on 4KB objects |
| OpenTelemetry | Yes | Yes (`RUSTFS_OBS_ENDPOINT`) |
| Distributed mode | Yes (stable) | Under testing |
| No telemetry | Optional | Default |

**The license difference is significant.** MinIO uses AGPL v3, which requires any
service that uses MinIO and exposes it over a network to open-source its own code — or
buy a commercial license. RustFS uses Apache 2.0, which has no such requirement. For a
template that users will build commercial products on, this is a meaningful improvement.

### Migration Effort

**Very low.** Because RustFS is a drop-in S3-compatible replacement:

1. **Docker Compose** — swap `image: minio/minio:latest` for `image: rustfs/rustfs:latest`,
   rename env vars (`MINIO_ROOT_USER` → `RUSTFS_ACCESS_KEY`, `MINIO_ROOT_PASSWORD` →
   `RUSTFS_SECRET_KEY`), and change the `command` to RustFS's startup args.

2. **`minio-storage.ts`** — the current code uses the `minio` npm package. Since RustFS
   is S3-compatible, we can replace the `minio` client with `@aws-sdk/client-s3`, which
   is the standard S3 client and works with any S3-compatible server. The interface
   (`IStorageWithFileAccess`) stays identical — only the client internals change.

3. **No changes** needed to application logic, routes, or environment variable references
   beyond the rename — `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `S3_BUCKET` are
   generic S3 names we'd adopt.

### Files That Would Change

```
docker-compose.yml          → replace minio service block
src/lib/storage/minio-storage.ts  → rename to s3-storage.ts, swap minio client for aws-sdk
src/lib/storage/config.ts   → update provider name ("minio" → "s3")
src/lib/storage/client.ts   → update switch case
src/env/server.ts           → rename MINIO_* env vars to RUSTFS_* / S3_*
.env.example                → update env var names
```

### Recommendation: **YES — but with timing caveat**

Switch to RustFS. The Apache 2.0 license is a genuine benefit for a starter template,
and the S3 API is fully compatible so migration risk is low.

**Caveat:** RustFS is currently alpha (`v1.0.0-alpha.90`). Distributed mode and lifecycle
management are still under testing. For a single-node local/dev setup (which is what
this template uses), alpha status is acceptable. For production deployments, users should
be aware of the maturity gap vs MinIO.

**Timing:** Switch now in the template (dev/Docker use case), but document in the README
that production deployments should evaluate MinIO or AWS S3 for stable alternatives.

---

## 2. Inngest → Apalis

### What Is Apalis?

Apalis is a background job and workflow processing library written in **Rust**. It
supports Redis, PostgreSQL, SQLite, MySQL, and AMQP backends. It has a web UI
(`apalis-board`) for monitoring workers and tasks.

**GitHub:** https://github.com/geofmureithi/apalis
**Current version:** v1.0.0-rc.7 (March 2025)
**Language:** Rust only
**Node.js SDK:** Does not exist

### The Fundamental Problem

**Apalis is a Rust library. It cannot be used from Node.js or TypeScript.**

There is no HTTP API, no REST endpoint, no SDK. To use Apalis from a Node.js app, you
would need to:

1. Write a separate Rust microservice that wraps Apalis with an HTTP layer
2. Have the Node.js app call that Rust service via HTTP to enqueue jobs
3. The Rust service handles all job execution

This is not a simple switch — it would mean introducing a Rust microservice into the
stack, rewriting all job functions (currently TypeScript with full access to Drizzle,
Prisma-style queries, TypeScript types) in Rust, and maintaining a cross-language
service boundary.

### What Inngest Gives Us vs What Apalis Could Give Us

| Feature | Inngest | Apalis |
|---|---|---|
| Language | TypeScript-native | Rust only |
| Step functions / workflows | Yes (first class) | Yes (apalis-workflow) |
| Retry logic | Yes (declarative) | Yes (configurable) |
| Dev UI | Inngest Dev Server (excellent) | apalis-board (basic web UI) |
| Scheduling / cron | Yes | Yes (apalis-cron) |
| Event-driven triggers | Yes | Yes (via backend queues) |
| Node.js integration | Native SDK | None — would need HTTP bridge |
| Current job functions | Pure TypeScript | Would require full Rust rewrite |
| Access to Drizzle/DB | Direct | Would need separate DB connection |

### Current Inngest Usage in This Project

The project currently has these Inngest functions:
- `fileUploadedFunction` — image processing (sharp), generates variants/thumbnails
- `userAvatarUploadedFunction` — avatar resizing
- `userSignedUpFunction` — welcome email + analytics
- `userEmailVerifiedFunction` — email notification
- `billingCustomerCreated`, `subscriptionCreated/Updated/Canceled`, `creditsPurchased`
  (16+ billing events across Stripe and Polar plugins)

These functions are deeply TypeScript — they use Drizzle for DB writes, import `sharp`
for image processing, call email sending functions, and access billing service logic.
Rewriting all of this in Rust would be a major undertaking with no material user benefit.

### Monitoring Comparison

Inngest Dev Server provides:
- Real-time function execution logs with full event/step/payload inspection
- Replay failed events
- Visual workflow traces showing each step
- Automatic retry visibility

Apalis Board provides:
- Worker status
- Queue depth metrics
- Basic task management

Inngest's monitoring is significantly better for a developer experience standpoint,
especially for debugging billing and file processing workflows.

### Recommendation: **NO — do not switch to Apalis**

Apalis is the wrong tool for this stack. It is a Rust library for Rust services. Using
it from Node.js would require:
- A new Rust microservice (separate codebase, separate language expertise)
- HTTP bridge between Node.js and Rust
- Rewriting all job functions in Rust (TypeScript → Rust)
- Losing direct DB access, TypeScript types, and the excellent Inngest Dev Server

The efficiency and monitoring gains from Apalis do **not** justify this cost.

**Better alternatives if Inngest becomes a bottleneck:**

| Alternative | Why | Node.js |
|---|---|---|
| **BullMQ** (Redis) | Battle-tested, Redis-backed, great UI via Bull Board | Yes |
| **Trigger.dev** | Inngest competitor, TypeScript-native, better self-hosting | Yes |
| **pg-boss** (Postgres) | Pure Postgres queue, no Redis needed, simple | Yes |
| **Hatchet** | Workflow engine, durable execution, TypeScript SDK, DAGs | Yes |

If the goal is better self-hosting or monitoring, **Trigger.dev** is the most direct
Inngest replacement. It is TypeScript-native, has a self-hosted option, and provides
comparable step-function/workflow capabilities.

---

## 3. Vite → Vite+

### What Is Vite+?

Vite+ (`voidzero-dev/vite-plus`) is **not** a drop-in Vite replacement. It is a unified
development toolchain CLI built by VoidZero (the company behind Rolldown — Vite's future
Rust-based bundler). It bundles together:

- **Vite** v8.0.3 — dev server and builds
- **Vitest** — testing
- **Oxlint** — linting (Rust-based, replaces ESLint)
- **Oxfmt** — formatting (replaces Prettier)
- **Rolldown** v1.0.0-rc.12 — Rust-based bundler (Vite's future production bundler)
- **Tsdown** — TypeScript library bundling
- **Vite Task** — monorepo task runner with caching

**GitHub:** https://github.com/voidzero-dev/vite-plus
**Current version:** v0.1.14 (March 2025)
**Status:** Pre-release alpha
**Node requirement:** ≥22.18.0

### Current Vite Setup

```ts
// vite.config.ts — current plugins
devtools()          // TanStack Devtools
nitro()             // TanStack Start server (Nitro)
viteTsConfigPaths() // Path aliases
tailwindcss()       // CSS
tanstackStart()     // SSR framework plugin
viteReact()         // React + React Compiler (Babel)
```

This setup is tightly coupled to **TanStack Start's Vite plugin** (`tanstackStart()`),
**Nitro** (`nitro()`), and **React Compiler** (`babel-plugin-react-compiler`). These are
non-standard plugins that must integrate with Vite's plugin API.

### Compatibility Analysis

**Would Vite+ work with this project?**

| Plugin | Status with Vite+ |
|---|---|
| `@tanstack/react-start/plugin/vite` | **Unknown** — depends on Vite v8 compatibility |
| `nitro/vite` | **Unknown** — Nitro is maintained independently |
| `@tailwindcss/vite` | Compatible (standard Vite plugin) |
| `vite-tsconfig-paths` | Compatible (standard Vite plugin) |
| `@vitejs/plugin-react` | Compatible (official Vite plugin) |
| `babel-plugin-react-compiler` | Compatible (Babel transform) |
| `@tanstack/devtools-vite` | Compatible (standard Vite plugin) |

The two risky plugins are `tanstackStart()` and `nitro()`. Both are framework-specific
Vite plugins that hook deeply into Vite's build pipeline. Vite+ is a CLI wrapper around
Vite — it does not change Vite's plugin API — so compatibility is likely but untested.

**The bigger concern: Vite+ replaces ESLint with Oxlint and Prettier with Oxfmt.**

The project currently uses Biome (`biome.json` is present in the repo). Switching to
Vite+ would pull in a second linting/formatting tool set. This creates a conflict:
Biome vs Oxlint+Oxfmt — two competing code quality toolchains for the same codebase.

**Node.js version requirement** is also a problem:
- Vite+ requires Node.js ≥ 22.18.0
- Current Docker config may not pin this version
- TanStack Start RC may support Node.js 20 LTS

### What We Would Actually Get

If Vite+ worked correctly:

- `vp dev` instead of `vite dev` — marginal CLI consolidation
- Rolldown as the production bundler — potentially faster builds (Rolldown is Rust-based)
- `vp check` for unified lint/format/type checking — replaces separate commands

But against the current setup:
- **Build speed** is not the bottleneck today (Vite HMR is already fast)
- **Rolldown** is still RC and has known compatibility gaps with some plugins
- **Oxlint** duplicates Biome which is already configured
- **No TanStack Start support verified** for the `vp dev` / `vp build` commands

### Recommendation: **NO — not yet**

Vite+ is a pre-release alpha (`v0.1.14`) built on Rolldown RC. It is not production
ready. More importantly, it has not been tested with TanStack Start's Vite plugin or
Nitro — the two most critical framework integrations in this project.

**The right time to revisit this is when:**
1. Rolldown reaches v1.0 stable
2. Vite+ reaches v1.0
3. TanStack Start explicitly lists Vite+ compatibility

**What we can do now instead:**
- The project already has `biome.json` for linting/formatting — this is the Oxlint
  equivalent. It is already faster than ESLint.
- Vite 6→7 upgrade (Vite 7 is already in `package.json` as `vite 7.3.1`) gives us the
  latest performance improvements without the risk.

---

## Summary & Decisions

| Change | Recommendation | Effort | Timing |
|---|---|---|---|
| **MinIO → RustFS** | **YES** | Low (Docker + 6 files) | Now — Apache 2.0 license benefit outweighs alpha risk for dev/template use |
| **Inngest → Apalis** | **NO** | Prohibitive (requires Rust rewrite) | Re-evaluate with Trigger.dev or Hatchet instead if Inngest becomes a pain point |
| **Vite → Vite+** | **NO** | Medium but high risk | Re-evaluate at Vite+ v1.0 + Rolldown v1.0 stable |

### Apalis Alternative Path

If the underlying goal with Apalis was better **self-hosted monitoring** and **reduced
cloud dependency**, the right Inngest alternative in this stack is:

**Trigger.dev v3** — TypeScript-native, self-hostable via Docker, step functions,
real-time monitoring dashboard, Postgres-backed, no Rust required. Migration effort
from Inngest is ~1 week (API is similar, main work is changing function definitions).

This would be worth a separate analysis document when ready to evaluate.
