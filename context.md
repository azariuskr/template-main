# CMS Refactor Context

Last Updated: 2026-02-21

## Status

All CMS refactor phases (0-8) are **complete and committed**. The platform is now in
CMS Admin UX overhaul + Storefront CMS integration phase.

## What Was Built

### CMS Platform (Backend)
- DB-first CMS schema (profiles, sections, translations, versions, locales)
- Server functions: bootstrap, get/upsert sections, publish, rollback, versions, default locale, theme reset
- Redis caching for resolved sections + default locale
- Inngest events for publish/cleanup
- Locale fallback chain (e.g. bg-BG -> bg -> en)

### CMS Admin UI
- Admin CMS page with section browser, translation editor, version panel
- Locale switching (EN/BG) for editing
- Theme editor with color pickers, font dropdowns, TweakCN override
- Publish + rollback controls, version history

### Storefront Integration
- CMS-driven: hero, banner, newsletter, footer, nav/logo, theme/fonts
- Theme CSS variables mapped from CMS to storefront
- TweakCN CSS override support with font var mapping

### Architecture
- CMS hooks: `src/lib/cms/hooks/use-cms.ts` (paced mutations with throttle/queue/dedupe)
- CMS queries: `src/lib/cms/queries.ts` (query option factories + hooks)
- CMS actions: `src/hooks/cms-actions.ts` (mutation hooks)
- CMS constants: `src/components/admin/cms/cms-constants.ts`
- CMS server functions: `src/lib/cms/functions/content.ts`

## Key File Locations

- Worktree: `/home/krisadmin/projects/better-tanstart-template/.worktrees/feat-cms-core`
- CMS admin components: `src/components/admin/cms/`
- CMS lib: `src/lib/cms/` (functions, hooks, queries, store)
- Storefront layout: `src/routes/(storefront)/route.tsx`
- Storefront components: `src/components/storefront/`
- Storefront pages: `src/routes/(storefront)/store/`

## Active CMS Section Keys

Existing: `global.nav`, `global.footer`, `global.theme`, `home.hero`, `home.banner`, `home.newsletter`

New (for storefront integration): `shop.catalog`, `shop.productDetail`, `shop.search`,
`shop.cart`, `shop.checkout`, `shop.wishlist`, `about.hero`, `about.story`, `about.values`,
`about.cta`, `contact.page`, `support.faq`, `account.overview`, `account.orders`, `account.addresses`
