# Storefront Design & Implementation Plan

Last Updated: 2026-02-21

## Design Vision

**Mix two inspiration sources into a unified storefront:**
- **Layout & structure** from `~/projects/e-commerce-ui` (bold typography, modern layout, wave/blob shapes)
- **Pages, theme & components** from `~/projects/ecom-ui-inspiration` PartyPop theme (rose/pink, playful, rounded)
- **Admin portal** keeps its own separate theme (existing Shadcn/dark sidebar)
- Storefront and admin must be independently themeable

---

## Design System

### Color Palette (PartyPop-inspired, unified)
- **Primary**: Rose (#f43f5e) - buttons, CTAs, active states
- **Accent**: Warm orange (#fb923c) - badges, highlights
- **Background**: Warm off-white (#fdfbf7, #fef3ec)
- **Text**: Slate grays (slate-800 body, slate-600 muted)
- **Success**: Emerald green
- **Error**: Rose red
- **Surface**: White cards with soft shadows

### Typography
- **Headings**: Varela Round (rounded, friendly) or Fredoka
- **Body**: Quicksand (soft, approachable)
- **Fallback**: system sans-serif stack
- Load via Google Fonts in storefront layout only (not admin)

### Component Style
- Large rounded corners (rounded-2xl, rounded-3xl)
- Soft shadows, no hard borders
- Hover animations (scale, translate)
- Playful badges (Hot, New, Sale)
- Toast notifications for cart actions

---

## Architecture: Theme Separation

### Approach: Dual Layout System
```
src/routes/
  (authenticated)/admin/...   -> AdminLayout (existing Shadcn theme)
  (storefront)/...            -> StorefrontLayout (PartyPop theme)
```

### StorefrontLayout provides:
- Storefront nav (sticky, backdrop blur, logo, search, cart icon, user menu)
- Footer (minimal: logo, copyright, policy links)
- Cart drawer (slide-in sidebar)
- Toast container
- Font imports (Varela Round, Quicksand)
- Storefront-specific CSS variables / Tailwind theme extension

---

## Pages — Implementation Status

### Phase 1: Core Shopping Flow — COMPLETE
1. **Landing/Home** (`/store`) — DONE + CMS integration
2. **Product Catalog** (`/store/products`) — DONE
3. **Product Detail** (`/store/products/:slug`) — DONE
4. **Cart** (`/store/cart`) — DONE
5. **Checkout** (`/store/checkout`) — DONE
6. **Search** (`/store/search`) — DONE
7. **Wishlist** (`/store/wishlist`) — DONE

### Phase 2: Supporting Pages — COMPLETE
8. **About Us** (`/store/about`) — DONE
9. **FAQ / Shipping & Returns** (`/store/faq`) — DONE
10. **Contact** (`/store/contact`) — DONE

### Phase 3: Account Pages — COMPLETE
11. **Account Overview** (`/store/account`) — DONE
12. **Account Orders** (`/store/account/orders`) — DONE
13. **Account Addresses** (`/store/account/addresses`) — DONE

### Phase 4: CMS Integration — IN PROGRESS
All storefront pages need CMS integration so hardcoded text can be
managed from the admin CMS panel. Pattern:
```tsx
const { data: cmsData } = useQuery(cmsResolvedSectionQueryOptions("section.key", locale));
const title = pickString(cmsData?.ok ? cmsData.data?.translation?.title : undefined, "Fallback");
```

CMS section keys for each page are defined in `CMS_SECTION_KEYS` constant
in `src/components/admin/cms/cms-constants.ts`.

---

## Server Functions Already Available
All backend is built - storefront just needs UI:
- `$getProducts` - public product listing with filters
- `$getProduct` - single product detail
- `$getOrCreateCart` - get/create cart for user or guest
- `$addToCart` - add item to cart
- `$updateCartItem` - update quantity
- `$removeFromCart` - remove item
- `$applyCoupon` / `$removeCoupon` - coupon management
- `$createOrder` - create order from cart
- `$processPayment` - payment processing
- `$verifyPayment` - payment verification

---

## CMS Server Functions
- `$getResolvedCmsSection` - fetch published content with locale fallback
- `$adminUpsertCmsSectionTranslation` - save/update translation
- `$adminPublishCmsProfile` - create versioned snapshot
- `$adminBulkCreateCmsSections` - seed multiple sections at once
- See `AGENTS.md` for full CMS API reference

---

## Files Reference
- CMS shared utils: `src/lib/cms/utils.ts`
- CMS admin components: `src/components/admin/cms/`
- CMS server functions: `src/lib/cms/functions/content.ts`
- Storefront layout: `src/routes/(storefront)/route.tsx`
- Storefront components: `src/components/storefront/`

---

## CMS Future Improvements Roadmap

The current CMS is **data-first**: pick a section key, edit raw JSON, publish. The
long-term vision is a **visual-first** editor where admins interact with the actual
storefront and edit components in place, while keeping JSON editing as a power-user
fallback.

### Phase 5: Structured Field Editor (high value, no iframe)

Replace the raw JSON textarea with auto-generated form fields based on section schemas.

**Section Field Schemas** — A registry mapping each section key to its editable fields:
```ts
// src/lib/cms/section-schemas.ts
const SECTION_SCHEMAS: Record<string, FieldSchema[]> = {
  "home.hero": [
    { key: "ctaPrimary.label", label: "CTA Button Text", type: "text" },
    { key: "ctaPrimary.href", label: "CTA Link", type: "text" },
    { key: "backgroundImage", label: "Hero Image", type: "image" },
  ],
  "global.nav": [
    { key: "logoText", label: "Brand Name", type: "text" },
    { key: "logoIcon", label: "Logo Icon", type: "select", options: [...] },
    { key: "logoIconUrl", label: "Custom Logo URL", type: "image" },
    { key: "logoMode", label: "Logo Display", type: "select", options: ["icon","text","both"] },
    { key: "items", label: "Nav Links", type: "repeater", fields: [
      { key: "label", type: "text" }, { key: "href", type: "text" },
    ]},
  ],
};
```

**Field types**: `text`, `textarea`, `richtext`, `number`, `select`, `color`, `image`,
`repeater`, `toggle`

**Tasks:**
- [ ] Create `FieldSchema` type and `SECTION_SCHEMAS` registry in `src/lib/cms/section-schemas.ts`
- [ ] Build `<CmsFieldRenderer>` component that maps field types to form inputs
- [ ] Build `<CmsStructuredEditor>` that reads schema, renders fields, syncs to JSON state
- [ ] Add "Advanced: Edit JSON" toggle at the bottom (current editor becomes the fallback)
- [ ] Sections without a schema continue using the raw JSON editor automatically

### Phase 6: Page-Grouped Section Browser

Replace the flat alphabetical section list with a page-grouped tree view.

**Page-Section Map:**
```ts
const PAGE_SECTION_MAP = {
  "Home":    ["home.hero", "home.banner", "home.newsletter"],
  "Shop":    ["shop.catalog", "shop.productDetail", "shop.search", "shop.cart", "shop.checkout"],
  "About":   ["about.hero", "about.story", "about.values", "about.cta"],
  "Support": ["contact.page", "support.faq"],
  "Account": ["account.overview", "account.orders", "account.addresses"],
  "Global":  ["global.nav", "global.footer", "global.theme"],
};
```

**Tasks:**
- [ ] Add `PAGE_SECTION_MAP` to CMS constants
- [ ] Create `<CmsPageTree>` component — collapsible page groups with section items
- [ ] Replace `<CmsSectionBrowser>` in sidebar (or add as alternative view mode)
- [ ] Show per-page translation completeness badges (e.g., "3/4 translated")

### Phase 7: Iframe Storefront Preview

Add a live preview panel in the admin that shows the actual storefront page.

**Three-panel layout:**
```
+------------------+------------------------+------------------+
|  Page Tree       |   Storefront Preview   |  Field Editor    |
|                  |   (iframe)             |                  |
|  > Home          |                        |  Title: ______   |
|    - Hero        |   [clickable regions]  |  Subtitle: ____  |
|    - Banner      |                        |  CTA: ________   |
|  > Shop          |   highlighted on hover |                  |
|  > About         |                        |  [Advanced JSON] |
+------------------+------------------------+------------------+
```

**postMessage protocol** between editor and iframe:
- Editor -> iframe: `cms:highlight` (highlight a section), `cms:update` (live field update)
- iframe -> Editor: `cms:select` (user clicked a component), `cms:ready` (page loaded, lists sections)

**`<CmsEditable>` wrapper** for storefront components:
- Normal mode: renders children as-is
- Preview mode (`?cms_preview=true`): adds data attributes, hover outlines, click-to-select

**Tasks:**
- [ ] Add `cms_preview` query param support to storefront layout
- [ ] Create `<CmsEditable sectionKey="...">` wrapper component
- [ ] Build `<CmsPreviewPanel>` with iframe + postMessage bridge
- [ ] Wire click-to-select: clicking in iframe selects the section in the editor
- [ ] Highlight active section in the iframe when selected in the sidebar

### Phase 8: Live Preview Updates

Real-time content updates in the iframe as the admin types.

**Tasks:**
- [ ] Debounced postMessage on field change -> iframe receives updated content
- [ ] Storefront components read from a `CmsPreviewContext` when in preview mode
- [ ] Visual diff indicator — show which fields changed vs. published version
- [ ] "Preview as BG" / "Preview as EN" toggle in the preview panel

### Phase 9: Media & Asset Management

Integrated media library for CMS images, with upload to MinIO/S3.

**Tasks:**
- [ ] Build `<CmsMediaPicker>` dialog — browse uploaded assets, upload new ones
- [ ] Wire into `image` field type in the structured editor
- [ ] Show image thumbnails inline in the editor
- [ ] Support drag-and-drop upload
- [ ] Store asset references in `cmsAssetBinding` (schema already exists)

### Phase 10: Advanced Features

- [ ] **Scheduled publishing** — set a future publish date, Inngest job applies it
- [ ] **Draft preview sharing** — generate a temporary preview URL for stakeholders
- [ ] **Diff viewer** — side-by-side comparison between versions before rollback
- [ ] **Role-based editing** — editors can only modify certain sections
- [ ] **Audit log** — who changed what and when (extend version snapshots)
- [ ] **A/B testing** — serve different content to different user segments via CMS profiles
- [ ] **Export/import** — download all CMS content as JSON, import into another environment

### Architecture Notes

- The existing `CMS_SEED_DEFAULTS` map already defines the content structure per section — this is the seed for `SECTION_SCHEMAS`
- `DynamicLogoIcon` in `src/components/storefront/dynamic-logo-icon.tsx` is the pattern for CMS-driven component rendering
- Section types (`hero`, `faq`, `feature_grid`, etc.) map naturally to form templates
- All CMS data flows through `useCmsResolvedSection()` with `pickString()` for graceful fallbacks — new features must preserve this pattern
- Server functions already support locale fallback chains — the visual editor must respect this
