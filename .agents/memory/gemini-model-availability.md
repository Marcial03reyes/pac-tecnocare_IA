---
name: Gemini models and history
description: Authorized Gemini models, retry policy, signed multi-turn history, and safe provider diagnostics.
---

Validate a requested Gemini model with a minimal generation request before claiming it is usable. Substitution requires the user's authorization.

**Why:** Google's catalog can list a model and its generation methods while actual generation rejects access for new users. Catalog availability and account eligibility are different.

**How to apply:** If generation is rejected, explain the provider restriction and get approval for a different model. Confirm the alternative with a small, non-sensitive probe.

For Asistente PAC, the user explicitly authorized replacing gemini-2.5-flash with gemini-3-flash-preview.

**Why:** The requested model rejected generation for new users; the authorized alternative passed real read-tool, proposal and privacy checks using fictional data.

**How to apply:** Keep that model as the default. The user authorizes configuring the primary through GEMINI_MODEL. For HTTP 429 or 503, wait 1s and 3s for two retries, then use the other authorized Flash model. This explicitly includes 429 quota errors and replaces the earlier quota exclusion. Do not substitute arbitrary models or retry invalid requests/authentication/permission errors.

Automatic fallback must restart from human-visible history and must never replay CRM writes.

**Why:** The user requested retry/fallback while preserving the existing confirmation-only write behavior. Model-specific thought signatures cannot be reused safely across models.

**How to apply:** Re-run only reads and privacy checks with the fallback; create a proposal afterward and still require Confirmar. Show a discreet delay/fallback notice rather than silently hiding long waits.

Across successful turns on the same model, preserve the exact SDK model Content, including every Part and opaque thoughtSignature, plus the paired functionResponse for every tool call. Visible chat text is not a replacement for this history.

**Why:** The user reported that later turns failed and explicitly required complete Gemini 3 signed history across HTTP requests, not merely inside one tool loop.

**How to apply:** Keep signed history scoped to the authenticated user and conversation. Never fabricate model messages from UI text or replay signatures on another model. A pending write still needs a tool response stating it is only proposed. Human Confirmar/Corregir outcomes are user-side events, not invented model responses. Do not expose thought/signature Parts to the browser or logs.

Provider errors must report their actual HTTP status and sanitized message in server logs. A provider HTTP response is not a connection failure.

**Why:** The user explicitly requested cause-specific diagnostics rather than the misleading generic connection message.

**How to apply:** Show “Mucha demanda, reintentando…” during 429/503 retries and “Error del asistente” for other provider errors. Never log keys, headers, raw SDK exception objects, or conversation contents. Distinguish controlled four-turn tests from live verification blocked by provider quota/availability.

Progress reads must have a mounted-view lifecycle independent of the chat mutation.

**Why:** Protected-browser checks received valid authenticated progress responses but the pending view did not update when progress belonged to the long-lived send operation. An independent mounted read query resolved the visibility failure.

**How to apply:** Keep status ownership scoped to user/request, independently of conversation writes. Verify that the retry notice is actually visible before the reply completes; successful network polls alone do not prove this.

Live probes must use the SDK's native Node module resolution, matching the application's production build.

**Why:** Fully bundling the SDK into a temporary probe produced generic connection failures, while the same checks with native SDK imports and a direct SDK control request succeeded.

**How to apply:** Keep the SDK external in probe bundles and place the output under the API package so Node can resolve it. Distinguish harness errors from provider availability before proposing a model change.
