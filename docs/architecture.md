# Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (React 19, SSR) |
| Router | TanStack Router (file-based) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (via pgbouncer) |
| Cache | Redis |
| Storage | MinIO (S3-compatible) |
| Queue | Inngest |
| Auth | Better Auth |
| UI | shadcn/ui + Tailwind CSS |
| i18n | i18next |

## Directory Structure

```
src/
  routes/               # File-based routing (auto-generates routeTree.gen.ts)
    (authenticated)/    # Requires auth session
      admin/            # Admin panel routes
    (storefront)/       # Public storefront
      store/            # Store pages
    api/                # API routes (server handlers)
  components/
    admin/              # Admin UI components
    storefront/         # Storefront components
    ui/                 # shadcn/ui primitives
  lib/
    auth/               # Auth utilities, middleware
    db/                 # Drizzle DB client + schema
      schema/           # Table definitions
    ecommerce/          # E-commerce business logic
      functions/        # Server functions (one file per domain)
      queries.ts        # React Query factories
    storage/            # MinIO upload utilities
    result.ts           # Result<T> pattern (Ok/Err/safe)
  hooks/
    ecommerce-actions.ts  # useAction() mutation hooks
  i18n/                 # Translation files (en/ bg/)
  constants.ts          # Routes, query keys, messages, formatPrice
```

## Key Patterns

### Server Functions
```typescript
import { createServerFn } from "@tanstack/react-start";
import { accessMiddleware } from "@/lib/auth/middleware";
import { validate } from "@/lib/validation";
import { safe } from "@/lib/result";

export const $myFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => validate(MySchema, data))
  .middleware([accessMiddleware({ permissions: { products: ["write"] } })])
  .handler(async ({ data }) => {
    return safe(async () => {
      if (!data.ok) throw data.error;  // validate() returns Result
      const { fieldA } = data.data;
      // do DB work...
      return result;
    });
  });
```

### Result Pattern
```typescript
import { Ok, Err, safe, unwrap } from "@/lib/result";
// safe() wraps async ops: returns { ok: true, data } or { ok: false, error }
const result = await safe(async () => { /* ... */ });
if (!result.ok) throw result.error;
```

### Mutations (client-side)
```typescript
import { useAction } from "@/hooks/use-action";
const { mutate, isPending } = useAction($myServerFn, {
  onSuccess: () => toast.success("Done"),
  onError: (e) => toast.error(e.message),
  invalidateKeys: [QUERY_KEYS.PRODUCTS.LIST],
});
```

### Prices
- **Always stored in cents** (integer)
- `formatPrice(cents)` → display string (e.g., "12.90 лв.")
- `parsePriceToCents("12.90")` → 1290

## Infrastructure (Docker)

| Service | Purpose |
|---------|---------|
| web | TanStack Start app (port 3000) |
| postgres_api | PostgreSQL 18 |
| pgbouncer | Connection pooler |
| redis | Cache |
| minio | S3-compatible storage |
| inngest | Job queue |
| traefik | Reverse proxy (Tailscale HTTPS) |
