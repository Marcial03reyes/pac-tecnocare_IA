import type { Reunion } from "./types";

type PlainObject = Record<string, unknown>;
const isObject = (value: unknown): value is PlainObject => !!value && typeof value === "object" && !Array.isArray(value);

function analysisObject(value: unknown): PlainObject | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isObject(value) ? value : null;
}

function meaningful(value: unknown): boolean {
  if (value == null || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(meaningful);
  if (isObject(value)) return Object.values(value).some(meaningful);
  return true;
}

function pick(analysis: PlainObject | null, record: PlainObject, keys: string[], flat: unknown): unknown {
  for (const key of keys) {
    const value = analysis?.[key];
    if (meaningful(value)) return value;
  }
  for (const key of keys) {
    const flatValue = record[key];
    if (meaningful(flatValue)) return flatValue;
  }
  return meaningful(flat) ? flat : null;
}

export function detailText(value: unknown): string {
  if (value == null || value === false) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Sí" : "";
  if (Array.isArray(value)) return value.map(detailText).filter(Boolean).map((item) => `• ${item}`).join("\n");
  if (isObject(value)) return Object.entries(value).filter(([, item]) => meaningful(item))
    .map(([key, item]) => `${key.replace(/_/g, " ")}: ${detailText(item)}`).join("\n");
  return "";
}

export function meetingDetail(r: Reunion): {
  resumen: unknown;
  objeciones: unknown;
  acuerdos: unknown;
  recomendacion: unknown;
  demo: unknown;
  borrador: unknown;
  etapa: unknown;
  temperatura: unknown;
} {
  const record = r as unknown as PlainObject;
  const analysis = analysisObject(r.analisis);
  let demo = analysis?.demo ?? record.demo ?? null;
  if (typeof demo === "string") {
    try {
      const parsed: unknown = JSON.parse(demo);
      if (isObject(parsed)) demo = parsed;
    } catch {
      // Keep a meaningful flat demo string as displayable detail.
    }
  }
  if (!meaningful(demo)) {
    const flatDemo = Object.fromEntries(["dia", "hora", "lugar", "fecha", "falta_confirmar"]
      .map((key) => [key, analysis?.[`demo_${key}`] ?? record[`demo_${key}`]])
      .filter(([, value]) => meaningful(value)));
    demo = Object.keys(flatDemo).length ? flatDemo : null;
  }
  return {
    resumen: pick(analysis, record, ["resumen"], r.transcripcion_resumen),
    objeciones: pick(analysis, record, ["objeciones", "objeciones_detectadas"], r.objeciones_detectadas),
    acuerdos: pick(analysis, record, ["acuerdos", "acuerdos_proximo_paso"], r.acuerdos_proximo_paso),
    recomendacion: pick(analysis, record, ["recomendacion", "recommendation"], null),
    demo,
    borrador: pick(analysis, record, ["borrador_whatsapp", "borrador"], r.borrador_whatsapp),
    etapa: pick(analysis, record, ["etapa", "etapa_actual"], r.etapa),
    temperatura: pick(analysis, record, ["temperatura", "temperatura_actual"], r.temperatura),
  };
}
