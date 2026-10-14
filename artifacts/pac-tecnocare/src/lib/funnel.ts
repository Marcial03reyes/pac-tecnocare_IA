import type { Cliente } from "./types";
import { contactBucket } from "./contact-stages";
import { normalizarTemp } from "./temperatura";

export type FunnelColumn = "lead" | "negotiation" | "won";
export type FunnelGroup = FunnelColumn | "closed";
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

export function funnelMove(cliente: Cliente, target: FunnelColumn): FunnelMove {
  const source = funnelColumn(cliente);
  if (source === target) return { kind: "noop" };
  if (source === "closed") return { kind: "blocked", message: "Edita el contacto para reabrir un cerrado." };
  if (source === "lead" && target === "won") {
    return { kind: "blocked", message: "Primero mueve el lead a Negociación y elige su temperatura." };
  }
  const stage = target === "lead" ? "Lead" : target === "won" ? "Ganado" : "Interesado - evaluando";
  return {
    kind: "move",
    patch: { etapa_actual: stage },
    needsTemperature: target === "negotiation" && (source === "lead" || normalizarTemp(cliente.temperatura_actual) === "Sin dato"),
    needsConfirmation: source === "won" || target === "won",
  };
}

export function funnelLoss(cliente: Cliente, reason: string): Partial<Cliente> {
  const group = funnelColumn(cliente);
  if (group !== "lead" && group !== "negotiation") throw new Error("Solo puedes cerrar leads u oportunidades desde el embudo.");
  if (!reason.trim()) throw new Error("Escribe el motivo antes de continuar.");
  return { etapa_actual: group === "lead" ? "Descartado" : "Perdido", motivo_perdida: reason.trim() };
}
