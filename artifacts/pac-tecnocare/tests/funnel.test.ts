import test from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "../src/lib/contact-stages";
import { compareNegotiation, funnelColumn, funnelLoss, funnelMove, groupFunnel } from "../src/lib/funnel";
import { contactPatch } from "../src/lib/crm-writes";
import type { Cliente } from "../src/lib/types";

const c = (stage: string | null, patch: Partial<Cliente> = {}) => ({
  id: "test", nombre: "Contacto ficticio", etapa_actual: stage, temperatura_actual: null,
  ultima_reunion: null, proximo_contacto_fecha: null, ...patch,
}) as Cliente;

test("all exact copilot stages group into three columns, with only lost/discarded closed", () => {
  for (const stage of STAGES) assert.equal(funnelColumn(c(stage)),
    stage === "Lead" ? "lead" : stage === "Ganado" ? "won" : ["Perdido", "Descartado"].includes(stage) ? "closed" : "negotiation");
  assert.equal(funnelColumn(c(null)), "lead");
  assert.equal(funnelColumn(c(" ", { tiene_reuniones: false })), "lead");
  assert.equal(funnelColumn(c(null, { tiene_reuniones: true })), "negotiation");
  assert.equal(funnelColumn(c(null, { ultima_reunion: "2026-10-14T10:00:00-05:00" })), "negotiation");
  assert.equal(funnelColumn(c("Etapa externa futura")), "negotiation");
});

test("negotiation prioritizes hot then nearest date, without incorrectly prioritizing warm over cold", () => {
  const rows = [
    c("En pausa", { id: "missing", temperatura_actual: "Caliente" }),
    c("Demo agendada", { id: "hot", temperatura_actual: "Caliente", proximo_contacto_fecha: "2026-11-10" }),
    c("Negociación", { id: "warm", temperatura_actual: "Tibio", proximo_contacto_fecha: "2026-10-20" }),
    c("Primer contacto", { id: "cold", temperatura_actual: "Frío", proximo_contacto_fecha: "2026-10-15" }),
    c("Información pendiente", { id: "invalid", proximo_contacto_fecha: "bad-date" }),
  ];
  assert.deepEqual(groupFunnel(rows).negotiation.map((row) => row.id), ["hot", "missing", "cold", "warm", "invalid"]);
  assert.equal(Number.isNaN(compareNegotiation(c("Negociación"), c("Negociación"))), false);
});

test("grouping is read-only, retains detailed stages, and excludes closed from visible counts", () => {
  const rows = [c("Demo realizada"), c("Perdido"), c("Descartado"), c("Ganado"), c("Lead")];
  const before = structuredClone(rows);
  const grouped = groupFunnel(rows);
  assert.deepEqual(rows, before);
  assert.equal(grouped.closed.length, 2);
  assert.equal(grouped.negotiation[0].etapa_actual, "Demo realizada");
  assert.equal(grouped.lead.length + grouped.negotiation.length + grouped.won.length, 3);
});

test("lead interest requires an explicit temperature, even if a lead already has one", () => {
  const move = funnelMove(c("Lead", { temperatura_actual: "Caliente" }), "negotiation");
  assert.equal(move.kind, "move");
  if (move.kind === "move") {
    assert.equal(move.needsTemperature, true);
    assert.equal(move.patch.etapa_actual, "Interesado - evaluando");
    assert.equal(move.patch.temperatura_actual, undefined);
  }
  assert.equal(funnelMove(c("Lead"), "won").kind, "blocked");
});

test("all active same-column moves are no-ops and never collapse granular stages", () => {
  for (const stage of ["Demo agendada", "Negociación", "En pausa", "Etapa desconocida"]) {
    assert.deepEqual(funnelMove(c(stage), "negotiation"), { kind: "noop" });
  }
});

test("winning and every move out of won require confirmation; reopening clears closing fields through existing writer", () => {
  const win = funnelMove(c("Demo realizada"), "won");
  assert.equal(win.kind, "move");
  if (win.kind === "move") { assert.equal(win.needsConfirmation, true); assert.equal(win.patch.etapa_actual, "Ganado"); }
  for (const target of ["lead", "negotiation"] as const) {
    const original = c("Ganado", { temperatura_actual: "Tibio", fecha_cierre: "2026-10-14" });
    const reopen = funnelMove(original, target);
    assert.equal(reopen.kind, "move");
    if (reopen.kind === "move") {
      assert.equal(reopen.needsConfirmation, true);
      assert.equal(contactPatch(reopen.patch, original).fecha_cierre, null);
      assert.equal(reopen.needsTemperature, false);
    }
  }
  assert.equal(funnelMove(c("Perdido"), "negotiation").kind, "blocked");
});

test("closing always requires reason, lead becomes discarded and active becomes lost", () => {
  assert.throws(() => funnelLoss(c("Lead"), " "), /motivo/);
  assert.throws(() => funnelLoss(c("Demo agendada"), ""), /motivo/);
  assert.deepEqual(funnelLoss(c("Lead"), " No responde "), { etapa_actual: "Descartado", motivo_perdida: "No responde" });
  assert.deepEqual(funnelLoss(c("En pausa"), "Sin presupuesto"), { etapa_actual: "Perdido", motivo_perdida: "Sin presupuesto" });
  assert.throws(() => funnelLoss(c("Ganado"), "Cerrado"), /Solo/);
});
