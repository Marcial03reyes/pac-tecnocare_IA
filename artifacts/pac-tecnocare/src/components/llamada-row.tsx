import { Phone } from "lucide-react";
import { TempBadge } from "@/components/temp";
import { formatFecha, relativeDay, textoOGuion } from "@/lib/format";
import type { Cliente } from "@/lib/types";

export function LlamadaRow({ c, today }: { c: Cliente; today: string }) {
  const rel = relativeDay(c.proximo_contacto_fecha, today);
  const isToday = c.proximo_contacto_fecha?.slice(0, 10) === today;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F7F9FD]" data-testid={`row-llamada-${c.id}`}>
      <div className={`w-20 shrink-0 text-xs ${isToday ? "font-bold text-[#F28C28]" : "text-muted-foreground"}`}>
        <p>{rel}</p><p className="text-[10px] font-normal text-muted-foreground">{formatFecha(c.proximo_contacto_fecha)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#14213D]">{textoOGuion(c.nombre, "Sin nombre")} <span className="ml-1 align-middle"><TempBadge value={c.temperatura_actual} /></span></p>
        <p className="truncate text-xs text-muted-foreground">{[c.institucion, textoOGuion(c.proximo_contacto_motivo, "Sin motivo registrado")].filter(Boolean).join(" · ")}</p>
      </div>
      {c.telefono ? (
        <a href={`tel:${c.telefono.replace(/\s/g, "")}`} data-testid={`link-llamar-${c.id}`}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${isToday ? "bg-[#22A06B] text-white hover:bg-[#1B8A5B]" : "border bg-white text-[#14213D] hover:border-[#2F6FDB]"}`}>
          <Phone className="h-3.5 w-3.5" /> Llamar
        </a>
      ) : <span className="text-[11px] text-muted-foreground">Sin teléfono</span>}
    </li>
  );
}
