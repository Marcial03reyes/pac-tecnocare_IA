import { useState } from "react";
import { Mic, X, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useReuniones } from "@/hooks/use-pac-data";
import { formatFecha } from "@/lib/format";

function pick(a: unknown, keys: string[]): string | null {
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  for (const k of keys) if (typeof o[k] === "string" && (o[k] as string).trim()) return o[k] as string;
  return null;
}

export function VoiceNoteButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="button-nota-voz"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#F28C28] font-semibold text-white shadow-sm transition hover:bg-[#E07B17] active:scale-[.98] ${compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-[13px]"}`}>
        <Mic className="h-4 w-4" /> Nota de voz
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 p-0 [&>button]:hidden">
          {open && <VoiceNoteBody onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VoiceNoteBody({ onClose }: { onClose: () => void }) {
  const q = useReuniones();
  const r = q.data?.[0];
  const contacto = r ? (r.cliente?.nombre || r.cliente?.institucion || pick(r.analisis, ["contacto", "cliente"]) || "Sin contacto") : "";
  const interes = r ? (pick(r.analisis, ["interes", "interés", "nivel_interes"]) || r.temperatura || r.transcripcion_resumen || "Sin dato") : "";
  const paso = r ? (r.acuerdos_proximo_paso || pick(r.analisis, ["siguiente_paso", "proximo_paso"]) || "Sin siguiente paso definido") : "";
  return (
    <div>
      <div className="relative overflow-hidden rounded-t-2xl bg-[#14213D] px-6 py-6 text-white">
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded p-1 text-white/70 hover:text-white" data-testid="button-cerrar-nota"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-full bg-[#F28C28]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#F28C28]/40 motion-reduce:hidden" />
            <Mic className="relative h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-bold">Grabación con Granola – próximamente</DialogTitle>
            <DialogDescription className="text-xs text-[#B9C2D6]">Pronto podrás grabar tus reuniones y PAC hará el resumen.</DialogDescription>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2F6FDB]">Última reunión registrada · resumen IA</p>
        {q.isLoading ? (
          <div className="mt-3 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-[#EEF1F7]" />)}</div>
        ) : q.isError ? (
          <div className="mt-3 rounded-md bg-[#FDECEC] p-3 text-xs text-[#B42F2F]">No pudimos cargar la última reunión.
            <button onClick={() => q.refetch()} className="ml-2 inline-flex items-center gap-1 font-semibold underline" data-testid="button-reintentar-nota"><RotateCw className="h-3 w-3" /> Reintentar</button></div>
        ) : !r ? (
          <p className="mt-3 rounded-md bg-[#F4F6FB] p-4 text-sm text-muted-foreground">Aún no hay reuniones registradas.</p>
        ) : (
          <dl className="mt-3 divide-y divide-[#EEF1F7] rounded-lg border border-[#E3E7F0] text-sm" data-testid="card-ultima-reunion">
            <p className="px-4 pt-3 text-[11px] text-muted-foreground">{formatFecha(r.fecha_reunion, true)}</p>
            {[["Contacto", contacto], ["Interés", interes], ["Siguiente paso", paso]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2 px-4 py-2.5"><dt className="text-xs font-medium text-[#5B6478]">{k}</dt><dd className="text-[#14213D]">{v}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
