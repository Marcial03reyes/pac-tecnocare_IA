import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cliente } from "./types";

export type GranolaEstado = "por_asignar" | "listo" | "procesando" | "procesada" | "error" | "ignorada";
export interface GranolaNota {
  note_id: string;
  titulo: string | null;
  fecha: string | null;
  cliente_id: Cliente["id"] | null;
  estado: GranolaEstado;
  error: string | null;
}
export type GranolaAction =
  | { kind: "assign"; clienteId: Cliente["id"] }
  | { kind: "ignore" }
  | { kind: "retry" };
export const GRANOLA_COLUMNS = "note_id,titulo,fecha,cliente_id,estado,error";
export const GRANOLA_INBOX_HREF = "/panel/clientes?seccion=reuniones";

export function granolaPatch(note: GranolaNota, action: GranolaAction): { cliente_id?: Cliente["id"]; estado: "listo" | "ignorada" | "por_asignar" } {
  if (action.kind === "retry") {
    if (note.estado !== "error") throw new Error("La reunión cambió de estado. Actualiza la bandeja.");
    return { estado: note.cliente_id != null ? "listo" : "por_asignar" };
  }
  if (note.estado !== "por_asignar") throw new Error("La reunión cambió de estado. Actualiza la bandeja.");
  if (action.kind === "ignore") return { estado: "ignorada" };
  if (action.clienteId == null || String(action.clienteId).trim() === "") {
    throw new Error("Selecciona un cliente.");
  }
  return { cliente_id: action.clienteId, estado: "listo" };
}

// Compare the snapshot before writing: the synchronizer owns processing.
// Never insert/delete notes or overwrite title, date or provider error.
export async function updateGranolaNote(sb: SupabaseClient, note: GranolaNota, action: GranolaAction): Promise<GranolaNota> {
  const patch = granolaPatch(note, action);
  let query = sb.from("granola_notas").update(patch).eq("note_id", note.note_id).eq("estado", note.estado);
  query = note.cliente_id == null ? query.is("cliente_id", null) : query.eq("cliente_id", note.cliente_id);
  const { data, error } = await query.select(GRANOLA_COLUMNS).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La reunión cambió o no tienes permiso para actualizarla. Actualiza la bandeja.");
  return data as GranolaNota;
}

export function granolaDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}
