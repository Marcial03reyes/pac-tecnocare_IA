---
name: CRM data ownership
description: Why CRM additions preserve the external Supabase and copilot contracts.
---

Use the existing Supabase schema and preserve copilot analysis; a frontend CRM extension must not assume it owns the database or external analysis pipeline.

**Why:** The user repeatedly requires keeping what works and forbids creating or modifying tables. The copilot is an external writer with an exact stage vocabulary.

**How to apply:** Make no schema or permission changes without a separate request. If atomic multi-table writes require a new server-side function, propose it separately rather than silently provisioning it during frontend work.

The Embudo's Lead / Negociación / Ganado columns are presentation groups, not a replacement stage vocabulary. Perdido and Descartado belong in the closed list; active and unknown stages belong in Negociación.

**Why:** The user explicitly requested three columns while keeping the database and the copilot's detailed stages unchanged. The column name Negociación also exists as a detailed stage, so confusing the two would overwrite analysis.

**How to apply:** Never migrate records to three stages or overwrite detailed stages merely by grouping/reordering them. Only explicit user transitions write canonical stages: Lead to Negociación uses Interesado - evaluando with a chosen temperature; winning and reopening won contacts require confirmation, and closing a lead/opportunity requires a reason.
