import { Droplets, Wind } from "lucide-react";
import type { Producto } from "./data";

/** Imagen del equipo si la tenemos; si no, una tarjeta sobria con su nombre (sin fotos inventadas). */
export function ProductVisual({ p, size = "md" }: { p: Producto; size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-72 md:h-96" : "h-40";
  if (p.imagen === "om302") {
    return <div className={`flex ${h} items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#EAF0FB] to-[#F7F9FD] p-3`}><img src={`${import.meta.env.BASE_URL}om302_hero.png`} alt={`Generador ${p.nombre}`} className="max-h-full max-w-full object-contain" /></div>;
  }
  const Icon = p.familia === "infusion" ? Droplets : Wind;
  return (
    <div className={`relative flex ${h} flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#EAF0FB] to-[#F7F9FD]`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#2F6FDB]/10" />
      <Icon className={`${size === "lg" ? "h-16 w-16" : "h-10 w-10"} text-[#2F6FDB]`} strokeWidth={1.4} />
      <p className={`${size === "lg" ? "text-2xl" : "text-base"} font-bold tracking-tight text-[#14213D]`}>{p.nombre}</p>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-[#5B6478]">{p.familia === "infusion" ? "Adria Med · Italia" : "SEDECAL · España"}</p>
    </div>
  );
}
