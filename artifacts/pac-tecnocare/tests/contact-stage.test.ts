import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contactBucket, normalizeStage, stagePatch, lossReason, orderStageCounts, STAGES, OPPORTUNITY_STAGES, type ContactStageInput } from "../src/lib/contact-stages";
import { updateContactStage } from "../src/hooks/use-contact-stage";
import { todayLima } from "../src/lib/format";
import type { Cliente } from "../src/lib/types";

const c: Cliente = {
  id: 1, nombre: "Ejemplo", institucion: null, especialidad: null,
  telefono: null, email: null, created_at: null, etapa_actual: "Lead",
  temperatura_actual: null, proximo_contacto_fecha: null, proximo_contacto_motivo: null,
  ultima_reunion: null, origen: "Apollo", motivo_perdida: null, fecha_cierre: null,
};
const opp = { ...c, etapa_actual: "Demo realizada", temperatura_actual: "Caliente" };

test("copilot stages map to four tabs; all unknowns are opportunities", () => {
  for (const stage of ["Lead", " lead "]) {
    assert.equal(contactBucket({ etapa_actual: stage }), "leads");
  }
  assert.equal(normalizeStage("Evaluando"), "Evaluando");
  assert.equal(contactBucket({ etapa_actual: "Evaluando" }), "oportunidades");
  assert.equal(contactBucket({ etapa_actual: "Prospecto Apollo" }), "oportunidades");
  for (const stage of OPPORTUNITY_STAGES) assert.equal(contactBucket({ etapa_actual: stage }), "oportunidades");
  assert.equal(contactBucket({ etapa_actual: "Cotización" }), "oportunidades");
  assert.equal(contactBucket({ etapa_actual: "Ganado" }), "clientes");
  assert.equal(contactBucket({ etapa_actual: "Perdido" }), "cerrados");
  assert.equal(contactBucket({ etapa_actual: "Descartado" }), "cerrados");
});

test("interest requires deliberate temperature choice", () => {
  assert.deepEqual(stagePatch({ cliente: c, action: "interesado", temperatura: "Tibio" }), {
    etapa_actual: "Interesado - evaluando", temperatura_actual: "Tibio",
  });
  assert.throws(() => stagePatch({ cliente: c, action: "interesado", temperatura: null } as unknown as ContactStageInput), /temperatura/);
});

test("win/loss set Lima closing date and loss requires a reason", () => {
  assert.deepEqual(stagePatch({ cliente: opp, action: "ganado" }), {
    etapa_actual: "Ganado", fecha_cierre: todayLima(), motivo_perdida: null,
  });
  assert.deepEqual(stagePatch({ cliente: opp, action: "perdido", motivo: "  Presupuesto  " }), {
    etapa_actual: "Perdido", fecha_cierre: todayLima(), motivo_perdida: "Presupuesto",
  });
  assert.throws(() => stagePatch({ cliente: opp, action: "perdido", motivo: " " }), /motivo/);
  assert.throws(() => stagePatch({ cliente: c, action: "ganado" }), /etapa actual/);
});

test("discard and opportunity stage movements follow allowed levels", () => {
  assert.equal(stagePatch({ cliente: c, action: "descartar" }).etapa_actual, "Descartado");
  assert.deepEqual(stagePatch({ cliente: opp, action: "etapa", etapa: "Negociación" }), { etapa_actual: "Negociación" });
  assert.throws(() => stagePatch({ cliente: { ...c, etapa_actual: "Ganado" }, action: "descartar" }), /etapa actual/);
});

function mockUpdate(result: Cliente | null, error: unknown = null, userId = "user-a") {
  const filters: unknown[][] = [];
  const writes: Partial<Cliente>[] = [];
  const chain = {
    eq: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
    is: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
    select: () => ({ maybeSingle: async () => ({ data: result, error }) }),
  };
  const sb = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from: () => ({ update: (patch: Partial<Cliente>) => { writes.push(patch); return chain; } }),
  } as unknown as SupabaseClient;
  return { sb, filters, writes };
}

test("update filters exact original stage to protect concurrent changes", async () => {
  const saved = { ...c, etapa_actual: "Interesado - evaluando", temperatura_actual: "Tibio" };
  const f = mockUpdate(saved);
  assert.deepEqual(await updateContactStage(f.sb, { cliente: c, action: "interesado", temperatura: "Tibio" }, "user-a"), saved);
  assert.deepEqual(f.filters, [["id", 1], ["etapa_actual", "Lead"]]);
});

test("stale/unauthorised/failed updates reject without fake success", async () => {
  for (const f of [mockUpdate(null), mockUpdate(null, { code: "42501" }), mockUpdate(null, null, "user-b")]) {
    await assert.rejects(updateContactStage(f.sb, { cliente: opp, action: "ganado" }, "user-a"));
  }
});

test("blank stage is Lead only without meetings", () => {
  assert.equal(contactBucket({ etapa_actual: null, tiene_reuniones: false, ultima_reunion: null }), "leads");
  assert.equal(contactBucket({ etapa_actual: " ", tiene_reuniones: true }), "oportunidades");
  assert.equal(contactBucket({ etapa_actual: null, ultima_reunion: "2026-10-13" }), "oportunidades");
  assert.equal(contactBucket({ etapa_actual: null, tiene_reuniones: false, ultima_reunion: "2026-10-13" }), "leads");
});

test("stage ordering matches copilot contract exactly", () => {
  assert.deepEqual(STAGES, ["Lead", "Primer contacto", "Interesado - evaluando", "Información pendiente",
    "Demo agendada", "Demo realizada", "Negociación", "Esperando decisión", "En pausa", "Ganado", "Perdido", "Descartado"]);
  assert.deepEqual(orderStageCounts([...STAGES].reverse().map((name) => ({ name }))).map((v) => v.name), STAGES);
});

test("Frío incoming temperature writes canonical Frio", () => {
  assert.equal(stagePatch({ cliente: c, action: "interesado", temperatura: "Frío" } as unknown as ContactStageInput).temperatura_actual, "Frio");
});

test("loss reason fallback uses only last meeting and only Perdido", () => {
  const lost = { ...c, etapa_actual: "Perdido", motivo_perdida: " ", objeciones_ultima_reunion: "Presupuesto limitado" };
  assert.equal(lossReason(lost), "Presupuesto limitado (según última reunión)");
  assert.equal(lossReason({ ...lost, motivo_perdida: "Razón explícita" }), "Razón explícita");
  assert.equal(lossReason({ ...lost, etapa_actual: "Descartado" }), null);
  assert.equal(lossReason({ ...lost, objeciones_ultima_reunion: null }), null);
});
