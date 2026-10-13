import { Mic, Pencil, CalendarPlus, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TempBadge } from "@/components/temp";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { StageActions } from "@/components/stage-actions";
import { contactBucket, displayStage, lossReason } from "@/lib/contact-stages";
import { useReunionesCliente } from "@/hooks/use-pac-data";
import { formatFecha, textoOGuion } from "@/lib/format";
import type { Cliente } from "@/lib/types";
import { useClientes } from "@/hooks/use-pac-data";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { ContactEditor } from "./contact-editor";
import { MeetingForm } from "./meeting-form";
import { ScheduleForm } from "./schedule-form";
import { QuickContactControls } from "./quick-contact-controls";
import { DirectContactActions } from "./direct-contact-actions";
import { MeetingCard } from "./meeting-card";
import { FormShell } from "./crm-form-shell";

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm text-[#14213D]">{value}</dd></div>;
}

export function ClienteDetalle({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const clientesQuery = useClientes();
  // The drawer also opens from Llamadas/Embudo; consume refreshed canonical data.
  cliente = clientesQuery.data?.find((c) => String(c.id) === String(cliente?.id)) ?? cliente;
  const q = useReunionesCliente(cliente?.id ?? null);
  const [modal, setModal] = useState<"edit" | "schedule" | "meeting" | "delete" | null>(null);
  const mutation = useCrmMutation();
  const close = () => { setModal(null); onClose(); };
  const remove = async () => {
    if (!cliente) return;
    try { await mutation.mutateAsync({ kind: "delete", cliente }); close(); } catch { /* retain confirmation and report partial errors */ }
  };
  return (
    <Sheet open={!!cliente} onOpenChange={(o) => !o && !mutation.isPending && close()}>
      <SheetContent className="w-full overflow-y-auto bg-[#F4F6FB] sm:max-w-lg">
        {cliente && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2">{contactBucket(cliente) === "clientes" ? <span className="rounded-md bg-[#1F9D61] px-2 py-0.5 text-[11px] font-semibold text-white">Cliente</span> : contactBucket(cliente) === "leads" ? <span className="rounded-md border border-dashed border-[#B9C2D6] px-2 py-0.5 text-[11px] font-semibold text-[#5B6478]">Sin respuesta</span> : <TempBadge value={cliente.temperatura_actual} />}<span className="text-xs text-muted-foreground" data-testid="text-detalle-etapa">{displayStage(cliente)}</span></div>
              <SheetTitle className="text-xl text-[#14213D]" data-testid="text-detalle-nombre">{textoOGuion(cliente.nombre, "Cliente sin nombre")}</SheetTitle>
              <SheetDescription>{[cliente.especialidad, cliente.institucion].filter(Boolean).join(" · ") || "Sin especialidad ni institución registradas"}</SheetDescription>
            </SheetHeader>
            <div className="mt-4"><DirectContactActions key={String(cliente.id)} cliente={cliente} borrador={q.data?.[0]?.borrador_whatsapp} disabled={q.isLoading || q.isError} onRegister={() => setModal("meeting")} /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-2 text-xs font-semibold" onClick={() => setModal("edit")}><Pencil className="h-3.5 w-3.5" />Editar contacto</button>
              <button className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-2 text-xs font-semibold" onClick={() => setModal("schedule")}><CalendarPlus className="h-3.5 w-3.5" />Agendar seguimiento</button>
              <button className="inline-flex items-center gap-1 rounded-md bg-[#2F6FDB] px-2.5 py-2 text-xs font-semibold text-white" onClick={() => setModal("meeting")}><Plus className="h-3.5 w-3.5" />Registrar reunión</button>
              <button className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold text-red-700" onClick={() => setModal("delete")}><Trash2 className="h-3.5 w-3.5" />Eliminar contacto</button>
            </div>
            <div className="mt-3"><StageActions cliente={cliente} /></div>
            <div className="mt-3"><QuickContactControls cliente={cliente} /></div>
            <dl className="pac-card mt-4 grid grid-cols-2 gap-4 p-4">
              <Field label="Teléfono" value={textoOGuion(cliente.telefono)} />
              <Field label="Correo" value={textoOGuion(cliente.email)} />
              <Field label="Próximo contacto" value={cliente.proximo_contacto_fecha ? formatFecha(cliente.proximo_contacto_fecha) : "Sin programar"} />
              <Field label="Última reunión" value={cliente.ultima_reunion ? formatFecha(cliente.ultima_reunion) : "—"} />
              {(() => { const x = cliente as Cliente & { origen?: string | null; motivo_perdida?: string | null; fecha_cierre?: string | null }; return <>
                <Field label="Origen" value={textoOGuion(x.origen ?? null, "Sin origen")} />
                <Field label="Fecha de cierre" value={x.fecha_cierre ? formatFecha(x.fecha_cierre) : "—"} />
                {lossReason(cliente) && <div className="col-span-2"><Field label="Motivo" value={lossReason(cliente)!} /></div>}
              </>; })()}
              <div className="col-span-2"><Field label="Siguiente paso" value={textoOGuion(cliente.proximo_contacto_motivo, "Sin definir")} /></div>
            </dl>
            <h3 className="mt-6 text-sm font-bold text-[#14213D]">Historial de reuniones</h3>
            <div className="mt-2 space-y-3">
              {q.isLoading && [0, 1].map((i) => <div key={i} className="pac-card space-y-2 p-4"><Bone className="h-3 w-24" /><Bone className="h-3 w-full" /><Bone className="h-3 w-2/3" /></div>)}
              {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
              {q.data?.length === 0 && <div className="pac-card"><EmptyState icon={<Mic className="h-5 w-5" />} title="Sin reuniones registradas" text="Cuando se registre una reunión con este cliente aparecerá aquí." /></div>}
              {q.data?.map((r) => <MeetingCard key={String(r.id)} reunion={r} cliente={cliente!} onRegister={() => setModal("meeting")} />)}
            </div>
            {modal === "edit" && <ContactEditor key={String(cliente.id)} cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "schedule" && <ScheduleForm cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "meeting" && <MeetingForm cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "delete" && <FormShell title="¿Eliminar contacto?" description="Se borrarán también sus reuniones. Esta acción no se puede deshacer." onClose={() => setModal(null)} busy={mutation.isPending}>
              <p className="text-sm">Confirma que deseas eliminar a <strong>{cliente.nombre || "este contacto"}</strong>.</p>
              <div className="flex justify-end gap-2"><button className="rounded-md border px-3 py-2 text-sm" disabled={mutation.isPending} onClick={() => setModal(null)}>Cancelar</button><button className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={mutation.isPending} onClick={remove}>{mutation.isPending ? "Eliminando…" : "Sí, eliminar contacto y reuniones"}</button></div>
            </FormShell>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
