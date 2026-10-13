import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrFindApolloClient } from "../src/hooks/use-contact-apollo";
import { todayLima } from "../src/lib/format";
import type { ApolloLead } from "../src/lib/apollo-types";

const lead: ApolloLead = {
  id: "sample", nombre: "Centro de ejemplo", institucion: "Centro de ejemplo",
  especialidad: "Rehabilitación", ciudad: "Lima", afinidad: 92,
  ofreceOzono: true, nota: "Ejemplo para prueba",
};

function fake(options: {
  existing?: number; insertError?: { code: string }; lookupError?: { code: string };
  user?: string; sessionUser?: string; duplicateAfterInsert?: number;
} = {}) {
  let inserted = false;
  const writes: Record<string, unknown>[] = [];
  const names: unknown[] = [];
  const sb = {
    auth: {
      getUser: async () => ({ data: { user: { id: options.user ?? "user-a" } }, error: null }),
      getSession: async () => ({ data: { session: { user: { id: options.sessionUser ?? "user-a" } } }, error: null }),
    },
    from: (table: string) => {
      assert.equal(table, "clientes");
      return {
        select: (cols: string) => {
          assert.equal(cols, "id");
          return { eq: (column: string, value: unknown) => {
            assert.equal(column, "nombre"); names.push(value);
            return { limit: async (n: number) => {
              assert.equal(n, 1);
              const id = inserted ? options.duplicateAfterInsert ?? options.existing : options.existing;
              return { data: id === undefined ? [] : [{ id }], error: options.lookupError ?? null };
            } };
          } };
        },
        insert: (payload: Record<string, unknown>) => {
          writes.push(payload); inserted = true;
          return { select: () => ({ single: async () => ({ data: { id: 42 }, error: options.insertError ?? null }) }) };
        },
      };
    },
  };
  return { sb: sb as unknown as SupabaseClient, writes, names };
}

test("creates only the requested fields and schedules today in Lima", async () => {
  const f = fake();
  assert.deepEqual(await createOrFindApolloClient(f.sb, lead, "user-a"), { clienteId: 42, created: true });
  assert.deepEqual(f.writes, [{
    nombre: lead.nombre, institucion: lead.institucion, especialidad: lead.especialidad,
    temperatura_actual: "Tibio", etapa_actual: "Prospecto Apollo",
    proximo_contacto_fecha: todayLima(), proximo_contacto_motivo: "Primer contacto Apollo",
  }]);
});

test("affinity below 80 uses Frio", async () => {
  const f = fake();
  await createOrFindApolloClient(f.sb, { ...lead, afinidad: 79 }, "user-a");
  assert.equal(f.writes[0].temperatura_actual, "Frio");
});

test("affinity exactly 80 uses Tibio", async () => {
  const f = fake();
  await createOrFindApolloClient(f.sb, { ...lead, afinidad: 80 }, "user-a");
  assert.equal(f.writes[0].temperatura_actual, "Tibio");
});

test("reuses existing name without insertion", async () => {
  const f = fake({ existing: 7 });
  assert.deepEqual(await createOrFindApolloClient(f.sb, lead, "user-a"), { clienteId: 7, created: false });
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.names, [lead.nombre]);
});

test("existing unique constraint can recover a concurrent duplicate", async () => {
  const f = fake({ insertError: { code: "23505" }, duplicateAfterInsert: 99 });
  assert.deepEqual(await createOrFindApolloClient(f.sb, lead, "user-a"), { clienteId: 99, created: false });
});

test("permission failure rejects instead of showing success", async () => {
  const f = fake({ insertError: { code: "42501" } });
  await assert.rejects(createOrFindApolloClient(f.sb, lead, "user-a"), /permiso/);
});

test("auth change prevents insertion", async () => {
  for (const options of [{ user: "user-b" }, { sessionUser: "user-b" }]) {
    const f = fake(options);
    await assert.rejects(createOrFindApolloClient(f.sb, lead, "user-a"), /sesión/);
    assert.equal(f.writes.length, 0);
  }
});

test("lookup failure prevents insertion", async () => {
  const f = fake({ lookupError: { code: "42501" } });
  await assert.rejects(createOrFindApolloClient(f.sb, lead, "user-a"), /permiso/);
  assert.equal(f.writes.length, 0);
});

test("invalid lead data never reaches insert", async () => {
  const f = fake();
  await assert.rejects(createOrFindApolloClient(f.sb, { ...lead, afinidad: NaN }, "user-a"), /válidos/);
  assert.equal(f.writes.length, 0);
});
