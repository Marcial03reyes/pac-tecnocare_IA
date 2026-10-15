import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { granolaDate, granolaPatch, updateGranolaNote, type GranolaNota } from "../src/lib/granola.ts";

const pending: GranolaNota = {
  note_id: "test-note", titulo: "Reunión clínica", fecha: "2026-10-15T15:00:00Z",
  cliente_id: null, estado: "por_asignar", error: null,
};

test("assign only writes the selected client and listo; ignore only writes estado", () => {
  assert.deepEqual(granolaPatch(pending, { kind: "assign", clienteId: "c-1" }), { cliente_id: "c-1", estado: "listo" });
  assert.deepEqual(granolaPatch(pending, { kind: "ignore" }), { estado: "ignorada" });
  assert.throws(() => granolaPatch(pending, { kind: "assign", clienteId: "" }), /Selecciona/);
});

test("retry routes errors with a client to listo; unassigned errors to por_asignar", () => {
  assert.deepEqual(granolaPatch({ ...pending, estado: "error", cliente_id: 12 }, { kind: "retry" }), { estado: "listo" });
  assert.deepEqual(granolaPatch({ ...pending, estado: "error" }, { kind: "retry" }), { estado: "por_asignar" });
});

test("processing, completed and ignored notes cannot be reassigned or ignored", () => {
  for (const estado of ["listo", "procesando", "procesada", "ignorada", "error"] as const) {
    assert.throws(() => granolaPatch({ ...pending, estado }, { kind: "assign", clienteId: 1 }), /cambió/);
    assert.throws(() => granolaPatch({ ...pending, estado }, { kind: "ignore" }), /cambió/);
  }
  assert.throws(() => granolaPatch(pending, { kind: "retry" }), /cambió/);
});

function fakeDb(data: GranolaNota | null, error: unknown = null) {
  const calls: unknown[][] = [];
  const query = {
    update(patch: unknown) { calls.push(["update", patch]); return query; },
    eq(key: string, value: unknown) { calls.push(["eq", key, value]); return query; },
    is(key: string, value: unknown) { calls.push(["is", key, value]); return query; },
    select(columns: string) { calls.push(["select", columns]); return query; },
    async maybeSingle() { return { data, error }; },
  };
  return {
    calls,
    sb: { from(table: string) { calls.push(["from", table]); return query; } } as unknown as SupabaseClient,
  };
}

test("updates guard both current stage and client snapshot without inserts or deletes", async () => {
  const result = { ...pending, cliente_id: "c-1", estado: "listo" as const };
  const { calls, sb } = fakeDb(result);
  assert.deepEqual(await updateGranolaNote(sb, pending, { kind: "assign", clienteId: "c-1" }), result);
  assert.deepEqual(calls.slice(0, 5), [
    ["from", "granola_notas"], ["update", { cliente_id: "c-1", estado: "listo" }],
    ["eq", "note_id", "test-note"], ["eq", "estado", "por_asignar"], ["is", "cliente_id", null],
  ]);
  const assigned = { ...pending, cliente_id: 17, estado: "error" as const };
  const retry = fakeDb({ ...assigned, estado: "listo" });
  await updateGranolaNote(retry.sb, assigned, { kind: "retry" });
  assert.ok(retry.calls.some((call) => JSON.stringify(call) === '["eq","cliente_id",17]'));
});

test("zero updated rows and denied writes fail explicitly", async () => {
  await assert.rejects(updateGranolaNote(fakeDb(null).sb, pending, { kind: "ignore" }), /permiso/);
  await assert.rejects(updateGranolaNote(fakeDb(null, new Error("RLS denied")).sb, pending, { kind: "ignore" }), /RLS denied/);
});

test("date renders Lima time rather than browser timezone", () => {
  assert.match(granolaDate("2026-10-15T15:00:00Z"), /10:00/);
  assert.equal(granolaDate(null), "Sin fecha");
  assert.equal(granolaDate("invalid"), "Sin fecha");
});
