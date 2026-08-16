# Implementation Plan

## Completed

- Next.js 16 application shell, Japanese landing/login/onboarding
- Supabase SSR clients and Next.js 16 proxy
- Asset, need, service, match, transfer, and Connector Factory pages
- Private photo upload, signed gallery, primary image and deletion
- RLS, Storage, Realtime, pgvector, PostGIS and transfer trigger migrations
- Replaceable explainable five-dimension matching engine
- Local demo seed and matching tests

## Operational steps

1. Run the verification commands in the README.
2. Apply migrations to the approved hosted Supabase project with a Personal Access Token.
3. Set `DEVIN_API_KEY` only as an Edge Function secret if Connector Factory is needed.
4. Deploy to Vercel with a Vercel Token.
5. Run the Golden Path with two Auth users and confirm Storage/RLS boundaries.
