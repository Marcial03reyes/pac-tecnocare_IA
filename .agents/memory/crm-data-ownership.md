---
name: CRM data ownership
description: Why CRM additions preserve the external Supabase and copilot contracts.
---

Use the existing Supabase schema and preserve copilot analysis; a frontend CRM extension must not assume it owns the database or external analysis pipeline.

**Why:** The user repeatedly requires keeping what works and forbids creating or modifying tables. The copilot is an external writer with an exact stage vocabulary.

**How to apply:** Make no schema or permission changes without a separate request. If atomic multi-table writes require a new server-side function, propose it separately rather than silently provisioning it during frontend work.
