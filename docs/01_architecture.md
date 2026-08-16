# Architecture

The Next.js App Router renders authenticated pages and calls server actions.
Browser-only photo upload uses the Supabase publishable key and Storage RLS.
Server actions use the SSR client with the user's cookies.

```text
Browser
  ├─ Next.js pages/server actions ── Supabase Auth/Postgres
  ├─ Browser Storage upload ──────── private item-images bucket
  └─ Realtime channels ───────────── matches/transfers/items/needs/jobs

Supabase
  ├─ Postgres + RLS + triggers
  ├─ pgvector / PostGIS
  └─ Edge Functions: embed / connector-factory
```

`RulesMatchingEngine` is independent from React and database access and can be
replaced through `getMatchingEngine()`.
