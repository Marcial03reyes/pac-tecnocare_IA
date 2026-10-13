import type { Cliente, Temperatura } from "./types";
import { todayLima } from "./format";
import { normalizarTemp } from "./temperatura";

export const OPPORTUNITY_STAGES = [
  "Primer contacto", "Interesado - evaluando", "Información pendiente",
  "Demo agendada", "Demo realizada", "Negociación", "Esperando decisión", "En pausa",
] as const;
export const STAGES = ["Lead", ...OPPORTUNITY_STAGES, "Ganado", "Perdido", "Descartado"] as const;
export type ContactBucket = "leads" | "oportunidades" | "clientes" | "cerrados";

export function normalizeStage(raw: string | null | undefined): string {
  const stage = raw?.trim();
  if (!stage) return "Sin etapa";
  return STAGES.find((s) => s.toLocaleLowerCase("es") === stage.toLocaleLowerCase("es")) ?? stage;
}

export function contactBucket(c: Pick<Cliente, "etapa_actual"> & Partial<Pick<Cliente, "ultima_reunion" | "tiene_reuniones">>): ContactBucket {
  const stage = normalizeStage(c.etapa_actual);
  const hasMeetings = c.tiene_reuniones ?? Boolean(c.ultima_reunion);
  if (stage === "Lead" || (!c.etapa_actual?.trim() && !hasMeetings)) return "leads";
  if ((OPPORTUNITY_STAGES as readonly string[]).includes(stage)) return "oportunidades";
  if (stage === "Ganado") return "clientes";
  if (stage === "Perdido" || stage === "Descartado") return "cerrados";
  return "oportunidades";
}

export function lossReason(c: Pick<Cliente, "etapa_actual" | "motivo_perdida"> & Partial<Pick<Cliente, "objeciones_ultima_reunion">>): string | null {
  const explicit = c.motivo_perdida?.trim();
  if (explicit) return explicit;
  const objections = c.objeciones_ultima_reunion?.trim();
  return normalizeStage(c.etapa_actual) === "Perdido" && objections
    ? `${objections} (según última reunión)` : null;
}

export function displayStage(c: Pick<Cliente, "etapa_actual"> & Partial<Pick<Cliente, "ultima_reunion" | "tiene_reuniones">>): string {
  return contactBucket(c) === "leads" ? "Lead" : normalizeStage(c.etapa_actual);
}

export function orderStageCounts<T extends { name: string }>(groups: T[]): T[] {
  const rank = (name: string) => {
    const i = (STAGES as readonly string[]).indexOf(normalizeStage(name));
    return i < 0 ? STAGES.length : i;
  };
  return [...groups].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, "es"));
}
export type ContactStageInput =
  | { cliente: Cliente; action: "interesado"; temperatura: Temperatura }
  | { cliente: Cliente; action: "descartar"; motivo?: string }
  | { cliente: Cliente; action: "ganado" }
  | { cliente: Cliente; action: "perdido"; motivo: string }
  | { cliente: Cliente; action: "etapa"; etapa: typeof OPPORTUNITY_STAGES[number] };

/** Validate permitted transitions without rewriting existing historical records. */
export function stagePatch(input: ContactStageInput): Partial<Cliente> {
  const bucket = contactBucket(input.cliente);
  if (bucket === "leads" && input.action === "interesado") {
    const temperature = normalizarTemp(input.temperatura);
    if (temperature === "Sin dato") {
      throw new Error("Elige una temperatura para registrar el interés.");
    }
    return { etapa_actual: "Interesado - evaluando", temperatura_actual: temperature };
  }
  if (bucket === "leads" && input.action === "descartar") {
    return { etapa_actual: "Descartado", motivo_perdida: input.motivo?.trim() || null, fecha_cierre: todayLima() };
  }
  if (bucket === "oportunidades" && input.action === "ganado") {
    return { etapa_actual: "Ganado", fecha_cierre: todayLima(), motivo_perdida: null };
  }
  if (bucket === "oportunidades" && input.action === "perdido") {
    if (!input.motivo.trim()) throw new Error("Escribe el motivo de la pérdida.");
    return { etapa_actual: "Perdido", motivo_perdida: input.motivo.trim(), fecha_cierre: todayLima() };
  }
  if (bucket === "oportunidades" && input.action === "etapa" &&
      (OPPORTUNITY_STAGES as readonly string[]).includes(input.etapa)) {
    return { etapa_actual: input.etapa };
  }
  throw new Error("Esta acción no corresponde a la etapa actual del contacto.");
}
