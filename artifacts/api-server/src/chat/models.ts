import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { ChatError } from "./contracts";
import { logger } from "../lib/logger";

export const MODEL = "gemini-3-flash-preview";
const OTHER_FLASH = "gemini-3.8-flash";

/** GEMINI_MODEL is server-only; never echo its value in responses or logs. */
export function modelPair(value = process.env.GEMINI_MODEL) {
  const primary = value?.trim().replace(/^models\//, "") || MODEL;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,149}$/.test(primary)) {
    throw new ChatError(503, "Revisa GEMINI_MODEL en los Secrets del servidor: debe ser un identificador de modelo válido.", "model_configuration");
  }
  return { primary, fallback: primary === MODEL ? OTHER_FLASH : MODEL };
}

export function providerError(error: unknown): ChatError {
  const status = Number((error as { status?: unknown })?.status ?? providerDetails(error).httpStatus) || undefined;
  if (status === 429 || status === 503) return new ChatError(Number(status), "Mucha demanda. Los reintentos y el respaldo no pudieron completar la respuesta. Puedes volver a intentarlo.", "provider_busy");
  if (status === 404) return new ChatError(502, "Error del asistente. El modelo configurado no está disponible.", "model_unavailable");
  return new ChatError(502, "Error del asistente. No se pudo completar la solicitud a Gemini.", "provider_error");
}

/** Extract only the provider's code/message, never its request object or stack. */
export function providerDetails(error: unknown, secrets = [process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL]) {
  const e = error as { status?: number; message?: string };
  let message = String(e?.message ?? "Error sin mensaje");
  let httpStatus = e?.status ?? null;
  try {
    const parsed = JSON.parse(message);
    if (typeof parsed?.error?.message === "string") message = parsed.error.message;
    if (!httpStatus && typeof parsed?.error?.code === "number") httpStatus = parsed.error.code;
  } catch { /* The SDK may return a plain message. */ }
  for (const value of secrets) if (value) {
    for (const variant of [value, value.trim(), value.trim().replace(/^models\//, "")]) {
      if (variant) for (const encoded of [variant, encodeURIComponent(variant)]) message = message.split(encoded).join("[REDACTED]");
    }
  }
  message = message.replace(/AIza[\w-]+/g, "[REDACTED]")
    .replace(/((?:key|api_key|apiKey)=)[^&\s"'<>]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]");
  return { httpStatus, providerMessage: message.slice(0, 4000) };
}
export type Progress = "thinking" | "retrying" | "fallback" | "done" | "error";

export function unavailable(error: unknown): boolean {
  const status = Number((error as { status?: unknown })?.status ?? providerDetails(error).httpStatus) || undefined;
  if ([404, 408, 429, 500, 502, 503, 504].includes(Number(status))) return true;
  if (status !== undefined) return false;
  const name = (error as { name?: string })?.name;
  return name === "AbortError" || name === "TimeoutError" ||
    (error instanceof Error && /timeout|timed out|fetch failed|network|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(error.message));
}

export function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ChatError(503, "Falta configurar Gemini en el servidor. El CRM sigue disponible.");
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000 } });
}

/** Internal control signal, never returned to the visitor or swallowed as a tool error. */
export class UseFallback extends Error {}

export class ModelRun {
  private retries = 0;
  constructor(
    private ai: GoogleGenAI,
    readonly model: string,
    private allowFallback: boolean,
    private pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    private onProgress?: (state: Progress) => void,
  ) {}
  async generate(params: Omit<GenerateContentParameters, "model">): Promise<GenerateContentResponse> {
    while (true) {
      try {
        return await this.ai.models.generateContent({ ...params, model: this.model });
      } catch (error) {
        const detail = providerDetails(error);
        logger.warn({ event: "gemini_error", ...detail, retryNumber: this.retries }, "Gemini devolvió un error");
        if (!this.allowFallback || !unavailable(error)) throw providerError(error);
        if ((detail.httpStatus === 429 || detail.httpStatus === 503) && this.retries < 2) {
          const delay = [1000, 3000][this.retries++];
          this.onProgress?.("retrying");
          await this.pause(delay);
          continue;
        }
        this.onProgress?.("fallback");
        throw new UseFallback();
      }
    }
  }
}
