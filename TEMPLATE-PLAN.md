# Template-Main: Clean Base Template Plan

## Vision

`template-main` is a domain-agnostic, production-ready full-stack starter built on
TanStack Start + React 19. It ships all the reusable infrastructure that any serious
web application needs — auth, admin shell, billing, CMS, storage, RBAC, job queue,
caching — with zero domain-specific business logic.

Any project (blog, SaaS, dashboard, marketplace) clones this and builds on top.

---

## Source

Derived from `azariuskr/better-tanstart-template` (full ecommerce build).
All ecommerce-specific code has been stripped; the modular architecture is preserved.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (SSR/RSC) |
| UI | React 19 + shadcn/ui + Tailwind CSS |
| Routing | TanStack Router (file-based) |
| Data fetching | TanStack Query |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (passkey, RBAC, sessions) |
| Billing | Stripe + Polar |
| Storage | MinIO (S3-compatible) |
| Cache | Redis |
| Job queue | Inngest |
| Email | Nodemailer |
| i18n | i18next |
| Animations | Framer Motion |
| SEO | Custom metadata system |
| Linting | Biome |
| Container | Docker Compose |

---

## What This Template Includes

### Infrastructure
- [x] PostgreSQL + Drizzle ORM with migrations
- [x] Redis caching layer
- [x] Inngest job queue (client + function registry)
- [x] MinIO/S3 storage with image processing
- [x] Docker Compose (web, postgres, redis, minio, inngest, pgadmin, redis_ui, traefik)
- [x] Environment variable validation (Zod, client + server)
- [x] Result pattern (Ok/Err) for safe error handling
- [x] Rate limiting
- [x] i18n infrastructure (i18next, ready for any namespace)

### Auth & Users
- [x] Better Auth full setup (email/password, OAuth, passkeys/WebAuthn)
- [x] Session management
- [x] RBAC (role-based access control) with permissions
- [x] Admin user management UI (list, invite, deactivate)
- [x] Account settings (avatar, profile, trusted devices)
- [x] Auth UI provider integration
- [x] Auth route guards

### Admin Shell
- [x] Responsive sidebar layout (collapsible, icon mode)
- [x] Breadcrumb navigation
- [x] Role-aware navigation builder (`buildNavigation`)
- [x] Organization switcher
- [x] Dark/light mode toggle
- [x] Reusable data-table primitives (sort, filter, pagination, bulk actions)
- [x] Shared base components (dialogs, drawers, confirm dialogs, action menus)

### CMS Module
- [x] Content blocks with versioning
- [x] Theme editor
- [x] Translation editor (per-locale, per-section)
- [x] Version history panel
- [x] CMS store (Zustand)
- [x] Inngest CMS jobs (publish, invalidate)

### Billing Module
- [x] Stripe integration (subscriptions, one-time payments)
- [x] Polar integration (indie billing)
- [x] Subscription plans config
- [x] Credit system
- [x] Admin billing views (subscriptions, customers, credits)
- [x] User billing views (plan card, payment methods, history)
- [x] Billing portal

### Storage Module
- [x] File manager UI
- [x] Multi-file upload with progress
- [x] Image processing & optimization (sharp)
- [x] Avatar upload
- [x] Storage admin view (browse, delete)
- [x] Storage API routes

### Frontend
- [x] Landing page scaffold (hero, features, navbar, footer)
- [x] Error pages (401, 403, 404, 500, 503)
- [x] SEO metadata system (per-route, structured data)
- [x] Framer Motion config + entrance animations
- [x] 35+ shadcn/ui components
- [x] Consent banner (GDPR-ready)
- [x] Legal routes (privacy, terms, cookies)
- [x] Image load queue (performance)

### Developer Experience
- [x] TanStack Query devtools
- [x] Biome for formatting/linting
- [x] TypeScript strict mode
- [x] Auto route tree generation (vite plugin)
- [x] Docker hot-reload dev setup
- [x] DB backup scripts (postgres → MinIO)

---

## What Was Removed (vs source)

| Removed | Reason |
|---------|--------|
| `src/lib/ecommerce/` (20 files) | Domain-specific |
| `src/components/admin/ecommerce/` (48 files) | Domain-specific |
| `src/components/storefront/` (4 files) | Domain-specific |
| `src/routes/(storefront)/` (16 files) | Domain-specific |
| Admin routes: products, orders, brands, categories, coupons, inventory, reviews, shipping, campaigns, finance (22 files) | Domain-specific |
| `src/routes/checkout/` | Domain-specific |
| `src/routes/api/products/` | Domain-specific |
| `src/hooks/ecommerce-actions.ts` | Domain-specific |
| `src/lib/db/schema/ecommerce.schema.ts` | Domain-specific |
| `src/lib/inngest/ecommerce*.ts` | Domain-specific |
| `src/lib/animations/storefront-animations.tsx` | Domain-specific |
| ecommerce i18n translations | Domain-specific |
| `scripts/populate-ecommerce-data.ts` | Domain-specific |

---

## Admin Dashboard

The admin dashboard (`/admin`) is a minimal clean placeholder showing:
- Registered users count
- Active sessions
- Storage usage
- Quick links to all installed modules

Domain-specific widgets (orders, revenue, etc.) are added per-project.

---

## Database Schema (Template Baseline)

| Schema File | Tables | Purpose |
|-------------|--------|---------|
| `auth.schema.ts` | user, session, account, verification | Better Auth (auto-generated) |
| `billing.schema.ts` | subscription, customer, invoice, creditTransaction | Stripe/Polar billing |
| `cms.schema.ts` | cmsContent, cmsVersion, translation | CMS module |

No domain-specific tables. Projects add their own schema files.

---

## Cleanup Checklist

### Phase 1 — File Deletions
- [ ] Delete `src/routes/(storefront)/`
- [ ] Delete `src/routes/(authenticated)/admin/products/`
- [ ] Delete `src/routes/(authenticated)/admin/orders/`
- [ ] Delete `src/routes/(authenticated)/admin/brands.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/categories.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/coupons.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/customers.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/inventory.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/reviews.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/shipping.tsx`
- [ ] Delete `src/routes/(authenticated)/admin/campaigns/`
- [ ] Delete `src/routes/(authenticated)/admin/finance/`
- [ ] Delete `src/routes/checkout/`
- [ ] Delete `src/routes/api/products/`
- [ ] Delete `src/components/admin/ecommerce/`
- [ ] Delete `src/components/storefront/`
- [ ] Delete `src/lib/ecommerce/`
- [ ] Delete `src/lib/inngest/ecommerce.ts`
- [ ] Delete `src/lib/inngest/ecommerce-events.ts`
- [ ] Delete `src/lib/db/schema/ecommerce.schema.ts`
- [ ] Delete `src/lib/animations/storefront-animations.tsx`
- [ ] Delete `src/hooks/ecommerce-actions.ts`
- [ ] Delete ecommerce i18n files (product, cart, checkout, catalog en+bg)
- [ ] Delete `scripts/populate-ecommerce-data.ts`
- [ ] Delete `src/styles/storefront.css`

### Phase 2 — Shared File Edits
- [ ] `src/constants.ts` — remove ecommerce ROUTES, QUERY_KEYS, MUTATION_KEYS
- [ ] `src/lib/navigation/navigation.ts` — remove ecommerce nav sections
- [ ] `src/lib/db/schema/index.ts` — remove ecommerce.schema export
- [ ] `src/lib/inngest/functions.ts` — remove ecommerceFunctions registration
- [ ] `src/i18n/index.ts` — remove ecommerce namespaces
- [ ] `src/i18n/types.ts` — remove ecommerce namespace types

### Phase 3 — Rewrite Dashboard
- [ ] `src/routes/(authenticated)/admin/index.tsx` — replace ecommerce stats with template-appropriate placeholder dashboard

### Phase 4 — DB Migration
- [ ] Remove ecommerce tables from migration (write clean initial migration)
- [ ] Verify `drizzle.config.ts` is clean

### Phase 5 — Package & Config
- [ ] Update `package.json` name to `template-main`
- [ ] Update env example file
- [ ] Verify TypeScript compilation passes
- [ ] Update README

### Phase 6 — Push & Clone
- [ ] Commit all changes
- [ ] Push to `azariuskr/template-main`
- [ ] Clone to `/home/krisadmin/projects/blog-cms`

---

## Usage: Starting a New Project

```bash
git clone git@github.com:azariuskr/template-main.git my-new-project
cd my-new-project
cp .env.example .env.local
# Edit .env.local with your config
pnpm install
pnpm db:migrate
docker-compose up -d
```

---

## Derived Projects

| Project | Repo | Status |
|---------|------|--------|
| blog-cms | azariuskr/blog-cms | planned |
