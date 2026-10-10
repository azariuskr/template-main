# Unified Font System Plan

## Problem

1. **Fonts don't change from CMS**: The CMS theme editor offers fonts like Inter, Poppins, Playfair Display, etc. but only Quicksand + Varela Round are actually loaded (hardcoded Google Fonts link in `__root.tsx`). Changing the CMS font just changes the CSS variable name — the browser never has the font file.

2. **70 hardcoded `fontFamily` inline styles**: Every heading across 20 files has `style={{ fontFamily: "'Varela Round', sans-serif" }}` which overrides the CSS variables, making CMS font changes invisible even if the font were loaded.

3. **No consistent font system**: The storefront uses `--sf-font-*` vars, auth/policy pages don't use them, admin uses system defaults. No unified approach.

## Solution (3 tasks)

### Task 1: Remove all hardcoded `fontFamily` inline styles (70 occurrences, 20 files)

The CSS in `storefront.css` already applies fonts correctly:
```css
.storefront { font-family: var(--sf-font-sans); }
.storefront h1-h6 { font-family: var(--sf-font-heading); }
```

All 70 inline `style={{ fontFamily: "'Varela Round', sans-serif" }}` are on heading elements inside `.storefront` — they're redundant AND they block CMS changes. Remove them all.

**Files (with occurrence counts):**
- `store/checkout.tsx` (12)
- `store/contact.tsx` (9)
- `store/faq.tsx` (9)
- `store/about.tsx` (7)
- `store/index.tsx` (4)
- `store/cart.tsx` (4)
- `store/products/$slug.tsx` (4)
- `storefront-footer.tsx` (4)
- `checkout/success.tsx` (4)
- `store/wishlist.tsx` (2)
- `store/search.tsx` (2)
- `store/products/index.tsx` (1)
- `store/account/route.tsx` (1)
- `store/account/index.tsx` (1)
- `store/account/addresses.tsx` (1)
- `store/account/orders/index.tsx` (1)
- `store/account/orders/$orderId.tsx` (1)
- `storefront-nav.tsx` (1)
- `checkout/cancel.tsx` (1)
- `(auth-pages)/route.tsx` (1)

**Approach**: Use `replace_all` in each file to strip `style={{ fontFamily: "'Varela Round', sans-serif" }}`. For elements that have other style props alongside fontFamily, handle individually.

### Task 2: Dynamic Google Fonts loading based on CMS theme

**Current state**: `__root.tsx` hardcodes a single Google Fonts URL loading only Quicksand + Varela Round.

**New approach**: Create a `<DynamicFontLoader>` component used in the storefront layout that:
1. Reads font family names from the CMS theme content (already available via `themeData`)
2. Extracts the primary font name from each font stack (e.g. "Poppins" from "Poppins, system-ui, sans-serif")
3. Builds a Google Fonts URL for those fonts
4. Injects a `<link>` tag into the head

**Implementation**:
- New file: `src/lib/cms/font-loader.tsx`
- A small React component that uses `useEffect` + DOM manipulation to inject/update the font link
- Called from `src/routes/(storefront)/route.tsx` (storefront layout) with the resolved theme fonts
- Also keep the default Quicksand + Varela Round in `__root.tsx` as fallback for initial load
- Map of known Google Fonts families → URL slugs (handles fonts with spaces, weight ranges)

**Google Fonts URL builder**:
```
extractFontFamily("Poppins, system-ui, sans-serif") → "Poppins"
extractFontFamily("Varela Round, Quicksand, system-ui") → "Varela Round"
buildGoogleFontsUrl(["Poppins", "Playfair Display"]) →
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
```

### Task 3: Extend fonts to non-storefront pages

Auth pages (`/auth/*`), policy pages (`/terms`, `/privacy`, `/cookies`), and checkout result pages (`/checkout/cancel`, `/checkout/success`) are outside the `.storefront` wrapper.

**Approach**: Set `--font-sans` and `--font-heading` CSS custom properties on `:root` from the theme, so even non-storefront pages pick them up. Do this in `__root.tsx` or via a shared layout component.

For the auth layout specifically, add `font-family: var(--sf-font-heading, var(--font-heading, 'Varela Round'))` to the brand/logo element using a class instead of inline style.

## Out of Scope (Future)

- **Custom font upload to MinIO**: Would need a new "font" file category in storage types, a CMS font manager UI, `@font-face` CSS generation, and font file serving. This is a larger feature — document in STOREFRONT-PLAN.md for a future iteration.

## Execution Order

1. Task 1 first (remove hardcoded styles) — enables Task 2 to work
2. Task 2 (dynamic font loading) — makes CMS font changes actually work
3. Task 3 (extend to non-storefront) — consistent fonts everywhere
4. Rebuild container and verify
