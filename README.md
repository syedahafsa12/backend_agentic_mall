# backend_agentic_mall

Backend half of the Agent Mall POC, split out of the original `agentic_commerce`
monorepo. Copied as-is (API routes, server logic, demo-merchant data, migrations,
scripts) — nothing rewritten yet.

## What's here
- `src/app/api/**` — Next.js route handlers (the actual backend endpoints)
- `src/server/**` — auth, auctions, payments, tax, offers, policy, connectors, etc.
- `src/demo-merchants/**` — catalog + REST handler fixtures the demo endpoints use
- `src/lib/types.ts` — shared request/response types (duplicated from frontend repo)
- `migrations/`, `scripts/` — DB schema + seed/migrate scripts

## Gap this split leaves (needs a decision before this runs standalone)
This was still a single Next.js app — the "backend" is just the `app/api` route
tree, not a separate server. As copied, `next build` here will fail: there's no
`src/app/layout.tsx` / `page.tsx` (those stayed in the frontend repo), which
Next.js requires at the app root.

Pick one:
1. **Add a stub `layout.tsx`/`page.tsx`** here (a few lines each) so this stays a
   Next.js app that only serves `/api/*`. Simplest, keeps route files unchanged.
2. **Port the route handlers to Express/Fastify** — more work, but it's then a
   "real" standalone API server with no Next.js dependency.

Either way, once frontend and backend are different origins:
- Add CORS handling here (allow the frontend's origin, credentials).
- The frontend's `src/lib/api.ts` (`apiFetch`) needs an `NEXT_PUBLIC_API_BASE_URL`
  env var to prefix requests — right now it calls relative `/api/...` paths,
  which only works when both are the same app/origin.

## Env vars to set in this repo (see `.env.example`)
- `DATABASE_URL` — Postgres connection string
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — auth only, not data access
- `MODEL_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` — agent model provider
- `APP_BASE_URL` — this backend's own base URL
- `MERCHANT_B_MCP_COMMAND`, `MERCHANT_B_MCP_ARGS` — Merchant B MCP child process
- `CONNECT_ALLOW_LOCAL`, `CONNECT_SECRET` — `/connect` endpoint
- `MISTRAL_API_KEY`, `MISTRAL_MODEL` — optional alt model provider
- `ALLOWED_ORIGINS` — **new**, needed for CORS once frontend is a separate origin
