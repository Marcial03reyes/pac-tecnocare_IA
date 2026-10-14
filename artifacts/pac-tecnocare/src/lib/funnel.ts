import type { Cliente } from "./types";
import { contactBucket, normalizeStage, OPPORTUNITY_STAGES } from "./contact-stages";
import { normalizarTemp } from "./temperatura";

export type FunnelColumn = "lead" | "negotiation" | "won";
export type FunnelGroup = FunnelColumn | "closed";
export const NEGOTIATION_STAGES = OPPORTUNITY_STAGES;
export function negotiationStageKey(cliente: Cliente): string {
  const stage = normalizeStage(cliente.etapa_actual);
  return (NEGOTIATION_STAGES as readonly string[]).includes(stage) ? stage : "other";
}

export function groupNegotiation(clientes: readonly Cliente[]) {
  const sorted = [...clientes].filter((c) => funnelColumn(c) === "negotiation").sort(compareNegotiation);
  return [...NEGOTIATION_STAGES, "other"].map((key) => ({
    key, label: key === "other" ? "Otras etapas" : key,
    contacts: sorted.filter((c) => negotiationStageKey(c) === key),
  })).filter((group) => group.contacts.length > 0);
}

const searchText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
export function filterFunnel(clientes: readonly Cliente[], query: string): Cliente[] {
  const term = searchText(query);
  return clientes.filter((c) => !term || searchText(`${c.nombre ?? ""} ${c.institucion ?? ""}`).includes(term));
}

/** Calendar dates in Lima; missing dates must not be guessed from unrelated timestamps. */
export function recentWon(clientes: readonly Cliente[], now = new Date()): Cliente[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const end = Date.parse(`${today}T00:00:00Z`);
  const start = end - 90 * 86_400_000;
  return clientes.filter((c) => {
    if (funnelColumn(c) !== "won" || !c.fecha_cierre) return false;
    const raw = c.fecha_cierre.trim();
    let day = raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const instant = new Date(raw);
      if (!Number.isFinite(instant.getTime())) return false;
      day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(instant);
    }
    const timestamp = Date.parse(`${day}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day &&
      timestamp >= start && timestamp <= end;
  }).sort((a, b) => String(b.fecha_cierre).localeCompare(String(a.fecha_cierre)));
}
export type FunnelMove =
  | { kind: "noop" }
  | { kind: "blocked"; message: string }
  | { kind: "move"; patch: Partial<Cliente>; needsTemperature: boolean; needsConfirmation: boolean };

/** Presentation grouping only: never replaces the copilot's detailed stages. */
export function funnelColumn(cliente: Cliente): FunnelGroup {
  const bucket = contactBucket(cliente);
  return bucket === "leads" ? "lead" : bucket === "clientes" ? "won" : bucket === "cerrados" ? "closed" : "negotiation";
}

function contactDate(cliente: Cliente): number {
  const date = cliente.proximo_contacto_fecha ? Date.parse(cliente.proximo_contacto_fecha) : NaN;
  return Number.isFinite(date) ? date : Infinity;
}

export function compareNegotiation(a: Cliente, b: Cliente): number {
  const hot = (c: Cliente) => normalizarTemp(c.temperatura_actual) === "Caliente" ? 0 : 1;
  return hot(a) - hot(b) ||
    (contactDate(a) === contactDate(b) ? 0 : contactDate(a) - contactDate(b)) ||
    (a.nombre ?? "").localeCompare(b.nombre ?? "", "es") ||
    String(a.id).localeCompare(String(b.id));
}

export function groupFunnel(clientes: readonly Cliente[]): Record<FunnelGroup, Cliente[]> {
  const groups: Record<FunnelGroup, Cliente[]> = { lead: [], negotiation: [], won: [], closed: [] };
  for (const cliente of clientes) groups[funnelColumn(cliente)].push(cliente);
  groups.negotiation.sort(compareNegotiation);
  return groups;
}

export function funnelMove(cliente: Cliente, target: FunnelColumn, targetStage?: string): FunnelMove {
  const source = funnelColumn(cliente);
  if (targetStage && (target !== "negotiation" || !(NEGOTIATION_STAGES as readonly string[]).includes(targetStage))) {
    return { kind: "blocked", message: "Esta agrupación no es una etapa editable." };
  }
  if (source === "negotiation" && target === "negotiation" && targetStage) {
    return normalizeStage(cliente.etapa_actual) === targetStage ? { kind: "noop" } : {
      kind: "move", patch: { etapa_actual: targetStage }, needsTemperature: false, needsConfirmation: false,
    };
  }
  if (source === target) return { kind: "noop" };
  if (source === "closed") return { kind: "blocked", message: "Edita el contacto para reabrir un cerrado." };
  if (source === "lead" && target === "won") {
    return { kind: "blocked", message: "Primero mueve el lead a Negociación y elige su temperatura." };
  }
  const stage = target === "lead" ? "Lead" : target === "won" ? "Ganado" :
    source === "lead" ? "Interesado - evaluando" : targetStage ?? "Interesado - evaluando";
  return {
    kind: "move",
    patch: { etapa_actual: stage },
    needsTemperature: target === "negotiation" && (source === "lead" || normalizarTemp(cliente.temperatura_actual) === "Sin dato"),
    needsConfirmation: source === "won" || target === "won",
  };
}

export function funnelLoss(cliente: Cliente, reason: string): Partial<Cliente> {
  const group = funnelColumn(cliente);
  if (group === "closed") throw new Error("Este contacto ya está cerrado.");
  if (!reason.trim()) throw new Error("Escribe el motivo antes de continuar.");
  return { etapa_actual: group === "lead" ? "Descartado" : "Perdido", motivo_perdida: reason.trim() };
}
