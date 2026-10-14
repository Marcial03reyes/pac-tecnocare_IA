import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { ChatError } from "./contracts";

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
  const status = (error as { status?: unknown })?.status;
  if (status === 404) return new ChatError(503, "El modelo configurado no está disponible. Revisa su acceso en el proveedor.", "model_unavailable");
  if (status === 429) return new ChatError(429, "Gemini alcanzó su límite de consultas. Espera unos minutos o revisa la cuota del proveedor.", "provider_quota");
  if (status === 400 || status === 401 || status === 403) return new ChatError(503, "Gemini no aceptó la solicitud. Revisa la clave y los permisos configurados en el servidor.", "provider_rejected");
  return new ChatError(503, "No pude conectar con Gemini ni completar la consulta. Inténtalo nuevamente; no se guardó nada sin confirmar.", "provider_unavailable");
}

export function unavailable(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  if ([404, 408, 500, 502, 503, 504].includes(Number(status))) return true;
  if (status === 429 && error instanceof Error && /high demand|overload|temporarily unavailable/i.test(error.message)) return true;
  // Missing permissions, invalid requests and quota exhaustion are not demand failures.
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
  private retried = false;
  constructor(
    private ai: GoogleGenAI,
    readonly model: string,
    private allowFallback: boolean,
    private pause = () => new Promise<void>((resolve) => setTimeout(resolve, 500)),
  ) {}
  async generate(params: Omit<GenerateContentParameters, "model">): Promise<GenerateContentResponse> {
    try {
      return await this.ai.models.generateContent({ ...params, model: this.model });
    } catch (error) {
      if (!this.allowFallback || !unavailable(error)) throw providerError(error);
      if (!this.retried) {
        this.retried = true;
        await this.pause();
        try {
          return await this.ai.models.generateContent({ ...params, model: this.model });
        } catch (retryError) {
          if (!unavailable(retryError)) throw providerError(retryError);
        }
      }
      throw new UseFallback();
    }
  }
}
