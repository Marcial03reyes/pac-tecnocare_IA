import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoogleGenAI } from "@google/genai";
import { prepareProposal, executeProposal, cancelProposal } from "../src/chat/proposals";
import { parseWrite, timestamp } from "../src/chat/contracts";
import { readTool, nextDate } from "../src/chat/data";
import { privacyCheck, chatAnswer } from "../src/chat/agent";
import { sessionClient } from "../src/chat/session";

function database() {
  const contact: Record<string, unknown> = {
    id: "c1", nombre: "Doctora Prueba", institucion: "Consultorio Prueba", etapa_actual: "Lead", temperatura_actual: null,
    proximo_contacto_fecha: null, proximo_contacto_motivo: null, ultima_reunion: null, motivo_perdida: null,
  };
  const contacts = [contact];
  const meetings: Record<string, unknown>[] = [];
  const operations: Array<{ table: string; verb: string; values: Record<string, unknown>; filters: unknown[] }> = [];
  let failUpdate = false;
  const sb = { from(table: string) {
    let verb = "select", values: Record<string, unknown> = {};
    const filters: Array<[string, string, unknown]> = [];
    let exact: string | null = null;
    const result = () => {
      let rows = table === "clientes" ? contacts : meetings;
      for (const [op, key, value] of filters) {
        if (op === "eq" || op === "is") rows = rows.filter((r) => (r[key] ?? null) === value);
        if (op === "ilike") rows = rows.filter((r) => String(r[key]).toLowerCase() === String(value).toLowerCase());
      }
      if (verb === "insert") {
        const row = { ...values, id: table === "reuniones" ? `r${meetings.length + 1}` : `c${contacts.length + 1}` };
        (table === "clientes" ? contacts : meetings).push(row);
        operations.push({ table, verb, values, filters });
        return { data: exact ? row : [row], error: null };
      }
      if (verb === "update") {
        operations.push({ table, verb, values, filters });
        if (failUpdate) return { data: null, error: { message: "denied" } };
        rows.forEach((r) => Object.assign(r, values));
      }
      return { data: exact ? rows[0] ? { ...rows[0] } : null : rows.map((r) => ({ ...r })), error: null };
    };
    const chain = {
      select() { return chain; },
      insert(v: Record<string, unknown>) { verb = "insert"; values = v; return chain; },
      update(v: Record<string, unknown>) { verb = "update"; values = v; return chain; },
      eq(k: string, v: unknown) { filters.push(["eq", k, v]); return chain; },
      is(k: string, v: unknown) { filters.push(["is", k, v]); return chain; },
      ilike(k: string, v: unknown) { filters.push(["ilike", k, v]); return chain; },
      or(v: string) { filters.push(["or", "", v]); return chain; },
      gte(k: string, v: unknown) { filters.push(["gte", k, v]); return chain; },
      lt(k: string, v: unknown) { filters.push(["lt", k, v]); return chain; },
      order() { return chain; }, limit() { return chain; }, range() { return chain; },
      single() { exact = "single"; return Promise.resolve(result()); },
      maybeSingle() { exact = "maybe"; return Promise.resolve(result()); },
      then(resolve: (r: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
    };
    return chain;
  } } as unknown as SupabaseClient;
  return { sb, contact, contacts, meetings, operations, fail(value: boolean) { failUpdate = value; } };
}
const uid = () => randomUUID();
const meeting = { cliente_id: "c1", fecha_reunion: "2026-10-14T10:00:00-05:00", etapa: "Demo agendada", temperatura: "Frío", transcripcion_resumen: "Demo acordada", acuerdos_proximo_paso: "Enviar ficha", borrador_whatsapp: "Confirmo la demo acordada.", proximo_contacto_fecha: "2026-10-16", proximo_contacto_motivo: "Confirmar equipo" };

test("anonymous chat is 401 without inspecting Gemini or querying data", async () => {
  await assert.rejects(sessionClient(undefined), (error: unknown) => (error as { status: number }).status === 401);
});
test("write schemas reject deletion/unauthorized fields and accept canonical temperature", () => {
  assert.throws(() => parseWrite("actualizar_contacto", { cliente_id: "c1", campos: { nombre: "Cambio no permitido" } }));
  assert.throws(() => parseWrite("actualizar_contacto", { cliente_id: "c1", campos: { id: "otro", fecha_cierre: "2026-10-14" } }));
  assert.equal(parseWrite("registrar_reunion", meeting).temperatura, "Frio");
  assert.equal(timestamp.parse("2026-10-14T10:00:00"), "2026-10-14T15:00:00.000Z");
  assert.throws(() => timestamp.parse("2026-02-31T10:00:00"));
  assert.equal(nextDate("2026-12-31"), "2027-01-01");
});
test("create proposal never writes until confirmation, confirmation replay never inserts twice", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "crear_contacto", { nombre: "Nuevo Prueba", origen: "Web" });
  assert.equal(db.operations.length, 0);
  assert.match(p.public.fields.find((f) => f.label === "Etapa inicial")!.value, /Lead/);
  const reply = await executeProposal(db.sb, p.public.id, user);
  assert.equal(reply.saved, true);
  await executeProposal(db.sb, p.public.id, user);
  assert.equal(db.operations.length, 1);
  assert.equal(db.operations[0].values.etapa_actual, "Lead");
  assert.equal(db.operations[0].values.temperatura_actual, null);
});
test("proposal is bound to user, and correct invalidates it without writes", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "actualizar_contacto", { cliente_id: "c1", campos: { etapa_actual: "Negociación" } });
  await assert.rejects(executeProposal(db.sb, p.public.id, uid()));
  cancelProposal(p.public.id, user);
  await assert.rejects(executeProposal(db.sb, p.public.id, user));
  assert.equal(db.operations.length, 0);
});
test("source changes after proposal cause conflict rather than overwriting", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "actualizar_contacto", { cliente_id: "c1", campos: { temperatura_actual: "Caliente" } });
  db.contact.temperatura_actual = "Tibio";
  await assert.rejects(executeProposal(db.sb, p.public.id, user), /cambió/);
  assert.equal(db.operations.length, 0);
});
test("meeting confirmation writes Chat PAC, updates exact contact fields and replays safely", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "registrar_reunion", meeting);
  assert.equal(db.meetings.length, 0);
  const reply = await executeProposal(db.sb, p.public.id, user);
  assert.equal(reply.saved, true);
  assert.equal(db.meetings[0].origen_audio, "Chat PAC");
  assert.equal(db.contact.temperatura_actual, "Frio");
  assert.equal(db.contact.proximo_contacto_motivo, "Confirmar equipo");
  await executeProposal(db.sb, p.public.id, user);
  assert.equal(db.meetings.length, 1);
});
test("partial meeting save retains its ID and retry only synchronizes contact", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "registrar_reunion", meeting);
  db.fail(true);
  const partial = await executeProposal(db.sb, p.public.id, user);
  assert.equal(partial.partial, true); assert.equal(partial.retryable, true);
  assert.equal(db.meetings.length, 1);
  assert.throws(() => cancelProposal(p.public.id, user), /datos guardados/);
  db.fail(false);
  assert.equal((await executeProposal(db.sb, p.public.id, user)).saved, true);
  assert.equal(db.meetings.length, 1);
});
test("expired confirmations cannot write", async () => {
  const db = database(), user = uid();
  const p = await prepareProposal(db.sb, user, "crear_contacto", { nombre: "Otro Prueba" });
  p.expires = Date.now() - 1;
  await assert.rejects(executeProposal(db.sb, p.public.id, user), /expiró/);
  assert.equal(db.operations.length, 0);
});
test("privacy gate rejects sensitive data and allows purely commercial data", async () => {
  const fake = (allowed: boolean) => ({ models: { generateContent: async () => ({ text: JSON.stringify({ permitido: allowed }) }) } }) as unknown as GoogleGenAI;
  await assert.rejects(privacyCheck(fake(false), { resumen: "Información de salud personal" }), /sensibles/);
  await privacyCheck(fake(true), { resumen: "Presupuesto del consultorio" });
});
test("model function calling consults data and returns proposal, never auto-executes writes", async () => {
  const db = database(), user = uid();
  const calls = [
    { name: "buscar_contactos", args: { texto: "Doctora Prueba" } },
    { name: "ver_contacto", args: { cliente_id: "c1" } },
    { name: "registrar_reunion", args: meeting },
  ];
  let idx = 0;
  const fake = { models: { generateContent: async (input: { config: { responseMimeType?: string } }) => {
    if (input.config.responseMimeType) return { text: '{"permitido":true}' };
    const call = calls[idx++];
    return { functionCalls: [call], candidates: [{ content: { role: "model", parts: [{ functionCall: call, thoughtSignature: "preserved" }] } }] };
  } } } as unknown as GoogleGenAI;
  const reply = await chatAnswer(db.sb, user, { action: "message", history: [{ role: "user", text: "Registrar reunión con Doctora Prueba" }] }, fake);
  assert.equal(reply.proposal?.tool, "registrar_reunion");
  assert.equal(db.operations.length, 0);
  assert.equal(idx, 3);
});
test("no delete tool is exposed by read dispatcher", async () => {
  await assert.rejects(readTool(database().sb, "borrar_contacto", { cliente_id: "c1" }), /no disponible/);
});

test("ambiguous search blocks a model-selected contact until the user clarifies", async () => {
  const db = database();
  db.contacts.push({ ...db.contact, id: "c2", institucion: "Otra clínica" });
  const calls = [
    { name: "buscar_contactos", args: { texto: "Doctora Prueba" } },
    { name: "ver_contacto", args: { cliente_id: "c1" } },
    { name: "registrar_reunion", args: meeting },
  ];
  let idx = 0;
  const fake = { models: { generateContent: async () => {
    const call = calls[idx++];
    return call ? { functionCalls: [call], candidates: [{ content: { role: "model", parts: [{ functionCall: call }] } }] }
      : { text: "Hay dos contactos. ¿Con qué consultorio desea registrar la reunión?", functionCalls: [] };
  } } } as unknown as GoogleGenAI;
  const reply = await chatAnswer(db.sb, uid(), { action: "message", history: [{ role: "user", text: "Registrar reunión con Doctora Prueba" }] }, fake);
  assert.equal(reply.proposal, undefined);
  assert.match(reply.text, /dos contactos/);
  assert.equal(db.operations.length, 0);
});
