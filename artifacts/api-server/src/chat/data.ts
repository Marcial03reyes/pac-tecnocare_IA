import type { SupabaseClient } from "@supabase/supabase-js";
import { ChatError, searchInput, contactInput, followupsInput } from "./contracts";

export type Row = Record<string, unknown> & { id: string | number };
const SUMMARY = "id,nombre,institucion,etapa_actual,temperatura_actual,proximo_contacto_fecha";
const MEETINGS = "id,cliente_id,fecha_reunion,etapa,temperatura,transcripcion_resumen,objeciones_detectadas,acuerdos_proximo_paso,borrador_whatsapp,analisis,transcripcion";
const CLIENT = "id,nombre,institucion,especialidad,telefono,email,origen,etapa_actual,temperatura_actual,proximo_contacto_fecha,proximo_contacto_motivo,ultima_reunion,motivo_perdida,fecha_cierre";

export async function getContact(sb: SupabaseClient, id: string): Promise<Row> {
  const { data, error } = await sb.from("clientes").select(CLIENT).eq("id", id).maybeSingle();
  if (error) throw new ChatError(502, "No pude consultar el contacto. Revisa la conexión y tus permisos.");
  if (!data) throw new ChatError(404, "No encontré ese contacto entre los registros que puedes consultar.");
  return data as Row;
}
async function pages(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>, maximum = 500) {
  const out: unknown[] = [];
  for (let start = 0; start < maximum; start += 100) {
    const { data, error } = await build(start, start + 99);
    if (error) throw new ChatError(502, "No pude consultar los datos. Revisa la conexión y tus permisos.");
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 100) return { rows: out, truncated: false };
  }
  return { rows: out, truncated: true, aviso: "Resultado limitado. Refina la consulta para revisar el resto." };
}
export async function readTool(sb: SupabaseClient, name: string, args: unknown): Promise<Record<string, unknown>> {
  if (name === "buscar_contactos") {
    const { texto } = searchInput.parse(args);
    // Quote and escape the PostgREST filter value; user text cannot add OR conditions.
    const escaped = texto.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/%/g, "\\%").replace(/_/g, "\\_");
    return pages((f, t) => sb.from("clientes").select(SUMMARY)
      .or(`nombre.ilike."%${escaped}%",institucion.ilike."%${escaped}%"`).order("nombre").order("id").range(f, t));
  }
  if (name === "seguimientos") {
    const { desde, hasta } = followupsInput.parse(args);
    return pages((f, t) => sb.from("clientes").select(`${SUMMARY},telefono,email,proximo_contacto_motivo`)
      .gte("proximo_contacto_fecha", desde).lt("proximo_contacto_fecha", nextDate(hasta)).order("proximo_contacto_fecha").order("id").range(f, t));
  }
  if (name === "ver_contacto") {
    const { cliente_id } = contactInput.parse(args);
    const contact = await getContact(sb, cliente_id);
    const meetings = await pages((f, t) => sb.from("reuniones").select(MEETINGS).eq("cliente_id", cliente_id)
      .order("fecha_reunion", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(f, t), 100);
    return { contacto: contact, reuniones: meetings.rows, reuniones_limitadas: meetings.truncated };
  }
  throw new ChatError(400, "Herramienta de consulta no disponible.");
}
export function nextDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
export function limaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
