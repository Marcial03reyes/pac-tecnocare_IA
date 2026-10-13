import { Mail, Phone, Mic } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TempBadge } from "@/components/temp";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { CopyButton } from "@/components/copy-button";
import { useReunionesCliente } from "@/hooks/use-pac-data";
import { formatFecha, textoOGuion } from "@/lib/format";
import type { Cliente } from "@/lib/types";

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm text-[#14213D]">{value}</dd></div>;
}

export function ClienteDetalle({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const q = useReunionesCliente(cliente?.id ?? null);
  return (
    <Sheet open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-[#F4F6FB] sm:max-w-lg">
        {cliente && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2"><TempBadge value={cliente.temperatura_actual} /><span className="text-xs text-muted-foreground">{textoOGuion(cliente.etapa_actual, "Sin etapa")}</span></div>
              <SheetTitle className="text-xl text-[#14213D]" data-testid="text-detalle-nombre">{textoOGuion(cliente.nombre, "Cliente sin nombre")}</SheetTitle>
              <SheetDescription>{[cliente.especialidad, cliente.institucion].filter(Boolean).join(" · ") || "Sin especialidad ni institución registradas"}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-2">
              {cliente.telefono && <a href={`tel:${cliente.telefono.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-md bg-[#F28C28] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E57D17]" data-testid="link-detalle-llamar"><Phone className="h-3.5 w-3.5" /> Llamar</a>}
              {cliente.email && <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs font-semibold text-[#14213D] hover:border-[#2F6FDB]" data-testid="link-detalle-email"><Mail className="h-3.5 w-3.5" /> Correo</a>}
            </div>
            <dl className="pac-card mt-4 grid grid-cols-2 gap-4 p-4">
              <Field label="Teléfono" value={textoOGuion(cliente.telefono)} />
              <Field label="Correo" value={textoOGuion(cliente.email)} />
              <Field label="Próximo contacto" value={cliente.proximo_contacto_fecha ? formatFecha(cliente.proximo_contacto_fecha) : "Sin programar"} />
              <Field label="Última reunión" value={cliente.ultima_reunion ? formatFecha(cliente.ultima_reunion) : "—"} />
              <div className="col-span-2"><Field label="Siguiente paso" value={textoOGuion(cliente.proximo_contacto_motivo, "Sin definir")} /></div>
            </dl>
            <h3 className="mt-6 text-sm font-bold text-[#14213D]">Historial de reuniones</h3>
            <div className="mt-2 space-y-3">
              {q.isLoading && [0, 1].map((i) => <div key={i} className="pac-card space-y-2 p-4"><Bone className="h-3 w-24" /><Bone className="h-3 w-full" /><Bone className="h-3 w-2/3" /></div>)}
              {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
              {q.data?.length === 0 && <div className="pac-card"><EmptyState icon={<Mic className="h-5 w-5" />} title="Sin reuniones registradas" text="Cuando se registre una reunión con este cliente aparecerá aquí." /></div>}
              {q.data?.map((r) => (
                <article key={String(r.id)} className="pac-card fade-up p-4" data-testid={`card-reunion-${r.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#14213D]">{formatFecha(r.fecha_reunion, true)}</span>
                    <TempBadge value={r.temperatura} />
                  </div>
                  {r.etapa && <p className="mt-1 text-[11px] text-muted-foreground">Etapa: {r.etapa}</p>}
                  <p className="mt-2 text-sm leading-relaxed text-[#3A4560]">{textoOGuion(r.transcripcion_resumen, "Sin resumen")}</p>
                  {r.objeciones_detectadas && <p className="mt-2 text-xs"><span className="font-semibold text-[#14213D]">Objeciones: </span><span className="text-[#5B6478]">{r.objeciones_detectadas}</span></p>}
                  {r.acuerdos_proximo_paso && <p className="mt-1 text-xs"><span className="font-semibold text-[#14213D]">Acuerdos: </span><span className="text-[#5B6478]">{r.acuerdos_proximo_paso}</span></p>}
                  {r.feedback_estrategico && <p className="mt-1 text-xs"><span className="font-semibold text-[#2F6FDB]">Feedback: </span><span className="text-[#5B6478]">{r.feedback_estrategico}</span></p>}
                  {r.borrador_whatsapp && (
                    <div className="mt-3 rounded-md bg-[#F4F6FB] p-3">
                      <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Borrador WhatsApp</span><CopyButton text={r.borrador_whatsapp} testId={`button-copiar-detalle-${r.id}`} /></div>
                      <p className="whitespace-pre-wrap text-xs text-[#3A4560]">{r.borrador_whatsapp}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
