/**
 * Explicitly opt-in Gemini integration check. Uses only fictional records and
 * a read-only in-memory database double; it cannot access Supabase.
 * Bundle for Node with @google/genai external (as in production), write the
 * output under this API package (e.g. node_modules/.cache), then run with --live.
 */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { chatAnswer, gemini } from "../src/chat/agent";
import { cancelProposal } from "../src/chat/proposals";
import { limaToday } from "../src/chat/data";
import { ChatError } from "../src/chat/contracts";
import type { PacChatInput } from "@workspace/api-zod";

async function main() {
  assert.ok(process.argv.includes("--live"), "Pass --live to permit real Gemini requests with fictional data.");
  const contact = {
    id: "demo-1", nombre: "Clínica Andina", institucion: "Clínica Andina",
    especialidad: "Rehabilitación", etapa_actual: "Interesado - evaluando", temperatura_actual: "Tibio",
    proximo_contacto_fecha: limaToday(), proximo_contacto_motivo: "Confirmar demostración",
    ultima_reunion: null, motivo_perdida: null, telefono: null, email: null,
  };
  const previousMeeting = {
    id: "meeting-demo", cliente_id: "demo-1", fecha_reunion: "2026-10-13T15:00:00Z",
    etapa: "Interesado - evaluando", temperatura: "Tibio",
    transcripcion_resumen: "Caso ficticio: la clínica evaluó el generador y solicitó ficha técnica.",
    acuerdos_proximo_paso: "Enviar ficha técnica y confirmar una demostración.",
    objeciones_detectadas: null, borrador_whatsapp: "Le enviaré la ficha técnica.", analisis: null, transcripcion: null,
  };
  let queries = 0, attemptedWrites = 0;
  const sb = { from(table: string) {
    queries++;
    let rows: Record<string, unknown>[] = table === "clientes" ? [{ ...contact }] : [{ ...previousMeeting }];
    const blocked = () => { attemptedWrites++; throw new Error("Real or simulated database writes are prohibited in this check."); };
    const chain = {
      select() { return chain; },
      eq(key: string, value: unknown) { rows = rows.filter((r) => String(r[key]) === String(value)); return chain; },
      or(filter: string) {
        const text = /"%([^"]*)%"/.exec(filter)?.[1]?.replace(/\\(.)/g, "$1").toLowerCase() ?? "";
        rows = rows.filter((r) => [r.nombre, r.institucion].some((v) => String(v).toLowerCase().includes(text)));
        return chain;
      },
      gte(key: string, value: string) { rows = rows.filter((r) => String(r[key] ?? "") >= value); return chain; },
      lt(key: string, value: string) { rows = rows.filter((r) => String(r[key] ?? "") < value); return chain; },
      order() { return chain; }, range() { return chain; }, limit() { return chain; },
      insert: blocked, update: blocked, delete: blocked, upsert: blocked,
      maybeSingle() { return Promise.resolve({ data: rows[0] ?? null, error: null }); },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
    };
    return chain;
  } } as unknown as SupabaseClient;
  const ai = gemini();
  const generate = ai.models.generateContent.bind(ai.models);
  let firstModel: string | undefined;
  ai.models.generateContent = async (params) => {
    firstModel ??= params.model;
    try { return await generate(params); }
    catch (error) {
      // Diagnose provider availability without printing Secret model identifiers,
      // request bodies, API keys or raw provider messages.
      console.error(JSON.stringify({
        check: "provider_attempt", role: params.model === firstModel ? "primary" : "fallback",
        status: (error as { status?: number })?.status ?? null,
        demand: error instanceof Error && /high demand|overload/i.test(error.message),
        timedOut: error instanceof Error && /timeout|timed out|aborted/i.test(error.message),
      }));
      throw error;
    }
  };
  const userId = randomUUID();
  const conversationId = randomUUID();
  const history: PacChatInput["history"] = [];
  const questions = ["¿A quién llamo hoy?", "¿Qué se habló con la Clínica Andina?", "¿y su próximo paso?", "registra que hoy lo llamé y quedó en decidir el lunes"];
  for (const [index, question] of questions.entries()) {
    history.push({ role: "user", text: question });
    const reply = await chatAnswer(sb, userId, { action: "message", history, conversationId, requestId: randomUUID() }, ai);
    assert.ok(reply.text.trim());
    if (index < 3) assert.equal(reply.proposal, undefined);
    else {
      assert.equal(reply.proposal?.tool, "registrar_reunion");
      assert.match(reply.text, /Confirmar/);
      if (reply.proposal) cancelProposal(reply.proposal.id, userId);
    }
    history.push({ role: "assistant", text: reply.text });
    assert.equal(attemptedWrites, 0);
    console.log(JSON.stringify({ check: "live_four_turn_conversation", turn: index + 1, passed: true, asksConfirmation: Boolean(reply.proposal), attemptedWrites }));
  }
  assert.ok(queries > 0);
}

main().catch((error: unknown) => {
  // Never log raw provider errors, keys, prompts, or API response bodies.
  console.error(JSON.stringify({
    passed: false, type: error instanceof Error ? error.name : "Error",
    status: (error as { status?: number })?.status ?? null,
    ...(error instanceof ChatError ? { code: error.code, message: error.message } : {}),
  }));
  process.exitCode = 1;
});
