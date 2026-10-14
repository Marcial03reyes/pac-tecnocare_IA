import { useState } from "react";
import { CalendarClock, ChevronDown, MessageCircle, Mic2 } from "lucide-react";
import { whatsappUrl } from "@/lib/direct-contact";
import { formatFecha } from "@/lib/format";
import { meetingDetail, detailText } from "@/lib/meeting-detail";
import { normalizarTemp } from "@/lib/temperatura";
import type { Cliente, Reunion } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function hasValue(value: unknown): boolean {
  return detailText(value).trim().length > 0 && value !== false;
}

function Detail({ label, value }: { label: string; value: unknown }) {
  if (!hasValue(value)) return null;
  return (
    <section className="border-t border-[#E8ECF3] pt-2.5">
      <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#78839A]">{label}</h4>
      <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#35435D]">{detailText(value)}</div>
    </section>
  );
}

export function MeetingCard({ reunion: r, cliente }: { reunion: Reunion; cliente: Cliente }) {
  const [expanded, setExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const detail = meetingDetail(r);
  const temperature = normalizarTemp(detailText(detail.temperatura));
  const draft = detailText(detail.borrador).trim();
  const wa = draft ? whatsappUrl(cliente.telefono, draft) : null;
  const demo = detail.demo;
  const demoEntries = demo && typeof demo === "object" && !Array.isArray(demo)
    ? Object.entries(demo as Record<string, unknown>).filter(([, value]) => hasValue(value))
    : [];
  const demoText = typeof demo === "string" ? demo.trim() : "";
  const showDemo = demoEntries.length > 0 || !!demoText;
  const transcript = r.transcripcion ?? "";

  return (
    <>
      <article className="pac-card overflow-hidden" data-testid={`card-meeting-${r.id}`}>
        <button
          type="button"
          className="flex w-full items-start gap-3 px-3.5 py-3 text-left hover:bg-[#F8FAFD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F6FDB]"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          data-testid={`button-expand-meeting-${r.id}`}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-bold text-[#14213D]">{formatFecha(r.fecha_reunion, true)}</span>
              {hasValue(detail.etapa) && <span className="rounded-full bg-[#EDF2FA] px-2 py-0.5 text-[10px] font-semibold text-[#34517B]">{detailText(detail.etapa)}</span>}
              {temperature !== "Sin dato" && <span className={`h-2 w-2 shrink-0 rounded-full ${temperature === "Caliente" ? "bg-[#F28C28]" : temperature === "Tibio" ? "bg-[#2F6FDB]" : "bg-[#9AA3B2]"}`} aria-label={`Temperatura: ${temperature}`} title={temperature} />}
            </span>
            <span className={`mt-1 block truncate text-xs text-[#67748A] ${expanded ? "max-w-full" : ""}`}>
              {hasValue(detail.resumen) ? detailText(detail.resumen).replace(/\s+/g, " ") : " "}
            </span>
          </span>
          <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-[#8792A6] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="space-y-2.5 px-3.5 pb-3.5">
            {hasValue(detail.resumen) && <Detail label="Resumen" value={detail.resumen} />}
            <Detail label="Objeciones" value={detail.objeciones} />
            <Detail label="Acuerdos y próximo paso" value={detail.acuerdos} />
            <Detail label="Recomendación" value={detail.recomendacion} />
            {showDemo && (
              <section className="border-t border-[#E8ECF3] pt-2.5">
                <h4 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A85F19]"><CalendarClock className="h-3 w-3" />Demo</h4>
                {demoText && <p className="whitespace-pre-wrap text-xs text-[#35435D]">{demoText}</p>}
                {demoEntries.length > 0 && <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {demoEntries.map(([key, value]) => <div key={key}><dt className="text-[10px] text-[#78839A]">{key.replace(/_/g, " ")}</dt><dd className="text-xs text-[#35435D]">{detailText(value)}</dd></div>)}
                </dl>}
              </section>
            )}
            <div className="space-y-2 border-t border-[#E8ECF3] pt-2.5">
              <button type="button" onClick={() => setTranscriptOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F6FDB] hover:underline" data-testid={`button-transcript-${r.id}`}>
                <Mic2 className="h-3.5 w-3.5" />Ver transcripción
              </button>
              {draft && <div className="flex min-w-0 items-start gap-1.5 text-[11px] text-[#79849A]">
                <span className="min-w-0 whitespace-pre-wrap break-words">{draft}</span>
                {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Abrir borrador en WhatsApp" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#748198] hover:bg-[#EEF3F9] hover:text-[#2F6FDB]" data-testid={`link-whatsapp-draft-${r.id}`}><MessageCircle className="h-3.5 w-3.5" /></a> : (
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="inline-flex h-6 w-6 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-[#AAB2C0]" aria-label="Agrega teléfono"><MessageCircle className="h-3.5 w-3.5" /></span></TooltipTrigger><TooltipContent>Agrega teléfono</TooltipContent></Tooltip></TooltipProvider>
                )}
              </div>}
            </div>
          </div>
        )}
      </article>
      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Transcripción de reunión</DialogTitle><DialogDescription>{formatFecha(r.fecha_reunion, true)}</DialogDescription></DialogHeader>
          <div className="max-h-[60dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-[#F4F6FA] p-4 text-sm leading-relaxed text-[#34425C]" data-testid={`text-transcript-${r.id}`}>
            {transcript.trim() ? transcript : "Por privacidad, en esta reunión solo se guardó el resumen."}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
