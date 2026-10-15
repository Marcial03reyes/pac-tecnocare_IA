---
name: CRM data ownership
description: Why CRM additions preserve the external Supabase and copilot contracts.
---

Use the existing Supabase schema and preserve copilot analysis; a frontend CRM extension must not assume it owns the database or external analysis pipeline.

**Why:** The user repeatedly requires keeping what works and forbids creating or modifying tables. The copilot is an external writer with an exact stage vocabulary.

**How to apply:** Make no schema or permission changes without a separate request. If atomic multi-table writes require a new server-side function, propose it separately rather than silently provisioning it during frontend work.

Las notas de Granola las crea y procesa un sincronizador externo. El CRM nunca debe insertar ni borrar notas; solo puede cambiar `cliente_id` y `estado` a `listo`, `ignorada` o `por_asignar`.

**Why:** El usuario definió explícitamente esta separación de responsabilidades; el CRM no es dueño de la sincronización ni del análisis.

**How to apply:** No crear tablas, disparadores, políticas ni procesos alternativos para Granola. Conservar los errores del sincronizador y evitar sobrescribir notas que ya pasaron a procesamiento. La creación de un contacto y su asignación son operaciones separadas: conservar el contacto si falla la asignación, sin duplicarlo al reintentar.

The Embudo's Lead / Negociación / Ganado columns are presentation groups, not a replacement stage vocabulary. Perdido and Descartado belong in the closed list; active and unknown stages belong in Negociación.

**Why:** The user explicitly requested three columns while keeping the database and the copilot's detailed stages unchanged. The column name Negociación also exists as a detailed stage, so confusing the two would overwrite analysis.

**How to apply:** Never migrate records to three stages or overwrite detailed stages merely by grouping/reordering them. Explicitly dropping an opportunity onto a canonical detailed-stage group updates that stage; dropping on the plain Negociación column does not. Lead to Negociación always uses Interesado - evaluando with a chosen temperature, even when dropped onto another group. Winning and reopening won contacts require confirmation, and closing a contact requires a reason.

Ganado in the Embudo is a recent-sales view (last 90 days), not the complete client list. Use the actual closing date; missing closing dates must not be inferred from unrelated timestamps. Keep all won contacts accessible through Contactos → Clientes.

**Why:** The user requested a compact board that scales to hundreds of contacts without changing the database or losing access to older clients.

**How to apply:** Keep presentation filtering separate from stage ownership. Unknown active stages remain in Negociación in a separate group without silently converting their stored stage.
