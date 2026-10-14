import { Router, type IRouter } from "express";
import { PacChatBody, PacChatResponse, type PacChatReply } from "@workspace/api-zod";
import { ChatError } from "../chat/contracts";
import { sessionClient } from "../chat/session";
import { chatAnswer } from "../chat/agent";
import { cancelProposal, executeProposal } from "../chat/proposals";

const router: IRouter = Router();
const limits = new Map<string, { until: number; count: number }>();
const requests = new Map<string, { until: number; promise: Promise<PacChatReply> }>();
const active = new Set<string>();
function rateLimit(uid: string) {
  for (const [key, v] of limits) if (v.until < Date.now()) limits.delete(key);
  const limit = limits.get(uid) ?? { count: 0, until: Date.now() + 5 * 60_000 };
  if (limit.count >= 30) throw new ChatError(429, "Has enviado muchas consultas. Espera unos minutos y vuelve a intentar.");
  limit.count++; limits.set(uid, limit);
}

router.post("/chat", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    // Authenticate before checking Gemini configuration or invoking any tool.
    const { sb, userId } = await sessionClient(req.get("authorization"));
    const parsed = PacChatBody.safeParse(req.body);
    if (!parsed.success) throw new ChatError(400, "No pude leer el mensaje. Reduce el texto e inténtalo nuevamente.");
    const input = parsed.data;
    if (input.action !== "message") {
      if (!input.confirmationId || input.confirmationId.length > 100) throw new ChatError(400, "Falta la propuesta que quieres revisar.");
      rateLimit(userId);
      const reply = input.action === "confirm" ? await executeProposal(sb, input.confirmationId, userId) : cancelProposal(input.confirmationId, userId);
      res.json(PacChatResponse.parse(reply)); return;
    }
    if (!input.history.length || input.history.at(-1)?.role !== "user" || !input.history.at(-1)?.text.trim()) throw new ChatError(400, "Escribe un mensaje para PAC.");
    if (input.history.reduce((n, m) => n + m.text.length, 0) > 90_000) throw new ChatError(400, "La conversación es muy extensa. Reduce el texto o inicia una consulta más corta.");
    if (input.requestId && !/^[\w-]{1,100}$/.test(input.requestId)) throw new ChatError(400, "La identificación de la solicitud no es válida.");
    for (const [key, value] of requests) if (value.until < Date.now()) requests.delete(key);
    const cacheKey = input.requestId ? `${userId}:${input.requestId}` : null;
    const cached = cacheKey ? requests.get(cacheKey) : null;
    if (cached) { res.json(PacChatResponse.parse(await cached.promise)); return; }
    rateLimit(userId);
    if (active.has(userId)) throw new ChatError(409, "PAC todavía está procesando tu consulta anterior.");
    active.add(userId);
    const promise = chatAnswer(sb, userId, input).finally(() => active.delete(userId));
    if (cacheKey) requests.set(cacheKey, { until: Date.now() + 5 * 60_000, promise });
    try { res.json(PacChatResponse.parse(await promise)); }
    catch (error) { if (cacheKey) requests.delete(cacheKey); throw error; }
  } catch (error) {
    const known = error instanceof ChatError;
    const status = known ? error.status : 503;
    // Never log provider errors, prompts, tokens, proposal fields or raw database errors.
    req.log.warn({ code: known ? error.code : "provider_unavailable", status }, "PAC chat request failed");
    res.status(status).json({ error: known ? error.message : "No pude conectar con Gemini o Supabase. Inténtalo nuevamente; no se ejecutará ningún cambio sin confirmar.", code: known ? error.code : "provider_unavailable" });
  }
});
export default router;
