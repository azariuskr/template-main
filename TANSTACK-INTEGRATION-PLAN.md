# TanStack DB + Pacer Full Integration Plan

## Overview

This document describes the step-by-step plan to integrate TanStack DB and fully leverage
TanStack Pacer across the template. The goal is to move from a traditional server-round-trip
data model (fetch → cache → invalidate → refetch) to a reactive client-first model where
local state updates instantly and syncs to the server in the background.

---

## Why Are We Doing This?

### Problem with the current approach

Every mutation today (ban user, change role, cancel subscription) follows this cycle:

1. Call server function
2. Wait for network round-trip (~200–800ms)
3. Invalidate query cache keys
4. Trigger a refetch
5. UI finally updates

This means every action has noticeable latency, stale intermediate states, and fragile
invalidation lists that need to be maintained by hand (see `user-actions.ts` — every hook
manually lists 3–4 `invalidate` keys).

### What TanStack DB gives us

TanStack DB is a reactive client-first store. It augments TanStack Query — it does **not**
replace it. The model is:

- **Collections** hold typed data client-side (loaded via Query)
- **Live Queries** subscribe reactively to that data with sub-millisecond updates
- **Optimistic Mutations** update the Collection instantly, sync to server in background,
  and roll back automatically on failure

Result: actions feel instant, cross-component consistency is free, and invalidation arrays
disappear.

### What Pacer gives us

TanStack Pacer is already partially in use (debouncing in `toolbar.tsx` and `search-input.tsx`,
async queuing in `image-load-queue.tsx`). The remaining gaps are:

- **No rate limiting** on expensive operations (billing checkout, credit purchase) — the
  custom `RateLimiter` class in `rate-limit.ts` is defined but never imported anywhere
- **No throttling** on the admin storage search (currently recomputes on every keystroke
  via unthrottled `useMemo`)
- Pacer version `0.19.3` is outdated; `useRateLimiter` requires `^0.21.0`

---

## Step-by-Step Plan

### Step 1 — Install packages

**Packages:** `@tanstack/db`, `@tanstack/react-db`, `@tanstack/query-db-collection`

```bash
pnpm add @tanstack/db @tanstack/react-db @tanstack/query-db-collection
pnpm add -D @tanstack/react-pacer@^0.21.0  # upgrade from 0.19.3
```

**Why:** TanStack DB core (`@tanstack/db`) provides the Collection and live query engine.
`@tanstack/react-db` provides the React hooks (`useLiveQuery`, `usePacedMutations`).
`@tanstack/query-db-collection` is the bridge adapter that backs a Collection with a
TanStack Query `queryFn` — this is how the Collection loads its initial data without
rewriting our server functions.

---

### Step 2 — Create a module-level QueryClient singleton

**File:** `src/lib/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

// Separate singleton for TanStack DB collections.
// Cannot reuse the SSR queryClient (created per-request in getContext()).
// Collections are client-side only — this client never runs on the server.
export const collectionsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Why:** Our app's QueryClient is created per-request in `getContext()` for SSR correctness.
TanStack DB Collections are client-side constructs — they hold local state in the browser
tab and cannot be created per-request. A stable module-level singleton is required so
all Collections share the same data lifecycle across the app.

---

### Step 3 — Define Collections

**File:** `src/lib/collections.ts`

Define the primary data Collections backed by existing server functions via
`queryCollectionOptions`. Start with two:

#### `usersCollection`
- Backed by `$listUsers` (the flat user list, not paginated)
- Used by admin users view for reactive local filtering and optimistic mutations
- Enables: instant role changes, instant ban/unban with rollback

#### `billingSubscriptionsCollection`
- Backed by `$getAllSubscriptions` (admin billing view)
- Enables: reactive subscription status updates, optimistic cancellations

**Why:** These are the two highest-traffic admin views that currently suffer the most from
stale-cache latency. Both have mutations that trigger 3–4 manual invalidations today.

---

### Step 4 — Add `useLiveQuery` hooks to queries.ts

**File:** `src/lib/auth/queries.ts`

Add alongside existing hooks (do not remove paginated queries — server pagination stays):

```ts
export function useUsersLiveQuery(opts?: { role?: string; status?: string }) {
  return useLiveQuery((q) =>
    q.from({ user: usersCollection })
     .where(({ user }) => /* filter by opts */)
     .select(({ user }) => user),
    [opts?.role, opts?.status]
  )
}
```

**Why:** `useLiveQuery` subscribes to the Collection via differential dataflow — when a
user is banned optimistically, every component using `useUsersLiveQuery` updates in
sub-milliseconds, with zero refetches and zero cache invalidation. The paginated
`useUsersPaginated` stays for the main table (server pagination is better for large
datasets), but the reactive hooks power stats cards, drawers, and cross-panel consistency.

---

### Step 5 — Add optimistic mutations to `user-actions.ts`

**File:** `src/hooks/user-actions.ts`

Update `useBanUser`, `useUnbanUser`, `useSetUserRole`, `useUpdateUser`, `useDeleteUser`
to write optimistically to `usersCollection` before the server call completes:

```ts
// Before (current):
export function useBanUser() {
  return useAction(async (vars) => $banUser({ data: vars }), {
    invalidate: [QUERY_KEYS.USERS.LIST, QUERY_KEYS.USERS.PAGINATED_BASE, QUERY_KEYS.USERS.STATS],
  })
}

// After:
export function useBanUser() {
  return useAction(async (vars) => {
    // Optimistic: update collection immediately
    usersCollection.update(vars.userId, (u) => ({ ...u, banned: true }))
    return $banUser({ data: vars })
  }, {
    invalidate: [QUERY_KEYS.USERS.STATS], // only stats need server refresh now
    rollback: () => usersCollection.update(vars.userId, (u) => ({ ...u, banned: false }))
  })
}
```

**Why:** Removes the 3–4 invalidate keys that currently force a full refetch after every
mutation. Collection write → instant UI → server confirms → collection reconciles.
If server fails, `rollback` reverses the optimistic change.

---

### Step 6 — Integrate into provider tree

**File:** `src/integrations/tanstack-query/root-provider.tsx`

Mount the `QueryClientProvider` for `collectionsQueryClient` alongside the existing one.
TanStack DB does not require a separate "DBProvider" — the collections are module-level
singletons. The only integration needed is ensuring `collectionsQueryClient` is available
for the `queryCollectionOptions` calls.

**Why:** Collections bootstrap themselves when first accessed. No extra context is needed
in components — `useLiveQuery` reads directly from the module-level Collection. The
secondary QueryClientProvider ensures the collection's poll queries have a context to
register against.

---

### Step 7 — Pacer: upgrade and replace rate-limit.ts

**Files:** Delete `src/lib/rate-limit.ts`, update `src/hooks/use-billing.ts`

The existing `RateLimiter` class in `rate-limit.ts` is **dead code** — it defines
`authRateLimiters` but they are never imported anywhere in the codebase. Delete the file.

Replace with actual Pacer `useRateLimiter` hooks where rate limiting is genuinely needed:
`use-billing.ts` — wrap credit purchase and checkout actions:

```ts
import { useRateLimiter } from '@tanstack/react-pacer'

export function usePurchaseCredits() {
  const rateLimiter = useRateLimiter({ limit: 3, window: 60_000 }) // 3 per minute
  return useAction(async (vars) => {
    if (!rateLimiter.maybeExecute()) {
      return { ok: false, error: 'Too many purchase attempts. Please wait.' }
    }
    return $purchaseCredits({ data: vars })
  }, { showToast: true })
}
```

**Why:** Billing operations (checkout, credit purchase) are high-cost and abuse-prone.
Client-side rate limiting adds a UX guard before requests hit the server. The old
`RateLimiter` class was a manual localStorage implementation — Pacer's hook is reactive,
framework-native, and integrates with React's lifecycle.

---

### Step 8 — Pacer: throttle admin storage search

**File:** `src/components/admin/storage/admin-storage-view.tsx`

The storage view currently filters files with an unthrottled `useMemo` — every keystroke
triggers a synchronous filter over the full file list:

```ts
// Current (no throttle):
const [search, setSearch] = useState('')
const filtered = useMemo(() => files.filter(f => f.name.includes(search)), [files, search])
```

Replace with `useThrottledCallback` from Pacer:

```ts
import { useThrottledCallback } from '@tanstack/react-pacer'

const [debouncedSearch, setDebouncedSearch] = useState('')
const updateSearch = useThrottledCallback(setDebouncedSearch, { wait: 150 })
```

**Why:** For large file lists (hundreds of files), synchronous filtering on every keystroke
causes layout thrash. Throttling at 150ms smooths the interaction while still feeling
responsive.

---

## Deliverables Summary

| # | File | Type | What changes |
|---|------|------|--------------|
| 1 | `package.json` | Install | Add `@tanstack/db`, `@tanstack/react-db`, `@tanstack/query-db-collection`; upgrade `@tanstack/react-pacer` |
| 2 | `src/lib/query-client.ts` | New | Module-level `collectionsQueryClient` singleton |
| 3 | `src/lib/collections.ts` | New | `usersCollection`, `billingSubscriptionsCollection` |
| 4 | `src/lib/auth/queries.ts` | Update | Add `useUsersLiveQuery` hook |
| 5 | `src/hooks/user-actions.ts` | Update | Optimistic mutations on collection + reduced invalidations |
| 6 | `src/integrations/tanstack-query/root-provider.tsx` | Update | Mount `collectionsQueryClient` |
| 7 | `src/lib/rate-limit.ts` | Delete | Dead code — replaced by Pacer |
| 8 | `src/hooks/use-billing.ts` | Update | `useRateLimiter` on checkout + credit purchase |
| 9 | `src/components/admin/storage/admin-storage-view.tsx` | Update | `useThrottledCallback` on file search |

---

## What We Are NOT Changing

- **Paginated server queries** (`useUsersPaginated`) — server pagination is correct for
  large datasets; Collections complement it, not replace it
- **SSR loaders** — TanStack DB is client-only; server prefetch stays via Query
- **Auth UI forms** — handled by BetterAuth UI components, no direct form access
- **`@tanstack/react-query`** — stays as-is; DB augments it
- **Existing Pacer usage** — toolbar debounce and image-load-queue are already optimal

---

## Risk Notes

- `@tanstack/db` is pre-1.0 (currently `0.6.x`). API surface is stable for collections
  and live queries but may have minor breaking changes before v1.0.
- `@tanstack/react-db` is `0.1.x` — the `usePacedMutations` hook API may evolve.
- Mitigation: we use the stable `createCollection` + `useLiveQuery` APIs which are the
  most tested paths. Optimistic mutations are wrapped in our existing `useAction`
  abstraction so a DB API change only affects one place.
