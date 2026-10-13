export type TempKey = "Caliente" | "Tibio" | "Frio" | "Sin dato";

export function normalizarTemp(t: string | null | undefined): TempKey {
  const v = (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (v === "caliente") return "Caliente";
  if (v === "tibio") return "Tibio";
  if (v === "frio") return "Frio";
  return "Sin dato";
}

export const TEMP_META: Record<TempKey, { label: string; score: number | null; bar: string; badge: string }> = {
  Caliente: { label: "Caliente", score: 90, bar: "bg-[#F28C28]", badge: "bg-[#FDEBD8] text-[#B45F0E] border-[#F9D3AC]" },
  Tibio: { label: "Tibio", score: 65, bar: "bg-[#2F6FDB]", badge: "bg-[#E4EDFB] text-[#2459B5] border-[#C9DAF6]" },
  Frio: { label: "Frío", score: 35, bar: "bg-[#A3ABBD]", badge: "bg-[#EEF0F5] text-[#5B6478] border-[#DDE1EA]" },
  "Sin dato": { label: "Sin dato", score: null, bar: "bg-transparent", badge: "bg-white text-[#8A93A6] border-dashed border-[#D5DAE4]" },
};
