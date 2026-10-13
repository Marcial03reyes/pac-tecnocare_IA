# PAC — Plataforma de Apoyo Comercial para TECNOCARE

Web pública de TECNOCARE y panel comercial privado en español para consultar clientes, seguimientos y reuniones del Supabase self-hosted existente.

## Run & Operate

- App workflow: `artifacts/pac-tecnocare: web`
- `pnpm --filter @workspace/pac-tecnocare run typecheck` — check the web application
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never hardcode or log values.
- **Do not create, modify, migrate, or seed database tables.** The user requires the existing Supabase tables to remain untouched.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Product data and authentication: existing self-hosted Supabase, via `@supabase/supabase-js`.
- Shared API/DB scaffolding is not the product's data source.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Use Supabase Auth with email/password and no public registration, as explicitly requested.
- The commercial panel reads existing `public.clientes` and `public.reuniones`. Round 2 explicitly authorizes inserting a selected Apollo example lead into `clientes` via “Contactar”, checking its name first; no schema changes.
- Compute “today” in the America/Lima timezone.

## Product

Public equipment and community information; protected commercial dashboard; client details and meeting history; scheduled telephone followups; meeting summaries and copyable WhatsApp drafts. Apollo displays clearly labelled local example leads with contact creation. Reports combine real database aggregates with a distinctly labelled illustrative projection. Granola recording remains “Próximamente”.

## User preferences

All content in Spanish. Match the supplied TECNOCARE storyboard references: Inter, navy #14213D, blue #2F6FDB, orange #F28C28, background #F4F6FB, responsive white cards. Use the provided full PNG logo over white/light backgrounds, never directly on navy; use the icon PNG for Apollo center, favicon, and loading.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
