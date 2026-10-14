---
name: Gemini model availability
description: Model catalog presence does not prove a key can generate content with that model.
---

Validate a requested Gemini model with a minimal generation request before claiming it is usable. Do not silently substitute another model.

**Why:** Google's catalog can list a model and its generation methods while actual generation rejects access for new users. Catalog availability and account eligibility are different.

**How to apply:** If generation is rejected, explain the provider restriction and get approval for a different model. Confirm the alternative with a small, non-sensitive probe.

For Asistente PAC, the user explicitly authorized replacing gemini-2.5-flash with gemini-3-flash-preview.

**Why:** The requested model rejected generation for new users; the authorized alternative passed real read-tool, proposal and privacy checks using fictional data.

**How to apply:** Keep the authorized model unless the user approves another substitution. Provider failures do not authorize an automatic model change.

Live probes must use the SDK's native Node module resolution, matching the application's production build.

**Why:** Fully bundling the SDK into a temporary probe produced generic connection failures, while the same checks with native SDK imports and a direct SDK control request succeeded.

**How to apply:** Keep the SDK external in probe bundles and place the output under the API package so Node can resolve it. Distinguish harness errors from provider availability before proposing a model change.
