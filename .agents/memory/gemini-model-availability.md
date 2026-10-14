---
name: Gemini model availability
description: Model catalog presence does not prove a key can generate content with that model.
---

Validate a requested Gemini model with a minimal generation request before claiming it is usable. Do not silently substitute another model.

**Why:** Google's catalog can list a model and its generation methods while actual generation rejects access for new users. Catalog availability and account eligibility are different.

**How to apply:** If generation is rejected, explain the provider restriction and get approval for a different model. Confirm the alternative with a small, non-sensitive probe.
