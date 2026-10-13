import { useState } from "react";
import { TempBadge } from "@/components/temp";
import { formatFecha, relativeDay, textoOGuion } from "@/lib/format";
import type { Cliente } from "@/lib/types";
import { DirectContactActions } from "./direct-contact-actions";
import { MeetingForm } from "./meeting-form";
import { ClienteDetalle } from "./cliente-detalle";

export function LlamadaRow({ c, today, borrador, draftUnavailable }: { c: Cliente; today: string; borrador?: string | null; draftUnavailable?: boolean }) {
  const [register, setRegister] = useState(false);
  const [detail, setDetail] = useState(false);
  const rel = relativeDay(c.proximo_contacto_fecha, today);
  const isToday = c.proximo_contacto_fecha?.slice(0, 10) === today;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F7F9FD]" data-testid={`row-llamada-${c.id}`}>
      <div className={`w-20 shrink-0 text-xs ${isToday ? "font-bold text-[#F28C28]" : "text-muted-foreground"}`}>
        <p>{rel}</p><p className="text-[10px] font-normal text-muted-foreground">{formatFecha(c.proximo_contacto_fecha)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#14213D]"><button onClick={() => setDetail(true)} className="text-left hover:underline">{textoOGuion(c.nombre, "Sin nombre")}</button> <span className="ml-1 align-middle"><TempBadge value={c.temperatura_actual} /></span></p>
        <p className="truncate text-xs text-muted-foreground">{[c.institucion, textoOGuion(c.proximo_contacto_motivo, "Sin motivo registrado")].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="w-full sm:w-auto"><DirectContactActions cliente={c} borrador={borrador} disabled={draftUnavailable} onRegister={() => setRegister(true)} /></div>
      {register && <MeetingForm cliente={c} onClose={() => setRegister(false)} />}
      {detail && <ClienteDetalle cliente={c} onClose={() => setDetail(false)} />}
    </li>
  );
}
