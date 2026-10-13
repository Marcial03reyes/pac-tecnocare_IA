import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cliente, Reunion } from "./types";
import { STAGES, normalizeStage } from "./contact-stages";
import { normalizarTemp } from "./temperatura";
import { todayLima } from "./format";

export const ORIGINS = ["Apollo", "Evento", "Referido", "Web", "Otro"] as const;
const EDITABLE = ["nombre", "institucion", "especialidad", "telefono", "email", "origen", "etapa_actual",
  "temperatura_actual", "proximo_contacto_fecha", "proximo_contacto_motivo", "ultima_reunion", "motivo_perdida", "fecha_cierre"] as const;

export function contactPatch(input: Partial<Cliente>, previous?: Cliente): Partial<Cliente> {
  const patch: Partial<Cliente> = {};
  for (const field of EDITABLE) if (field in input) Object.assign(patch, { [field]: typeof input[field] === "string" ? input[field]!.trim() || null : input[field] });
  if ("nombre" in patch && !patch.nombre) throw new Error("El nombre es obligatorio.");
  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) throw new Error("El correo no es válido.");
  if (patch.origen && !(ORIGINS as readonly string[]).includes(patch.origen) && patch.origen !== previous?.origen) throw new Error("Selecciona un origen válido.");
  for (const field of ["proximo_contacto_fecha", "ultima_reunion", "fecha_cierre"] as const) {
    if (patch[field] && !Number.isFinite(Date.parse(patch[field]!))) throw new Error("Indica una fecha válida.");
  }
  if (patch.etapa_actual) {
    const stage = normalizeStage(patch.etapa_actual);
    // An unchanged legacy value remains editable without silently rewriting it.
    if (!(STAGES as readonly string[]).includes(stage) && patch.etapa_actual !== previous?.etapa_actual) throw new Error("Selecciona una etapa válida.");
    patch.etapa_actual = stage;
    if (["Ganado", "Perdido", "Descartado"].includes(stage) && normalizeStage(previous?.etapa_actual) !== stage) {
      patch.fecha_cierre = patch.fecha_cierre || todayLima();
      if (stage === "Ganado") patch.motivo_perdida = null;
    } else if (previous && ["Ganado", "Perdido", "Descartado"].includes(normalizeStage(previous.etapa_actual)) && !["Ganado", "Perdido", "Descartado"].includes(stage)) {
      patch.fecha_cierre = null;
      patch.motivo_perdida = null;
    }
    if (stage === "Perdido" && normalizeStage(previous?.etapa_actual) !== stage && !(patch.motivo_perdida ?? previous?.motivo_perdida)?.trim()) throw new Error("Escribe el motivo de pérdida.");
  }
  if (patch.temperatura_actual) {
    const temperature = normalizarTemp(patch.temperatura_actual);
    if (temperature === "Sin dato") throw new Error("Selecciona Frio, Tibio o Caliente.");
    patch.temperatura_actual = temperature;
  }
  return patch;
}

export async function verifyWriter(sb: SupabaseClient, userId: string) {
  const { data, error } = await sb.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error("La sesión cambió o expiró. Vuelve a ingresar.");
}

export async function saveContact(sb: SupabaseClient, patch: Partial<Cliente>, previous?: Cliente): Promise<Cliente> {
  const values = contactPatch(patch, previous);
  if (!previous && !values.nombre) throw new Error("El nombre es obligatorio.");
  if (!previous) {
    const { data, error } = await sb.from("clientes").insert(values).select("*").single();
    if (error || !data) throw new Error("No se pudo crear el contacto. Revisa tu conexión y los permisos de Supabase.");
    return data as Cliente;
  }
  let request = sb.from("clientes").update(values).eq("id", previous.id);
  request = previous.etapa_actual == null ? request.is("etapa_actual", null) : request.eq("etapa_actual", previous.etapa_actual);
  const { data, error } = await request.select("*").maybeSingle();
  if (error) throw new Error("No se pudieron guardar los cambios. Revisa tu conexión y los permisos de Supabase.");
  if (!data) throw new Error("El contacto cambió o ya no está disponible. Actualiza antes de guardar.");
  return data as Cliente;
}

export async function deleteContact(sb: SupabaseClient, c: Cliente): Promise<void> {
  // Use existing tables only, including installations without FK ON DELETE CASCADE.
  const { error: meetingError } = await sb.from("reuniones").delete().eq("cliente_id", c.id);
  if (meetingError) throw new Error("No se pudieron borrar las reuniones. No se eliminó el contacto.");
  const { data, error } = await sb.from("clientes").delete().eq("id", c.id).select("id");
  if (error || !data?.length) throw new Error("Las reuniones se borraron, pero no se pudo eliminar el contacto. Revisa los permisos y vuelve a intentar.");
}

export interface ManualMeetingInput {
  cliente: Cliente;
  reunion: Partial<Reunion>;
  followup?: { fecha: string; motivo: string };
  motivoPerdida?: string;
  savedId?: Reunion["id"];
}
export interface ManualMeetingResult { id: Reunion["id"]; syncError: string | null }

export async function saveManualMeeting(sb: SupabaseClient, input: ManualMeetingInput): Promise<ManualMeetingResult> {
  const r = input.reunion;
  if (!r.fecha_reunion || !Number.isFinite(Date.parse(r.fecha_reunion))) throw new Error("Indica una fecha de reunión válida.");
  if (!(STAGES as readonly string[]).includes(r.etapa ?? "")) throw new Error("Selecciona la etapa de la reunión.");
  const temp = normalizarTemp(r.temperatura);
  if (temp === "Sin dato") throw new Error("Selecciona la temperatura de la reunión.");
  const patch = contactPatch({
    ultima_reunion: r.fecha_reunion, etapa_actual: r.etapa, temperatura_actual: temp,
    ...(input.motivoPerdida ? { motivo_perdida: input.motivoPerdida } : {}),
    ...(input.followup ? { proximo_contacto_fecha: input.followup.fecha, proximo_contacto_motivo: input.followup.motivo } : {}),
  }, input.cliente);
  let id = input.savedId;
  if (id == null) {
    const { data, error } = await sb.from("reuniones").insert({
      cliente_id: input.cliente.id, origen_audio: "Manual", fecha_reunion: r.fecha_reunion,
      etapa: r.etapa, temperatura: temp, transcripcion_resumen: r.transcripcion_resumen?.trim() || null,
      objeciones_detectadas: r.objeciones_detectadas?.trim() || null,
      acuerdos_proximo_paso: r.acuerdos_proximo_paso?.trim() || null,
      borrador_whatsapp: r.borrador_whatsapp?.trim() || null,
      proximo_contacto_fecha: input.followup?.fecha || null,
    }).select("id").single();
    if (error || !data) throw new Error("No se pudo registrar la reunión. No se actualizó el contacto.");
    id = data.id;
  }
  try {
    await saveContact(sb, patch, input.cliente);
    return { id: id!, syncError: null };
  } catch (error) {
    return { id: id!, syncError: `La reunión está guardada, pero el contacto no se actualizó. ${error instanceof Error ? error.message : "Revisa la conexión."} Reintenta la actualización sin duplicar la reunión.` };
  }
}
