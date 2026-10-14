import { useMemo, useState, type DragEvent } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Flame, Snowflake, Thermometer, X } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { ClienteDetalle } from "@/components/cliente-detalle";
import { Bone, ErrorState } from "@/components/states";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientes } from "@/hooks/use-pac-data";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { usePageMeta } from "@/hooks/use-page-meta";
import { displayStage, lossReason } from "@/lib/contact-stages";
import { formatFecha } from "@/lib/format";
import { funnelColumn, funnelLoss, funnelMove, groupFunnel, type FunnelColumn } from "@/lib/funnel";
import { normalizarTemp } from "@/lib/temperatura";
import type { Cliente, Temperatura } from "@/lib/types";

type MoveIntent = {
  cliente: Cliente;
  target: FunnelColumn;
  needsTemperature: boolean;
  needsConfirmation: boolean;
  temperature?: Temperatura;
};
type LossIntent = { cliente: Cliente; motivo: string };

const COLUMN_META: Record<FunnelColumn, { label: string; note: string; style: string; header: string }> = {
  lead: { label: "Lead", note: "Contactados, aún sin respuesta", style: "border-[#D8DFEB] bg-[#F0F3F8]", header: "bg-[#E8EDF5]" },
  negotiation: { label: "Negociación", note: "Oportunidades activas", style: "border-[#C9D9F0] bg-[#EDF3FB]", header: "bg-[#E2ECFA]" },
  won: { label: "Ganado", note: "Ventas cerradas", style: "border-[#C8E2D4] bg-[#EFF7F2]", header: "bg-[#E5F1E9]" },
};
const TEMP_STYLE: Record<string, { text: string; dot: string; Icon: typeof Flame }> = {
  Caliente: { text: "text-[#B45F0E]", dot: "bg-[#F28C28]", Icon: Flame },
  Tibio: { text: "text-[#2459B5]", dot: "bg-[#2F6FDB]", Icon: Thermometer },
  Frio: { text: "text-[#667085]", dot: "bg-[#A3ABBD]", Icon: Snowflake },
  "Sin dato": { text: "text-[#747E91]", dot: "bg-[#A3ABBD]", Icon: Thermometer },
};
const COLUMN_ORDER: FunnelColumn[] = ["lead", "negotiation", "won"];
const COLUMN_NAME: Record<FunnelColumn, string> = { lead: "Lead", negotiation: "Negociación", won: "Ganado" };
const TEMPERATURES: Temperatura[] = ["Caliente", "Tibio", "Frio"];

export default function EmbudoPage() {
  usePageMeta("Embudo — PAC TECNOCARE", "Oportunidades por etapa comercial.");
  const q = useClientes();
  const crm = useCrmMutation();
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [over, setOver] = useState<FunnelColumn | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [moveIntent, setMoveIntent] = useState<MoveIntent | null>(null);
  const [moveError, setMoveError] = useState("");
  const [moveBlocked, setMoveBlocked] = useState(false);
  const [lossIntent, setLossIntent] = useState<LossIntent | null>(null);
  const [lossReasonText, setLossReasonText] = useState("");
  const [lossError, setLossError] = useState("");
  const [temperature, setTemperature] = useState<Temperatura | "">("");

  const groups = useMemo(() => groupFunnel(q.data ?? []), [q.data]);
  const all = q.data ?? [];
  const pending = crm.isPending;
  const currentRecord = (id: Cliente["id"]) => all.find((c) => String(c.id) === String(id)) ?? null;

  const closeMove = () => {
    setMoveIntent(null);
    setMoveError("");
    setMoveBlocked(false);
    setTemperature("");
  };
  const closeLoss = () => {
    setLossIntent(null);
    setLossReasonText("");
    setLossError("");
  };

  const saveMove = async (intent: MoveIntent, chosenTemperature?: Temperatura) => {
    if (pending) return;
    const current = currentRecord(intent.cliente.id);
    if (!current || current.etapa_actual !== intent.cliente.etapa_actual || funnelColumn(current) !== funnelColumn(intent.cliente)) {
      setMoveError("La etapa de este contacto cambió mientras estaba abierto. Cierra esta ventana y vuelve a intentarlo.");
      return;
    }
    let decision = funnelMove(current, intent.target);
    if (decision.kind === "noop") { closeMove(); return; }
    if (decision.kind === "blocked") {
      setMoveError(decision.message);
      setMoveBlocked(true);
      return;
    }
    const patch: Partial<Cliente> = { ...decision.patch };
    if (decision.needsTemperature) {
      if (!intent.needsTemperature) setMoveIntent({ ...intent, needsTemperature: true });
      const temp = chosenTemperature ?? intent.temperature;
      if (!temp || !TEMPERATURES.includes(temp)) {
        setMoveError("Elige una temperatura para continuar.");
        return;
      }
      patch.temperatura_actual = temp;
    }
    setMoveError("");
    setMoveBlocked(false);
    try {
      await crm.mutateAsync({ kind: "update", cliente: current, patch });
      closeMove();
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : "No se pudo guardar el cambio. Inténtalo nuevamente.");
    }
  };

  const requestMove = (cliente: Cliente, target: FunnelColumn) => {
    if (pending) return;
    const decision = funnelMove(cliente, target);
    if (decision.kind === "noop") return;
    if (decision.kind === "blocked") {
      setMoveIntent({ cliente, target, needsTemperature: false, needsConfirmation: true });
      setMoveError(decision.message);
      setMoveBlocked(true);
      return;
    }
    const intent: MoveIntent = {
      cliente,
      target,
      needsTemperature: decision.needsTemperature,
      needsConfirmation: decision.needsConfirmation,
    };
    if (intent.needsTemperature || intent.needsConfirmation) {
      setTemperature("");
      setMoveError("");
      setMoveBlocked(false);
      setMoveIntent(intent);
      return;
    }
    void saveMove(intent);
  };

  const saveLoss = async () => {
    if (!lossIntent || pending) return;
    const motivo = lossReasonText.trim();
    if (!motivo) { setLossError("Escribe el motivo antes de continuar."); return; }
    const current = currentRecord(lossIntent.cliente.id);
    if (!current || current.etapa_actual !== lossIntent.cliente.etapa_actual || funnelColumn(current) !== funnelColumn(lossIntent.cliente)) {
      setLossError("La etapa de este contacto cambió mientras estaba abierto. Cierra esta ventana y vuelve a intentarlo.");
      return;
    }
    let patch: Partial<Cliente>;
    try {
      patch = funnelLoss(current, motivo);
    } catch (error) {
      setLossError(error instanceof Error ? error.message : "Revisa el motivo e inténtalo nuevamente.");
      return;
    }
    setLossError("");
    try {
      await crm.mutateAsync({ kind: "update", cliente: current, patch });
      closeLoss();
    } catch (error) {
      setLossError(error instanceof Error ? error.message : "No se pudo guardar el cambio. Inténtalo nuevamente.");
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>, target: FunnelColumn) => {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData("text/plain");
    const cliente = all.find((contact) => String(contact.id) === id);
    if (cliente) requestMove(cliente, target);
  };

  const card = (cliente: Cliente, column: FunnelColumn) => {
    const temp = normalizarTemp(cliente.temperatura_actual);
    const meta = TEMP_STYLE[temp];
    const TempIcon = meta.Icon;
    const stage = displayStage(cliente);
    return (
      <article key={String(cliente.id)} draggable={!pending}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", String(cliente.id));
          event.dataTransfer.effectAllowed = "move";
        }}
        className={`rounded-lg border border-l-[3px] border-l-current bg-white p-3 shadow-[0_1px_2px_rgba(20,33,61,.06)] transition hover:-translate-y-px hover:shadow-md ${meta.text} ${pending ? "opacity-70" : "cursor-grab active:cursor-grabbing"}`}
        data-testid={`card-embudo-${cliente.id}`}>
        <button type="button" onClick={() => setSelected(cliente)}
          className="block w-full text-left text-[#14213D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FDB] focus-visible:ring-offset-2"
          data-testid={`button-embudo-abrir-${cliente.id}`}>
          <span className="block truncate text-[14px] font-semibold leading-5">{cliente.nombre?.trim() || "Sin nombre"}</span>
          <span className="mt-0.5 block truncate text-xs text-[#687287]">{cliente.institucion?.trim() || "Sin institución"}</span>
        </button>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${temp === "Caliente" ? "bg-[#FFF0DF]" : temp === "Tibio" ? "bg-[#EAF1FC]" : "bg-[#EFF1F5]"}`}>
            <TempIcon className="h-3 w-3" aria-hidden="true" />
          </span>
          <span>{temp === "Frio" ? "Frío" : temp}</span>
        </div>
        {column === "negotiation" && (
          <div className="mt-3 flex flex-col gap-2 border-t border-[#E9EDF3] pt-2.5">
            <span className="w-fit max-w-full truncate rounded-full border border-[#CAD8EB] bg-[#F2F6FC] px-2 py-1 text-[10px] font-semibold text-[#354D70]" title={stage}>
              {stage}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#657187]">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Próximo contacto: <strong className="font-semibold text-[#354052]">{formatFecha(cliente.proximo_contacto_fecha)}</strong></span>
            </span>
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 border-t border-[#EEF0F4] pt-2.5 text-[10px] font-medium text-[#697488]">
          <span className="sr-only">Mover {cliente.nombre ?? "contacto"} a columna</span>
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <select value="" disabled={pending} onChange={(event) => {
            const target = event.target.value as FunnelColumn;
            event.target.value = "";
            if (target) requestMove(cliente, target);
          }}
            className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-[11px] text-[#44516A] outline-none focus-visible:underline disabled:opacity-60"
            aria-label={`Mover ${cliente.nombre ?? "contacto"}`}
            data-testid={`select-embudo-mover-${cliente.id}`}>
            <option value="">Mover a otra columna…</option>
            {COLUMN_ORDER.filter((target) => target !== column).map((target) => <option value={target} key={target}>{COLUMN_NAME[target]}</option>)}
          </select>
        </label>
        {column !== "won" && (
          <button type="button" disabled={pending}
            onClick={() => { setLossIntent({ cliente, motivo: "" }); setLossReasonText(""); setLossError(""); }}
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#7C8595] underline decoration-transparent underline-offset-2 hover:text-[#9B3C36] hover:decoration-current focus-visible:decoration-current disabled:opacity-50"
            data-testid={`button-embudo-cerrar-${cliente.id}`}>
            <X className="h-3 w-3" aria-hidden="true" /> Marcar perdido/descartado
          </button>
        )}
      </article>
    );
  };

  const column = (key: FunnelColumn, list: Cliente[]) => {
    const meta = COLUMN_META[key];
    return (
      <section key={key}
        onDragOver={(event) => { event.preventDefault(); setOver(key); }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((value) => value === key ? null : value);
        }}
        onDrop={(event) => onDrop(event, key)}
        className={`min-w-0 rounded-xl border p-2.5 transition-colors sm:p-3 ${meta.style} ${over === key ? "ring-2 ring-[#2F6FDB] ring-inset" : ""}`}
        data-testid={`column-embudo-${key}`}>
        <header className={`mb-2.5 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${meta.header}`}>
          <div className="min-w-0">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#243652]">{meta.label}</h2>
            <p className="mt-0.5 text-[10px] text-[#738099]">{meta.note}</p>
          </div>
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-white px-2 text-xs font-bold tabular-nums text-[#33435E]" aria-label={`${list.length} contactos`}>
            {list.length}
          </span>
        </header>
        <div className="flex min-h-20 flex-col gap-2">
          {list.length ? list.map((cliente) => card(cliente, key)) : (
            <p className="flex min-h-[76px] items-center justify-center rounded-lg border border-dashed border-[#C8D0DE] bg-white/50 px-3 text-center text-xs text-[#8791A3]">
              {key === "lead" ? "No hay leads" : key === "negotiation" ? "No hay oportunidades activas" : "Aún no hay ventas ganadas"}
            </p>
          )}
        </div>
      </section>
    );
  };

  const moveTitle = moveBlocked
    ? "Movimiento no disponible"
    : moveIntent?.needsTemperature && !moveIntent.needsConfirmation
    ? "Elige la temperatura"
    : moveIntent?.target === "won" ? "¿Marcar como venta ganada?"
      : moveIntent?.cliente && funnelColumn(moveIntent.cliente) === "won" ? "Confirmar cambio de columna"
        : `Mover a ${moveIntent ? COLUMN_NAME[moveIntent.target] : ""}`;
  const moveDescription = moveBlocked ? moveError : moveIntent?.target === "won"
    ? "Esta acción cerrará la oportunidad como una venta ganada."
    : moveIntent && funnelColumn(moveIntent.cliente) === "won" && moveIntent.target === "negotiation"
      ? "Volverá a Negociación en la etapa Interesado - evaluando. La temperatura actual se conservará si es válida."
      : moveIntent && funnelColumn(moveIntent.cliente) === "won" && moveIntent.target === "lead"
        ? "Volverá a la columna Lead."
        : moveIntent?.needsTemperature
          ? "Para pasar de Lead a Negociación necesitamos registrar la temperatura."
          : "Confirma el cambio para actualizar este contacto.";
  const selectedCurrent = selected ? currentRecord(selected.id) ?? selected : null;
  const closed = groups.closed;

  return (
    <>
      <PageHeader eyebrow="Pipeline comercial" title="Embudo" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#657187]">Tres vistas claras para saber dónde está cada oportunidad. Arrastra una tarjeta o usa su control de movimiento.</p>
        {pending && <span role="status" className="text-xs font-semibold text-[#2F6FDB]">Guardando cambio…</span>}
      </div>
      {q.isLoading && <div className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="Cargando embudo">
        {COLUMN_ORDER.map((key) => <div key={key} className="space-y-2 rounded-xl border border-[#D8DFEB] bg-[#F0F3F8] p-3"><Bone className="h-5 w-24" /><Bone className="h-24 w-full" /><Bone className="h-24 w-full" /></div>)}
      </div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && (
        <div className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {COLUMN_ORDER.map((key) => column(key, groups[key]))}
          </div>
          <section className="overflow-hidden rounded-xl border border-[#DFE4EC] bg-white">
            <button type="button" onClick={() => setShowClosed((value) => !value)} aria-expanded={showClosed}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F6FDB]"
              data-testid="button-embudo-cerrados">
              <span>
                <span className="block text-xs font-semibold text-[#42516A]">Ver cerrados ({closed.length})</span>
                <span className="mt-0.5 block text-[10px] text-[#8892A3]">Perdidos y descartados</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-[#69768C] transition-transform ${showClosed ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {showClosed && (
              <div className="border-t border-[#E9EDF2] p-3 sm:p-4">
                {closed.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {closed.map((cliente) => <button key={String(cliente.id)} type="button" onClick={() => setSelected(cliente)}
                    className="min-w-0 rounded-lg border border-[#E3E7ED] bg-[#FAFBFC] p-3 text-left transition hover:border-[#C9D3E1] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FDB]"
                    data-testid={`card-embudo-cerrado-${cliente.id}`}>
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-[#26344C]">{cliente.nombre?.trim() || "Sin nombre"}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#727D90]">{cliente.institucion?.trim() || "Sin institución"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${displayStage(cliente) === "Descartado" ? "bg-[#F3F0EC] text-[#76634D]" : "bg-[#F8ECEA] text-[#9B514B]"}`}>{displayStage(cliente)}</span>
                    </span>
                    <span className="mt-2 block text-[11px] leading-4 text-[#697488]">{lossReason(cliente) || "Sin motivo registrado"}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#3A5F97]">Abrir contacto <ArrowRight className="h-3 w-3" /></span>
                  </button>)}
                </div> : <p className="rounded-lg bg-[#F7F8FA] px-3 py-5 text-center text-xs text-[#8590A2]">Todavía no hay contactos cerrados.</p>}
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!moveIntent} onOpenChange={(open) => { if (!open && !pending) closeMove(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveTitle}</DialogTitle>
            <DialogDescription>{moveIntent?.cliente.nombre || "Este contacto"} · {moveDescription}</DialogDescription>
          </DialogHeader>
          {moveIntent?.needsTemperature && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-semibold text-[#34445E]">Temperatura</legend>
              <div className="grid grid-cols-3 gap-2">
                {TEMPERATURES.map((value) => <button type="button" key={value} onClick={() => { setTemperature(value); setMoveError(""); }}
                  aria-pressed={temperature === value}
                  className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${temperature === value ? value === "Caliente" ? "border-[#F2BD83] bg-[#FFF1E2] text-[#A65708]" : value === "Tibio" ? "border-[#B8CBEA] bg-[#EDF3FC] text-[#2459B5]" : "border-[#C8CED9] bg-[#EEF0F5] text-[#59657A]" : "border-[#E0E5EC] bg-white text-[#687287] hover:bg-[#F6F8FA]"}`}
                  data-testid={`button-embudo-temperatura-${value.toLowerCase()}`}>{value === "Frio" ? "Frío" : value}</button>)}
              </div>
            </fieldset>
          )}
          {moveError && <p role="alert" className="rounded-md bg-[#FFF2F0] px-3 py-2 text-xs leading-5 text-[#9D342C]" data-testid="text-embudo-error">{moveError}</p>}
          <DialogFooter>
            <button type="button" onClick={closeMove} disabled={pending} className="rounded-md border border-[#DDE2EA] bg-white px-3 py-2 text-sm font-semibold text-[#35435A] disabled:opacity-50" data-testid="button-embudo-cancelar-mover">Cancelar</button>
            <button type="button" onClick={() => moveIntent && void saveMove(moveIntent, temperature || undefined)} disabled={pending || moveBlocked || (Boolean(moveIntent?.needsTemperature) && !temperature)}
              className="rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#275FBB] disabled:opacity-50"
              data-testid="button-embudo-confirmar-mover">{pending ? "Guardando…" : moveIntent?.target === "won" ? "Sí, marcar ganado" : "Confirmar cambio"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lossIntent} onOpenChange={(open) => { if (!open && !pending) closeLoss(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido o descartado</DialogTitle>
            <DialogDescription>Registra por qué se cierra {lossIntent?.cliente.nombre || "este contacto"}. Este motivo quedará asociado al contacto.</DialogDescription>
          </DialogHeader>
          <label htmlFor="embudo-motivo-perdida" className="text-xs font-semibold text-[#34445E]">Motivo de cierre</label>
          <textarea id="embudo-motivo-perdida" value={lossReasonText} onChange={(event) => { setLossReasonText(event.target.value); setLossError(""); }} rows={4} autoFocus
            placeholder="Ej. Eligió otra solución por presupuesto"
            className="w-full resize-y rounded-md border border-[#DDE2EA] bg-white p-2.5 text-sm text-[#26344C] placeholder:text-[#9AA3B1] focus:border-[#2F6FDB] focus:outline-none focus:ring-2 focus:ring-[#2F6FDB]/15"
            data-testid="input-embudo-motivo" />
          {lossError && <p role="alert" className="rounded-md bg-[#FFF2F0] px-3 py-2 text-xs leading-5 text-[#9D342C]" data-testid="text-embudo-error-perdida">{lossError}</p>}
          <DialogFooter>
            <button type="button" onClick={closeLoss} disabled={pending} className="rounded-md border border-[#DDE2EA] bg-white px-3 py-2 text-sm font-semibold text-[#35435A] disabled:opacity-50" data-testid="button-embudo-cancelar-perdida">Cancelar</button>
            <button type="button" onClick={() => void saveLoss()} disabled={pending} className="rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#275FBB] disabled:opacity-50" data-testid="button-embudo-confirmar-perdida">{pending ? "Guardando…" : "Confirmar cierre"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClienteDetalle cliente={selectedCurrent} onClose={() => setSelected(null)} />
    </>
  );
}
