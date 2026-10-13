import { TempBadge } from "@/components/temp";
import { CopyButton } from "@/components/copy-button";
import { formatFecha, textoOGuion } from "@/lib/format";
import type { ReunionConCliente } from "@/lib/types";

export function ReunionCard({ r, compact = false }: { r: ReunionConCliente; compact?: boolean }) {
  return (
    <article className="pac-card fade-up p-4 transition hover:-translate-y-0.5" data-testid={`card-nota-${r.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#14213D]">{textoOGuion(r.cliente?.nombre, "Cliente no identificado")}</span>
        <TempBadge value={r.temperatura} />
        <span className="ml-auto text-xs text-muted-foreground">{formatFecha(r.fecha_reunion, true)}</span>
      </div>
      {r.cliente?.institucion && <p className="text-xs text-muted-foreground">{r.cliente.institucion}</p>}
      <p className={`mt-2 text-sm leading-relaxed text-[#3A4560] ${compact ? "line-clamp-2" : ""}`}>{textoOGuion(r.transcripcion_resumen, "Sin resumen")}</p>
      {!compact && (
        <>
          <div className="mt-3 rounded-md border-l-2 border-[#2F6FDB] bg-[#F4F7FD] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2F6FDB]">Acuerdos y próximo paso</p>
            <p className="mt-0.5 text-sm text-[#3A4560]">{textoOGuion(r.acuerdos_proximo_paso, "Sin acuerdos registrados")}</p>
          </div>
          <div className="mt-3 rounded-md bg-[#F4F6FB] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Borrador de WhatsApp</p>
              {r.borrador_whatsapp?.trim() && <CopyButton text={r.borrador_whatsapp} testId={`button-copiar-${r.id}`} />}
            </div>
            <p className="whitespace-pre-wrap text-sm text-[#3A4560]">{textoOGuion(r.borrador_whatsapp, "Sin borrador disponible")}</p>
          </div>
        </>
      )}
    </article>
  );
}
