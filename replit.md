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
- The panel uses existing `public.clientes` and `public.reuniones`. “Contactar” offers WhatsApp/Correo, inserts a nonduplicated Apollo lead with null temperature, origin Apollo, and a followup in 3 days. Existing names are reused without rewriting them. Contact stage changes are authorized; no schema changes.
- Compute “today” in the America/Lima timezone.

## Product

Public equipment and community information; protected commercial dashboard; editable contacts with stage, temperature and origin filters; scheduled followups; manual meeting entry; structured copilot analysis from existing reuniones.analisis; WhatsApp/email/call composers and a mobile-accessible stage board at /panel/embudo. Apollo displays clearly labelled local example leads with contact creation. Reports combine real database aggregates with a distinctly labelled illustrative projection. Granola recording remains “Próximamente”.

## User preferences

All content in Spanish. Match the supplied TECNOCARE storyboard references: Inter, navy #14213D, blue #2F6FDB, orange #F28C28, background #F4F6FB, responsive white cards. Use the provided full PNG logo over white/light backgrounds, including Apollo center; use the icon PNG only for favicon and loading.

## Contact lifecycle

The meeting-analysis copilot owns the exact ordered stage contract: Lead, Primer contacto, Interesado - evaluando, Información pendiente, Demo agendada, Demo realizada, Negociación, Esperando decisión, En pausa, Ganado, Perdido, Descartado. Leads are Lead or blank stage without meetings. All unknown stages and blank stages with meetings are Oportunidades; never show a Sin clasificar tab or unknown-stage warning. “Respondió con interés” writes Interesado - evaluando. Temperature values are Frio/Tibio/Caliente; normalize incoming Frío to Frio. For Perdido with no explicit reason, display only the latest meeting's objections with “(según última reunión)”, without writing the inferred reason to the database. Leads show “Sin respuesta”, won sales are Clientes, Perdido/Descartado are Cerrados. Loss requires a reason; wins/losses set the Lima closing date. Existing origen, motivo_perdida, fecha_cierre fields must be used. Funnel percentages are a current-stage snapshot, not historical conversion: no stage history is available.

## Gotchas

Do not create or modify database tables for the CRM. Direct-contact links open the user's composer/dialer, never send automatically. Deleting a contact explicitly confirms that its meetings will also be removed. Manual meeting inserts and contact updates use separate existing-table requests: if the second request fails, preserve the saved meeting and retry only contact synchronization, reporting the partial save clearly. No server-side transaction function is assumed to exist.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
