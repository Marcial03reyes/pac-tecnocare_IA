/**
 * Explicitly opt-in Gemini integration check. Uses only fictional records and
 * a read-only in-memory database double; it cannot access Supabase.
 * Bundle for Node with @google/genai external (as in production), write the
 * output under this API package (e.g. node_modules/.cache), then run with --live.
 */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { chatAnswer, privacyCheck, gemini, MODEL } from "../src/chat/agent";
import { cancelProposal } from "../src/chat/proposals";
import { limaToday } from "../src/chat/data";
import { ChatError } from "../src/chat/contracts";

async function main() {
  assert.ok(process.argv.includes("--live"), "Pass --live to permit real Gemini requests with fictional data.");
  const contact = {
    id: "demo-1", nombre: "Contacto Demostración", institucion: "Consultorio Demostración",
    especialidad: "Rehabilitación", etapa_actual: "Primer contacto", temperatura_actual: "Caliente",
    proximo_contacto_fecha: limaToday(), proximo_contacto_motivo: "Confirmar demostración",
    ultima_reunion: null, motivo_perdida: null, telefono: null, email: null,
  };
  let queries = 0, attemptedWrites = 0;
  const sb = { from(table: string) {
    queries++;
    let rows: Record<string, unknown>[] = table === "clientes" ? [{ ...contact }] : [];
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
  const userId = randomUUID();
  const readReply = await chatAnswer(sb, userId, {
    action: "message", history: [{ role: "user", text: "¿A quién debo llamar hoy? Consulte el CRM y mencione la institución." }],
  }, ai);
  assert.match(readReply.text, /Demostraci[oó]n/i);
  assert.equal(readReply.proposal, undefined);
  assert.ok(queries > 0);
  console.log(JSON.stringify({ model: MODEL, check: "live_function_calling_read", passed: true }));

  const proposalReply = await chatAnswer(sb, userId, {
    action: "message",
    history: [{
      role: "user",
      text: 'Registre una reunión con Consultorio Demostración, ID demo-1, el 14 de octubre de 2026 a las 10:00 hora de Perú. Revisamos el generador y acordamos una demostración el 16 de octubre. Etapa: Demo agendada. Temperatura: Caliente. Resumen: se acordó una demostración y enviar ficha técnica. Acuerdos: enviar ficha y confirmar demostración. Sin objeciones comerciales. Próximo contacto: 2026-10-16, motivo confirmar demostración. Borrador WhatsApp: "Confirmo la demostración acordada. Le enviaré la ficha técnica solicitada." Prepare la propuesta, no guarde nada.',
    }],
  }, ai);
  assert.equal(proposalReply.proposal?.tool, "registrar_reunion");
  assert.equal(proposalReply.saved, undefined);
  assert.equal(attemptedWrites, 0);
  if (proposalReply.proposal) cancelProposal(proposalReply.proposal.id, userId);
  console.log(JSON.stringify({ model: MODEL, check: "live_proposal_and_commercial_privacy_gate", passed: true, attemptedWrites }));

  await assert.rejects(privacyCheck(ai, {
    transcripcion_resumen: "Caso ficticio de prueba: el médico tiene hipertensión; guardar ese dato de salud personal.",
  }), (error: unknown) => (error as { status?: number }).status === 400);
  console.log(JSON.stringify({ model: MODEL, check: "live_sensitive_data_rejected", passed: true }));
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
