import type { Cliente, Temperatura } from "./types";
import { todayLima } from "./format";

export const OPPORTUNITY_STAGES = ["Interesado", "Demo", "Cotización", "Negociación"] as const;
export const STAGES = ["Lead", ...OPPORTUNITY_STAGES, "Ganado", "Perdido", "Descartado"] as const;
export type ContactBucket = "leads" | "oportunidades" | "clientes" | "cerrados" | "otros";

export function normalizeStage(raw: string | null | undefined): string {
  const stage = raw?.trim();
  if (!stage) return "Sin etapa";
  if (/^prospecto(?: apollo)?$/i.test(stage)) return "Lead";
  return STAGES.find((s) => s.toLocaleLowerCase("es") === stage.toLocaleLowerCase("es")) ?? stage;
}

export function contactBucket(c: Pick<Cliente, "etapa_actual">): ContactBucket {
  const stage = normalizeStage(c.etapa_actual);
  if (stage === "Lead") return "leads";
  if ((OPPORTUNITY_STAGES as readonly string[]).includes(stage)) return "oportunidades";
  if (stage === "Ganado") return "clientes";
  if (stage === "Perdido" || stage === "Descartado") return "cerrados";
  return "otros";
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
    if (!["Frio", "Tibio", "Caliente"].includes(input.temperatura)) {
      throw new Error("Elige una temperatura para registrar el interés.");
    }
    return { etapa_actual: "Interesado", temperatura_actual: input.temperatura };
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
