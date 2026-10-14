import { Router, type IRouter } from "express";
import { PacChatBody, PacChatResponse, type PacChatReply } from "@workspace/api-zod";
import { ChatError } from "../chat/contracts";
import { sessionClient } from "../chat/session";
import { chatAnswer } from "../chat/agent";
import { cancelProposal, executeProposal } from "../chat/proposals";
import type { Progress } from "../chat/models";
import { rememberAction } from "../chat/history";

const router: IRouter = Router();
const limits = new Map<string, { until: number; count: number }>();
const requests = new Map<string, { until: number; promise: Promise<PacChatReply> }>();
const active = new Set<string>();
const progress = new Map<string, { until: number; state: Progress }>();
const statusMessage = (state: Progress) => state === "retrying" ? "Mucha demanda, reintentando…"
  : state === "fallback" ? "Probando el modelo de respaldo…" : undefined;

router.get("/chat/status/:requestId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { userId } = await sessionClient(req.get("authorization"));
    const id = String(req.params.requestId);
    if (!/^[\w-]{1,100}$/.test(id)) throw new ChatError(400, "Solicitud no válida.");
    const p = progress.get(`${userId}:${id}`);
    if (!p || p.until <= Date.now()) { res.status(404).json({ error: "Solicitud no disponible." }); return; }
    res.json({ state: p.state, message: statusMessage(p.state) });
  } catch (error) {
    res.status(error instanceof ChatError ? error.status : 502).json({ error: "No pude consultar el estado de esta solicitud." });
  }
});
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
      rememberAction(userId, input.conversationId, input.action === "confirm" ? "Confirmar" : "Corregir", reply.text);
      res.json(PacChatResponse.parse(reply)); return;
    }
    if (!input.history.length || input.history.at(-1)?.role !== "user" || !input.history.at(-1)?.text.trim()) throw new ChatError(400, "Escribe un mensaje para PAC.");
    if (input.history.reduce((n, m) => n + m.text.length, 0) > 90_000) throw new ChatError(400, "La conversación es muy extensa. Reduce el texto o inicia una consulta más corta.");
    if (input.requestId && !/^[\w-]{1,100}$/.test(input.requestId)) throw new ChatError(400, "La identificación de la solicitud no es válida.");
    for (const [key, value] of requests) if (value.until < Date.now()) requests.delete(key);
    for (const [key, value] of progress) if (value.until < Date.now()) progress.delete(key);
    const progressKey = input.requestId ? `${userId}:${input.requestId}` : null;
    const cacheKey = input.requestId ? `${userId}:${input.conversationId ?? "legacy"}:${input.requestId}` : null;
    const cached = cacheKey ? requests.get(cacheKey) : null;
    if (cached) { res.json(PacChatResponse.parse(await cached.promise)); return; }
    rateLimit(userId);
    if (active.has(userId)) throw new ChatError(409, "PAC todavía está procesando tu consulta anterior.");
    active.add(userId);
    const setProgress = (state: Progress) => { if (progressKey) progress.set(progressKey, { until: Date.now() + 5 * 60_000, state }); };
    setProgress("thinking");
    const promise = chatAnswer(sb, userId, input, undefined, setProgress)
      .then((reply) => { setProgress("done"); return reply; }, (error) => { setProgress("error"); throw error; })
      .finally(() => active.delete(userId));
    if (cacheKey) requests.set(cacheKey, { until: Date.now() + 5 * 60_000, promise });
    try { res.json(PacChatResponse.parse(await promise)); }
    catch (error) { if (cacheKey) requests.delete(cacheKey); throw error; }
  } catch (error) {
    const known = error instanceof ChatError;
    const status = known ? error.status : 503;
    // Gemini logs its redacted HTTP code/message at the SDK boundary; no prompts,
    // authorization headers, proposal fields or raw database errors here.
    req.log.warn({ code: known ? error.code : "provider_unavailable", status }, "PAC chat request failed");
    res.status(status).json({ error: known ? error.message : "Error del asistente. No se pudo completar la solicitud; no se ejecutará ningún cambio sin confirmar.", code: known ? error.code : "provider_error" });
  }
});
export default router;
