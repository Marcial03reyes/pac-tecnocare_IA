import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PacChatProposal, PacChatReply } from "@workspace/api-zod";
import { blankToNull, ChatError, parseWrite, type WriteTool } from "./contracts";
import { getContact, type Row } from "./data";

export interface ProposalRecord {
  userId: string; tool: WriteTool; args: Record<string, unknown>; contact?: Row;
  public: PacChatProposal; expires: number; executing: boolean; canceled: boolean;
  savedMeetingId?: string | number; result?: PacChatReply;
}
const store = new Map<string, ProposalRecord>();
const labels: Record<string, string> = {
  nombre: "Nombre", institucion: "Institución", especialidad: "Especialidad", telefono: "Teléfono", email: "Correo",
  origen: "Origen", etapa_actual: "Etapa", etapa: "Etapa", temperatura_actual: "Temperatura", temperatura: "Temperatura",
  proximo_contacto_fecha: "Próximo contacto (fecha de Perú)", proximo_contacto_motivo: "Motivo del seguimiento",
  motivo_perdida: "Motivo de pérdida", fecha_reunion: "Fecha de reunión (Perú)",
  transcripcion_resumen: "Resumen", objeciones_detectadas: "Objeciones", acuerdos_proximo_paso: "Acuerdos / próximo paso",
  borrador_whatsapp: "Borrador de WhatsApp", cliente_id: "ID del contacto",
};
function sweep() { for (const [key, p] of store) if (p.expires < Date.now() && !p.executing) store.delete(key); }

export async function prepareProposal(sb: SupabaseClient, userId: string, tool: WriteTool, raw: unknown): Promise<ProposalRecord> {
  const args = parseWrite(tool, raw);
  const contact = tool === "crear_contacto" ? undefined : await getContact(sb, String(args.cliente_id));
  if (tool === "crear_contacto") {
    const { data, error } = await sb.from("clientes").select("id,nombre,institucion").ilike("nombre", String(args.nombre).replace(/[%_]/g, "\\$&")).limit(5);
    if (error) throw new ChatError(502, "No pude comprobar si el contacto ya existe.");
    if (data?.length) throw new ChatError(409, "Ya existe un contacto con ese nombre. Consulta sus datos y aclara cuál es antes de crear un duplicado.");
  }
  const fields = (tool === "actualizar_contacto" ? args.campos : args) as Record<string, unknown>;
  const desiredStage = fields.etapa_actual ?? fields.etapa;
  if (tool === "actualizar_contacto" && desiredStage === "Perdido" && !String(fields.motivo_perdida ?? contact?.motivo_perdida ?? "").trim()) {
    throw new ChatError(400, "Para actualizar a Perdido hace falta un motivo explícito. Inclúyelo sin inventar datos.");
  }
  sweep();
  if (store.size >= 1000) throw new ChatError(503, "Hay demasiadas propuestas pendientes. Intenta nuevamente más tarde.");
  // A revised proposal supersedes older unexecuted ones for the same user.
  for (const old of store.values()) if (old.userId === userId && !old.executing && !old.result && old.savedMeetingId == null) old.canceled = true;
  const id = randomBytes(24).toString("hex");
  const expires = Date.now() + 15 * 60_000;
  const display = Object.entries(fields).filter(([key]) => key !== "cliente_id").map(([key, value]) => ({
    label: labels[key] ?? key,
    value: value == null || value === "" ? "Quitar / sin dato" : key === "fecha_reunion" ? new Date(String(value)).toLocaleString("es-PE", { timeZone: "America/Lima" }) : String(value),
  }));
  if (contact) display.unshift({ label: "Contacto", value: `${contact.nombre ?? "Sin nombre"}${contact.institucion ? ` · ${contact.institucion}` : ""} (ID ${contact.id})` });
  if (tool === "crear_contacto") display.push({ label: "Etapa inicial", value: "Lead" }, { label: "Temperatura inicial", value: "Sin temperatura" });
  if (tool === "registrar_reunion") display.push({ label: "Origen", value: "Chat PAC" }, { label: "También se actualizará", value: "Última reunión, etapa, temperatura y el seguimiento indicado del contacto" });
  const proposal: ProposalRecord = {
    userId, tool, args, contact, expires, executing: false, canceled: false,
    public: { id, tool, title: tool === "crear_contacto" ? "Crear contacto" : tool === "actualizar_contacto" ? "Actualizar contacto" : "Registrar reunión", fields: display, expiresAt: new Date(expires).toISOString() },
  };
  store.set(id, proposal);
  return proposal;
}
export function ownedProposal(id: string, userId: string): ProposalRecord {
  const p = store.get(id);
  if (!p || p.userId !== userId || p.expires < Date.now()) throw new ChatError(409, "La propuesta expiró o el servidor se reinició. Revisa el contacto antes de solicitar una nueva propuesta.", "expired");
  if (p.canceled) throw new ChatError(409, "Esa propuesta fue descartada. Envía las correcciones para revisar una nueva.", "expired");
  return p;
}
export function cancelProposal(id: string, userId: string): PacChatReply {
  const p = ownedProposal(id, userId);
  if (p.executing || p.result || p.savedMeetingId != null) throw new ChatError(409, "La propuesta ya se está guardando o tiene datos guardados. Revisa el contacto antes de corregirla.");
  p.canceled = true;
  return { text: "No ejecuté esta propuesta. Indícame qué quieres corregir y prepararé un nuevo resumen para revisar." };
}
function assertSnapshot(current: Row, p: ProposalRecord) {
  if (!p.contact) return;
  const fields = p.tool === "actualizar_contacto" ? Object.keys(p.args.campos as object) : ["etapa_actual", "temperatura_actual", "ultima_reunion", "proximo_contacto_fecha", "proximo_contacto_motivo"];
  for (const field of fields) if ((current[field] ?? null) !== (p.contact[field] ?? null)) {
    throw new ChatError(409, "El contacto cambió desde que se preparó la propuesta. Consulta sus datos y revisa una nueva propuesta antes de sobrescribir cambios.");
  }
}
async function conditionalUpdate(sb: SupabaseClient, p: ProposalRecord, patch: Record<string, unknown>): Promise<void> {
  let request = sb.from("clientes").update(patch).eq("id", p.contact!.id);
  const fields = [...new Set(["etapa_actual", ...Object.keys(patch)])];
  for (const field of fields) {
    const original = p.contact![field];
    request = original == null ? request.is(field, null) : request.eq(field, original);
  }
  const { data, error } = await request.select("id").maybeSingle();
  if (error) throw new ChatError(502, "No pude actualizar el contacto. Revisa la conexión y los permisos.");
  if (!data) throw new ChatError(409, "El contacto cambió o ya no está disponible. Revisa sus datos antes de guardar.");
}
export async function executeProposal(sb: SupabaseClient, id: string, userId: string): Promise<PacChatReply> {
  const p = ownedProposal(id, userId);
  if (p.result) return p.result; // replay is idempotent for a completed confirmation
  if (p.executing) throw new ChatError(409, "Esta confirmación ya se está procesando. Espera un momento.");
  p.executing = true;
  try {
    if (p.tool === "crear_contacto") {
      const { data: duplicate, error: checkError } = await sb.from("clientes").select("id").ilike("nombre", String(p.args.nombre).replace(/[%_]/g, "\\$&")).limit(1);
      if (checkError) throw new ChatError(502, "No pude comprobar los contactos existentes. Intenta más tarde.");
      if (duplicate?.length) throw new ChatError(409, "Ahora ya existe un contacto con ese nombre. Consulta cuál es antes de crear otro.");
      const values = Object.fromEntries(Object.entries(p.args).map(([key, value]) => [key, blankToNull(value)]));
      const { data, error } = await sb.from("clientes").insert({ ...values, etapa_actual: "Lead", temperatura_actual: null }).select("id").single();
      if (error || !data) throw new ChatError(502, "No pude crear el contacto. Revisa tu conexión y tus permisos.");
      p.result = { text: "Contacto creado en Lead, sin temperatura asignada.", saved: true, contactId: String(data.id) };
      return p.result;
    }
    try {
      const current = await getContact(sb, String(p.args.cliente_id));
      assertSnapshot(current, p);
    } catch (error) {
      if (p.savedMeetingId == null) throw error;
      const retryable = !(error instanceof ChatError && [404, 409].includes(error.status));
      const reply: PacChatReply = {
        text: `La reunión ya está guardada. No pude sincronizar el contacto. ${retryable ? "Puedes reintentar sólo la actualización, sin duplicar la reunión." : "El contacto cambió o ya no está disponible; revisa el CRM antes de preparar otro cambio."}`,
        saved: false, partial: true, retryable, contactId: String(p.contact!.id),
      };
      if (!retryable) p.result = reply;
      return reply;
    }
    if (p.tool === "actualizar_contacto") {
      const patch = Object.fromEntries(Object.entries(p.args.campos as object).map(([key, value]) => [key, blankToNull(value)]));
      await conditionalUpdate(sb, p, patch);
      p.result = { text: "Cambios guardados en el contacto.", saved: true, contactId: String(p.contact!.id) };
      return p.result;
    }
    const a = p.args;
    if (p.savedMeetingId == null) {
      const values = {
        cliente_id: p.contact!.id, fecha_reunion: a.fecha_reunion, origen_audio: "Chat PAC",
        etapa: a.etapa, temperatura: a.temperatura, transcripcion_resumen: blankToNull(a.transcripcion_resumen),
        objeciones_detectadas: blankToNull(a.objeciones_detectadas ?? null),
        acuerdos_proximo_paso: blankToNull(a.acuerdos_proximo_paso ?? null), borrador_whatsapp: blankToNull(a.borrador_whatsapp),
        proximo_contacto_fecha: a.proximo_contacto_fecha ?? null,
      };
      const { data, error } = await sb.from("reuniones").insert(values).select("id").single();
      if (error || !data) throw new ChatError(502, "No pude registrar la reunión. El contacto no se actualizó.");
      p.savedMeetingId = data.id;
    }
    try {
      await conditionalUpdate(sb, p, {
        ultima_reunion: a.fecha_reunion, etapa_actual: a.etapa, temperatura_actual: a.temperatura,
        ...(Object.hasOwn(a, "proximo_contacto_fecha") ? { proximo_contacto_fecha: a.proximo_contacto_fecha } : {}),
        ...(Object.hasOwn(a, "proximo_contacto_motivo") ? { proximo_contacto_motivo: blankToNull(a.proximo_contacto_motivo) } : {}),
      });
    } catch (error) {
      const retryable = !(error instanceof ChatError && error.status === 409);
      const reply: PacChatReply = { text: `La reunión está guardada, pero el contacto no se actualizó. ${retryable ? "Puedes reintentar la actualización sin duplicar la reunión." : "El contacto cambió; revísalo y prepara una actualización separada."}`, partial: true, saved: false, retryable, contactId: String(p.contact!.id) };
      if (!retryable) p.result = reply;
      return reply;
    }
    p.result = { text: "Reunión registrada con origen Chat PAC. Actualicé la última reunión, etapa, temperatura y el seguimiento indicado.", saved: true, contactId: String(p.contact!.id) };
    return p.result;
  } finally { p.executing = false; }
}
