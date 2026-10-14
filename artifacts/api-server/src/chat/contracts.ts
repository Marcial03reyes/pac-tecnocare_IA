import { z } from "zod";

export const CHAT_STAGES = ["Primer contacto", "Interesado - evaluando", "Información pendiente", "Demo agendada", "Demo realizada", "Negociación", "Esperando decisión", "Ganado", "Perdido", "En pausa"] as const;
export const TEMPERATURES = ["Frio", "Tibio", "Caliente"] as const;
const text = z.string().max(8000);
const optionalText = text.nullable().optional();
const id = z.union([z.string().min(1).max(100), z.number().int().positive()]).transform(String);
const email = z.union([z.string().email().max(320), z.literal(""), z.null()]).optional();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, "La fecha no es válida.");
export const timestamp = z.string().max(60).transform((value, ctx) => {
  if (!date.safeParse(value.slice(0, 10)).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de reunión inválida." });
    return z.NEVER;
  }
  const full = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-05:00`
    : /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}-05:00`;
  const parsed = new Date(full);
  if (!Number.isFinite(parsed.getTime())) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha de reunión inválida." }); return z.NEVER; }
  return parsed.toISOString();
});
const temperature = z.preprocess((v) => v === "Frío" ? "Frio" : v, z.enum(TEMPERATURES));
export const searchInput = z.object({ texto: z.string().max(200) }).strict();
export const contactInput = z.object({ cliente_id: id }).strict();
export const followupsInput = z.object({ desde: date, hasta: date }).strict().refine((v) => v.desde <= v.hasta, "El rango de fechas no es válido.");
export const createInput = z.object({
  nombre: z.string().trim().min(1).max(300), institucion: optionalText, especialidad: optionalText,
  telefono: optionalText, email, origen: z.enum(["Apollo", "Evento", "Referido", "Web", "Otro"]).optional(),
}).strict();
export const updateFields = z.object({
  etapa_actual: z.enum(CHAT_STAGES).optional(), temperatura_actual: temperature.nullable().optional(),
  proximo_contacto_fecha: date.nullable().optional(), proximo_contacto_motivo: optionalText,
  telefono: optionalText, email, institucion: optionalText, especialidad: optionalText, motivo_perdida: optionalText,
}).strict().refine((v) => Object.keys(v).length > 0, "No hay cambios para guardar.");
export const updateInput = z.object({ cliente_id: id, campos: updateFields }).strict();
export const meetingInput = z.object({
  cliente_id: id, fecha_reunion: timestamp, etapa: z.enum(CHAT_STAGES), temperatura: temperature,
  transcripcion_resumen: text, objeciones_detectadas: optionalText, acuerdos_proximo_paso: optionalText,
  borrador_whatsapp: text.refine((v) => v.split("\n").length <= 5, "El borrador debe tener máximo 5 líneas."),
  proximo_contacto_fecha: date.nullable().optional(), proximo_contacto_motivo: optionalText,
}).strict();
export type WriteTool = "crear_contacto" | "actualizar_contacto" | "registrar_reunion";
export const WRITE_TOOLS: readonly string[] = ["crear_contacto", "actualizar_contacto", "registrar_reunion"];
export function parseWrite(tool: WriteTool, args: unknown): Record<string, unknown> {
  return (tool === "crear_contacto" ? createInput : tool === "actualizar_contacto" ? updateInput : meetingInput).parse(args);
}
export class ChatError extends Error {
  constructor(public status: number, message: string, public code = "chat_error") { super(message); }
}
export const blankToNull = (value: unknown): unknown => typeof value === "string" ? value.trim() || null : value;
