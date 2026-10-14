import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarPlus, ChevronDown, Ellipsis, Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { contactBucket, displayStage, lossReason, normalizeStage, OPPORTUNITY_STAGES, STAGES } from "@/lib/contact-stages";
import { useReunionesCliente, useClientes } from "@/hooks/use-pac-data";
import { formatFecha, todayLima } from "@/lib/format";
import type { Cliente } from "@/lib/types";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { ContactEditor } from "./contact-editor";
import { MeetingForm } from "./meeting-form";
import { ScheduleForm } from "./schedule-form";
import { MeetingCard } from "./meeting-card";
import { FormShell } from "./crm-form-shell";
import { emailUrl, greeting, phoneDigits, whatsappUrl } from "@/lib/direct-contact";
import { normalizarTemp } from "@/lib/temperatura";

const TEMP_OPTIONS = [
  { value: "Caliente", dot: "bg-[#F28C28]", ring: "ring-[#F28C28]" },
  { value: "Tibio", dot: "bg-[#2F6FDB]", ring: "ring-[#2F6FDB]" },
  { value: "Frio", dot: "bg-[#98A1AF]", ring: "ring-[#98A1AF]" },
] as const;

function Field({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A869B]">{label}</dt><dd className="mt-0.5 break-words text-xs leading-relaxed text-[#253653]">{value}</dd></div>;
}

function DisabledContact({ icon, hint }: { icon: ReactNode; hint: string }) {
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-disabled="true" aria-label={hint} className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-[#E6E9EF] bg-[#F5F6F8] text-[#AAB1BD]">{icon}</span></TooltipTrigger><TooltipContent>{hint}</TooltipContent></Tooltip>;
}

export function ClienteDetalle({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const clientesQuery = useClientes();
  const source = cliente;
  cliente = clientesQuery.data?.find((c) => String(c.id) === String(source?.id)) ?? source;
  const q = useReunionesCliente(cliente?.id ?? null);
  const [modal, setModal] = useState<"edit" | "schedule" | "meeting" | "delete" | null>(null);
  const [stageDialog, setStageDialog] = useState<"loss" | "won-exit" | null>(null);
  const [pendingStage, setPendingStage] = useState("");
  const [lossInput, setLossInput] = useState("");
  const [tempOpen, setTempOpen] = useState(false);
  const stageSnapshot = useRef<Cliente | null>(null);
  const [stageError, setStageError] = useState("");
  const mutation = useCrmMutation();
  const selectedId = cliente ? String(cliente.id) : "";
  const currentStage = cliente ? displayStage(cliente) : "";
  const currentTemp = cliente ? normalizarTemp(cliente.temperatura_actual) : "Sin dato";
  const close = () => { setModal(null); onClose(); };
  const runStageUpdate = async (patch: Partial<Cliente>) => {
    if (!cliente || mutation.isPending) return false;
    const original = stageSnapshot.current;
    if (!original || String(original.id) !== String(cliente.id) ||
      original.etapa_actual !== cliente.etapa_actual || contactBucket(original) !== contactBucket(cliente)) {
      setStageError("La etapa cambió. Cierra esta ventana y vuelve a intentarlo.");
      return false;
    }
    setStageError("");
    try {
      await mutation.mutateAsync({ kind: "update", cliente, patch });
      setStageDialog(null);
      setPendingStage("");
      setLossInput("");
      return true;
    } catch {
      return false;
    }
  };
  const onStageChange = (nextStage: string) => {
    if (!cliente || nextStage === currentStage || mutation.isPending) return;
    mutation.reset();
    stageSnapshot.current = cliente;
    setStageError("");
    setPendingStage(nextStage);
    if (nextStage === "Perdido") {
      setLossInput("");
      setStageDialog("loss");
      return;
    }
    if (contactBucket(cliente) === "clientes" && currentStage === "Ganado" && nextStage !== "Ganado") {
      setStageDialog("won-exit");
      return;
    }
    const patch: Partial<Cliente> = nextStage === "Ganado"
      ? { etapa_actual: nextStage, fecha_cierre: todayLima(), motivo_perdida: null }
      : nextStage === "Descartado"
        ? { etapa_actual: nextStage, fecha_cierre: todayLima() }
        : { etapa_actual: nextStage };
    void runStageUpdate(patch);
  };
  const onTemperature = async (value: string) => {
    if (!cliente || value === currentTemp || mutation.isPending) return;
    mutation.reset();
    try {
      await mutation.mutateAsync({ kind: "update", cliente, patch: { temperatura_actual: value } });
      setTempOpen(false);
    } catch {
      // The error remains visible beside the editable controls so the user can retry.
    }
  };
  const remove = async () => {
    if (!cliente) return;
    try { await mutation.mutateAsync({ kind: "delete", cliente }); close(); } catch { /* keep confirmation open and show the mutation error */ }
  };
  const contactText = q.data?.[0]?.borrador_whatsapp?.trim() || (cliente ? greeting(cliente) : "");
  const wa = cliente ? whatsappUrl(cliente.telefono, contactText) : null;
  const tel = cliente ? phoneDigits(cliente.telefono) : "";
  const email = cliente ? emailUrl(cliente.email, contactText) : null;
  const contactExtra = cliente as (Cliente & { motivo_perdida?: string | null; fecha_cierre?: string | null }) | null;
  const reason = cliente ? lossReason(cliente) : null;
  const errorText = mutation.error instanceof Error ? mutation.error.message : "No se pudo completar la acción. Intenta otra vez.";

  useEffect(() => {
    setModal(null);
    setStageDialog(null);
    setPendingStage("");
    setLossInput("");
    setTempOpen(false);
    stageSnapshot.current = null;
    setStageError("");
    mutation.reset();
  }, [selectedId]);

  return (
    <Sheet open={!!cliente} onOpenChange={(open) => !open && !mutation.isPending && close()}>
      <SheetContent className="w-full max-w-full overflow-x-hidden overflow-y-auto border-l border-[#DCE3EE] bg-[#F7F9FC] p-4 sm:max-w-[480px] sm:p-6" style={{ animation: "none", transition: "none", transform: "none" }}>
        {cliente && (
          <TooltipProvider delayDuration={250}>
            <div className="pr-8">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="truncate text-[25px] font-bold leading-tight tracking-[-0.035em] text-[#14213D]" data-testid="text-detalle-nombre">{cliente.nombre?.trim() || "Cliente sin nombre"}</SheetTitle>
                {(cliente.institucion?.trim() || cliente.especialidad?.trim()) && (
                  <SheetDescription className="truncate text-xs text-[#68758C]" title={[cliente.institucion, cliente.especialidad].filter(Boolean).join(" · ")}>
                    {[cliente.institucion, cliente.especialidad].filter((value) => !!value?.trim()).join(" · ")}
                  </SheetDescription>
                )}
                <div className="flex min-h-7 items-center gap-2 pt-1">
                  <Popover open={tempOpen} onOpenChange={setTempOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" disabled={mutation.isPending} className="inline-flex items-center gap-1.5 rounded-full border border-[#DEE4ED] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#263854] shadow-sm hover:border-[#AEBBD0] disabled:opacity-60" aria-label="Cambiar temperatura" data-testid="button-temperature">
                        <span className={`h-2 w-2 rounded-full ${TEMP_OPTIONS.find((option) => option.value === currentTemp)?.dot ?? "bg-[#B0B8C5]"}`} />
                        {currentTemp === "Sin dato" ? "Temperatura" : currentTemp}<ChevronDown className="h-3 w-3 text-[#8490A3]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto rounded-xl border-[#E2E7EF] p-2 shadow-lg">
                      <div className="flex items-center gap-1.5" aria-label="Temperaturas disponibles">
                        {TEMP_OPTIONS.map((option) => (
                          <button key={option.value} type="button" onClick={() => void onTemperature(option.value)} disabled={mutation.isPending} aria-label={option.value} title={option.value} aria-pressed={currentTemp === option.value} data-testid={`button-temperature-${option.value.toLowerCase()}`}
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#F1F4F8] ${currentTemp === option.value ? `ring-2 ${option.ring} ring-offset-2` : ""}`}>
                            <span className={`h-3 w-3 rounded-full ${option.dot}`} />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <label className="sr-only" htmlFor="contact-stage-select">Etapa del contacto</label>
                  <select id="contact-stage-select" value={currentStage} disabled={mutation.isPending} onChange={(event) => onStageChange(event.target.value)} data-testid="select-detalle-etapa"
                    className="min-w-0 max-w-[205px] flex-1 truncate rounded-full border border-[#DEE4ED] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#35445E] outline-none focus:border-[#2F6FDB] disabled:opacity-60">
                    {!(STAGES as readonly string[]).includes(normalizeStage(currentStage)) && <option value={currentStage} disabled>{currentStage}</option>}
                    <optgroup label="LEAD">{STAGES.slice(0, 1).map((stage) => <option key={stage} value={stage}>{stage}</option>)}</optgroup>
                    <optgroup label="NEGOCIACIÓN">{OPPORTUNITY_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</optgroup>
                    <optgroup label="CERRADO">{STAGES.slice(-3).map((stage) => <option key={stage} value={stage}>{stage}</option>)}</optgroup>
                  </select>
                </div>
              </SheetHeader>
            </div>

            <div className="mt-4 flex items-center gap-2 border-b border-[#E3E8F0] pb-4">
              {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp" title="WhatsApp" data-testid={`link-whatsapp-${cliente.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE4EE] bg-white text-[#4F5F79] hover:border-[#2F6FDB] hover:text-[#2F6FDB]"><MessageCircle className="h-4 w-4" /></a> : <DisabledContact icon={<MessageCircle className="h-4 w-4" />} hint="Agrega teléfono" />}
              {tel ? <a href={`tel:+${tel}`} aria-label="Llamar" title="Llamar" data-testid={`link-call-${cliente.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE4EE] bg-white text-[#4F5F79] hover:border-[#2F6FDB] hover:text-[#2F6FDB]"><Phone className="h-4 w-4" /></a> : <DisabledContact icon={<Phone className="h-4 w-4" />} hint="Agrega teléfono" />}
              {email ? <a href={email} aria-label="Enviar correo" title="Correo" data-testid={`link-email-${cliente.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE4EE] bg-white text-[#4F5F79] hover:border-[#2F6FDB] hover:text-[#2F6FDB]"><Mail className="h-4 w-4" /></a> : <DisabledContact icon={<Mail className="h-4 w-4" />} hint="Agrega email" />}
              <button type="button" onClick={() => setModal("meeting")} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F28C28] px-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#DE7B1C] active:translate-y-px" data-testid="button-registrar-reunion">
                <Plus className="h-3.5 w-3.5" />Registrar reunión
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button type="button" aria-label="Más acciones" data-testid="button-contact-menu" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE4EE] bg-white text-[#586781] hover:border-[#AEBBD0]"><Ellipsis className="h-4 w-4" /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E1E6EE] p-1.5">
                  <DropdownMenuItem onSelect={() => setModal("edit")} className="cursor-pointer rounded-lg py-2 text-xs"><Pencil className="h-3.5 w-3.5" />Editar contacto</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setModal("schedule")} className="cursor-pointer rounded-lg py-2 text-xs"><CalendarPlus className="h-3.5 w-3.5" />Agendar seguimiento</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setModal("delete")} className="cursor-pointer rounded-lg py-2 text-xs text-[#B33B3B] focus:text-[#B33B3B]"><Trash2 className="h-3.5 w-3.5" />Eliminar contacto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {(mutation.isError && !stageDialog && modal !== "delete") && <p role="alert" className="mt-2 rounded-lg border border-[#F1D5D2] bg-[#FFF5F4] px-3 py-2 text-xs text-[#A33F38]" data-testid="text-contact-mutation-error">{errorText}</p>}

            {[cliente.telefono, cliente.email, cliente.proximo_contacto_fecha, cliente.origen, cliente.proximo_contacto_motivo, contactExtra?.fecha_cierre, reason].some((value) => value?.trim()) && <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3.5">
              {cliente.telefono?.trim() && <Field label="Teléfono" value={cliente.telefono} />}
              {cliente.email?.trim() && <Field label="Email" value={cliente.email} />}
              {cliente.proximo_contacto_fecha && <Field label="Próximo contacto" value={formatFecha(cliente.proximo_contacto_fecha)} />}
              {cliente.origen?.trim() && <Field label="Origen" value={cliente.origen} />}
              {cliente.proximo_contacto_motivo?.trim() && <Field label="Siguiente paso" value={cliente.proximo_contacto_motivo} />}
              {contactExtra?.fecha_cierre && <Field label="Fecha de cierre" value={formatFecha(contactExtra.fecha_cierre)} />}
              {reason && <div className="col-span-2"><Field label="Motivo de pérdida" value={reason} /></div>}
            </dl>}

            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-[13px] font-bold tracking-[-0.01em] text-[#14213D]">Historial de reuniones</h3>
              {q.data?.length ? <span className="rounded-full bg-[#EAF0F8] px-2 py-0.5 text-[10px] font-semibold text-[#60718C]">{q.data.length}</span> : null}
            </div>
            <div className="mt-2.5 space-y-2.5">
              {q.isLoading && [0, 1].map((index) => <div key={index} className="pac-card space-y-2 p-4"><Bone className="h-3 w-24" /><Bone className="h-3 w-full" /><Bone className="h-3 w-2/3" /></div>)}
              {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
              {q.data?.length === 0 && <div className="pac-card"><EmptyState icon={<CalendarPlus className="h-5 w-5" />} title="Sin reuniones registradas" text="Las reuniones de este contacto aparecerán aquí." /></div>}
              {q.data?.map((reunion) => <MeetingCard key={String(reunion.id)} reunion={reunion} cliente={cliente} />)}
            </div>
            {modal === "edit" && <ContactEditor key={String(cliente.id)} cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "schedule" && <ScheduleForm cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "meeting" && <MeetingForm cliente={cliente} onClose={() => setModal(null)} />}
            {modal === "delete" && <FormShell title="¿Eliminar contacto?" description="Se borrarán también sus reuniones. Esta acción no se puede deshacer." onClose={() => setModal(null)} busy={mutation.isPending}>
              <p className="text-sm text-[#34425C]">Confirma que deseas eliminar a <strong>{cliente.nombre || "este contacto"}</strong>.</p>
              {mutation.isError && <p role="alert" className="mt-3 rounded-lg bg-[#FFF1F0] p-2.5 text-xs text-[#A33F38]" data-testid="text-delete-error">{errorText}</p>}
              <div className="mt-4 flex justify-end gap-2"><button className="rounded-lg border border-[#DEE4ED] bg-white px-3 py-2 text-sm" disabled={mutation.isPending} onClick={() => setModal(null)}>Cancelar</button><button className="rounded-lg bg-[#B33B3B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={mutation.isPending} onClick={() => void remove()}>{mutation.isPending ? "Eliminando…" : "Sí, eliminar contacto y reuniones"}</button></div>
            </FormShell>}
            <Dialog open={!!stageDialog} onOpenChange={(open) => { if (!open && !mutation.isPending) { setStageDialog(null); setPendingStage(""); setLossInput(""); mutation.reset(); } }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{stageDialog === "loss" ? "Registrar pérdida" : "Confirmar cambio de etapa"}</DialogTitle>
                  <DialogDescription>
                    {stageDialog === "loss" ? "Antes de marcar este contacto como perdido, registra el motivo. No se guardará ningún cambio hasta confirmar." : `Vas a cambiar ${cliente.nombre || "este contacto"} desde Ganado a ${pendingStage}. Confirma para continuar.`}
                  </DialogDescription>
                </DialogHeader>
                {stageDialog === "loss" && <label className="block text-xs font-semibold text-[#5B6478]">Motivo de pérdida<textarea value={lossInput} onChange={(event) => setLossInput(event.target.value)} rows={3} autoFocus placeholder="Escribe el motivo" className="mt-1.5 w-full resize-y rounded-lg border border-[#D9DFEA] bg-white px-3 py-2 text-sm text-[#14213D] outline-none focus:ring-2 focus:ring-[#2F6FDB]" data-testid="input-detalle-motivo-perdida" /></label>}
                {mutation.isError && <p role="alert" className="rounded-lg border border-[#F1D5D2] bg-[#FFF5F4] p-2.5 text-xs text-[#A33F38]" data-testid="text-stage-error">{errorText}</p>}
                {stageError && <p role="alert" className="text-xs text-[#A33F38]">{stageError}</p>}
                <DialogFooter className="gap-2">
                  <button type="button" disabled={mutation.isPending} onClick={() => { setStageDialog(null); setPendingStage(""); mutation.reset(); }} className="rounded-lg border border-[#DEE4ED] bg-white px-3 py-2 text-sm">Cancelar</button>
                  <button type="button" disabled={mutation.isPending || (stageDialog === "loss" && !lossInput.trim())} onClick={() => {
                    if (stageDialog === "loss") void runStageUpdate({ etapa_actual: "Perdido", motivo_perdida: lossInput.trim(), fecha_cierre: todayLima() });
                    else void runStageUpdate({ etapa_actual: pendingStage });
                  }} className="rounded-lg bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="button-confirm-stage">{mutation.isPending ? "Guardando…" : "Confirmar cambio"}</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TooltipProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
