import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contactPatch, saveContact, saveManualMeeting, deleteContact } from "../src/lib/crm-writes";
import { phoneDigits, whatsappUrl, emailUrl } from "../src/lib/direct-contact";
import type { Cliente } from "../src/lib/types";
import { todayLima } from "../src/lib/format";

const c: Cliente = { id: 123, nombre: "Contacto", institucion: null, especialidad: null, telefono: null, email: null, created_at: null,
  etapa_actual: "Lead", temperatura_actual: null, ultima_reunion: null, origen: null, motivo_perdida: null, fecha_cierre: null, proximo_contacto_fecha: null, proximo_contacto_motivo: null };

function mockDb(failUpdate = false, failMeetingsDelete = false, failContactDelete = false) {
  const calls: { table: string; verb: string; payload?: unknown; filters: unknown[] }[] = [];
  let insertCount = 0;
  const sb = { from(table: string) {
    const call = { table, verb: "", payload: undefined as unknown, filters: [] as unknown[] };
    const result = () => {
      if (call.verb === "insert") return { data: table === "reuniones" ? { id: 456 } : { ...c, ...(call.payload as object) }, error: null };
      if (call.verb === "delete") return { data: [{ id: 123 }], error: table === "reuniones" ? failMeetingsDelete ? { message: "denied" } : null : failContactDelete ? { message: "denied" } : null };
      return { data: failUpdate ? null : { ...c, ...(call.payload as object) }, error: failUpdate ? { message: "denied" } : null };
    };
    const chain = {
      insert(payload: unknown) { call.verb = "insert"; call.payload = payload; insertCount++; calls.push(call); return chain; },
      update(payload: unknown) { call.verb = "update"; call.payload = payload; calls.push(call); return chain; },
      delete() { call.verb = "delete"; calls.push(call); return chain; },
      eq(key: string, value: unknown) { call.filters.push([key, value]); return chain; },
      is(key: string, value: unknown) { call.filters.push([key, value]); return chain; },
      select() { return chain; }, single() { return Promise.resolve(result()); }, maybeSingle() { return Promise.resolve(result()); },
      then(resolve: (v: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
    };
    return chain;
  } } as unknown as SupabaseClient;
  return { sb, calls, get insertCount() { return insertCount; } };
}

test("contact sanitization never writes id/enriched/creation fields; explicit blanks clear optional fields", () => {
  assert.deepEqual(contactPatch({ nombre: " Ana ", id: "changed", tiene_reuniones: false, created_at: "bad", institucion: " ", temperatura_actual: "Frío" }), { nombre: "Ana", institucion: null, temperatura_actual: "Frio" });
  assert.throws(() => contactPatch({ nombre: " " }), /nombre/);
  assert.throws(() => contactPatch({ etapa_actual: "wrong" }, c), /etapa/);
  assert.throws(() => contactPatch({ origen: "wrong" }, c), /origen/);
});
test("closing/reopening stages maintains closing date and loss requirement", () => {
  assert.deepEqual(contactPatch({ etapa_actual: "Ganado" }, c), { etapa_actual: "Ganado", fecha_cierre: todayLima(), motivo_perdida: null });
  assert.throws(() => contactPatch({ etapa_actual: "Perdido" }, c), /motivo/);
  assert.equal(contactPatch({ etapa_actual: "Perdido", motivo_perdida: "Costo" }, c).motivo_perdida, "Costo");
  assert.equal(contactPatch({ etapa_actual: "Lead" }, { ...c, etapa_actual: "Ganado", fecha_cierre: todayLima() }).fecha_cierre, null);
});
test("contact creation and edit use existing clientes only and compare original stage", async () => {
  const db = mockDb();
  const created = await saveContact(db.sb, { nombre: "Ana", etapa_actual: "Lead", origen: "Web" });
  assert.equal(created.nombre, "Ana");
  await saveContact(db.sb, { telefono: "999123456" }, c);
  assert.deepEqual(db.calls[1].filters, [["id", 123], ["etapa_actual", "Lead"]]);
  assert.deepEqual(db.calls[1].payload, { telefono: "999123456" });
});
test("manual meeting writes Manual origin and synchronizes contact with optional followup", async () => {
  const db = mockDb();
  const r = await saveManualMeeting(db.sb, { cliente: c, reunion: { fecha_reunion: "2026-10-13T15:00:00Z", etapa: "Demo agendada", temperatura: "Frío", transcripcion_resumen: " resumen " }, followup: { fecha: "2026-10-16", motivo: "Confirmar demo" } });
  assert.equal(r.syncError, null);
  assert.equal(db.calls[0].table, "reuniones");
  assert.equal((db.calls[0].payload as { origen_audio: string }).origen_audio, "Manual");
  assert.equal((db.calls[0].payload as { temperatura: string }).temperatura, "Frio");
  assert.equal((db.calls[1].payload as Partial<Cliente>).proximo_contacto_motivo, "Confirmar demo");
});
test("manual partial save is explicit and retry cannot insert a second meeting", async () => {
  const db = mockDb(true);
  const input = { cliente: c, reunion: { fecha_reunion: "2026-10-13T15:00:00Z", etapa: "Primer contacto", temperatura: "Tibio" } };
  const first = await saveManualMeeting(db.sb, input);
  assert.equal(first.id, 456); assert.match(first.syncError!, /guardada.*no se actualizó/);
  await saveManualMeeting(db.sb, { ...input, savedId: first.id });
  assert.equal(db.insertCount, 1);
});
test("invalid manual meeting never inserts", async () => {
  const db = mockDb();
  await assert.rejects(saveManualMeeting(db.sb, { cliente: c, reunion: { fecha_reunion: "bad", etapa: "Lead", temperatura: "Frio" } }), /fecha/);
  await assert.rejects(saveManualMeeting(db.sb, { cliente: c, reunion: { fecha_reunion: "2026-10-13", etapa: "Perdido", temperatura: "Frio" } }), /motivo/);
  assert.equal(db.insertCount, 0);
});
test("delete removes meetings then contact and reports either failure, never fake success", async () => {
  const db = mockDb(); await deleteContact(db.sb, c);
  assert.deepEqual(db.calls.map((call) => call.table), ["reuniones", "clientes"]);
  const denied = mockDb(false, true); await assert.rejects(deleteContact(denied.sb, c), /No se pudieron borrar las reuniones/);
  assert.equal(denied.calls.length, 1);
  const partial = mockDb(false, false, true); await assert.rejects(deleteContact(partial.sb, c), /no se pudo eliminar el contacto/);
});
test("contact composers normalize Peru numbers and safely encode exact subject/draft", () => {
  assert.equal(phoneDigits("+51 999-123-456"), "51999123456");
  assert.equal(phoneDigits("999123456"), "51999123456");
  assert.equal(whatsappUrl(null, "Hola"), null);
  const wa = new URL(whatsappUrl("999123456", "Hola & confirmación\nmañana")!);
  assert.equal(wa.pathname, "/51999123456");
  assert.equal(wa.searchParams.get("text"), "Hola & confirmación\nmañana");
  const mail = new URL(emailUrl("a@example.com", "Demo mañana & acuerdos")!);
  assert.equal(mail.searchParams.get("subject"), "TECNOCARE – seguimiento");
  assert.equal(mail.searchParams.get("body"), "Demo mañana & acuerdos");
});
