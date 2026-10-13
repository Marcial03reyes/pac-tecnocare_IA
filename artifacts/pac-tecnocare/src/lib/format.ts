export function todayLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function greetingLima(): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Formats a date-only (YYYY-MM-DD) or timestamp string in Spanish. */
export function formatFecha(value: string | null | undefined, withTime = false): string {
  if (!value) return "Sin fecha";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = dateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: dateOnly ? "UTC" : "America/Lima",
    day: "numeric", month: "short", year: "numeric",
    ...(withTime && !dateOnly ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function relativeDay(date: string | null, today: string): string | null {
  if (!date) return null;
  const a = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a)) return null;
  const diff = Math.round((a - b) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff < 0) return `Vencido hace ${-diff} días`;
  return `En ${diff} días`;
}

export function textoOGuion(v: string | null | undefined, fallback = "—"): string {
  const t = typeof v === "string" ? v.trim() : "";
  return t || fallback;
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network")) return "No pudimos conectar con el servidor. Revisa tu conexión a internet.";
  if (m.includes("jwt") || m.includes("401") || m.includes("permission")) return "Tu sesión no tiene permiso para ver estos datos o ha expirado.";
  if (m.includes("configurada")) return raw;
  return "Ocurrió un problema al cargar la información. Intenta nuevamente.";
}
