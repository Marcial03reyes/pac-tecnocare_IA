import { useMemo, useState } from "react";
import { PageHeader } from "@/components/panel-layout";
import { ClienteDetalle } from "@/components/cliente-detalle";
import { Bone, ErrorState } from "@/components/states";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmbudoBoard } from "@/components/embudo-board";
import { useClientes } from "@/hooks/use-pac-data";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { usePageMeta } from "@/hooks/use-page-meta";
import { displayStage, lossReason } from "@/lib/contact-stages";
import { funnelColumn, funnelLoss, funnelMove, filterFunnel, groupFunnel, groupNegotiation, recentWon, type FunnelColumn } from "@/lib/funnel";
import type { Cliente, Temperatura } from "@/lib/types";

type MoveIntent = {
  cliente: Cliente;
  target: FunnelColumn;
  targetStage?: string;
  needsTemperature: boolean;
  needsConfirmation: boolean;
};
type LossIntent = { cliente: Cliente };
const TEMPERATURES: { value: Temperatura; color: string; title: string }[] = [
  { value: "Caliente", color: "bg-[#F28C28]", title: "Caliente" },
  { value: "Tibio", color: "bg-[#2F6FDB]", title: "Tibio" },
  { value: "Frio", color: "bg-[#A3ABBD]", title: "Frío" },
];
const COLUMN_NAMES: Record<FunnelColumn, string> = { lead: "Lead", negotiation: "Negociación", won: "Ganado" };

export default function EmbudoPage() {
  usePageMeta("Embudo — PAC TECNOCARE", "Oportunidades por etapa comercial.");
  const query = useClientes();
  const crm = useCrmMutation();
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [moveIntent, setMoveIntent] = useState<MoveIntent | null>(null);
  const [moveError, setMoveError] = useState("");
  const [moveBlocked, setMoveBlocked] = useState(false);
  const [temperature, setTemperature] = useState<Temperatura | "">("");
  const [lossIntent, setLossIntent] = useState<LossIntent | null>(null);
  const [lossReasonText, setLossReasonText] = useState("");
  const [lossError, setLossError] = useState("");

  const all = query.data ?? [];
  const filtered = useMemo(() => filterFunnel(all, search), [all, search]);
  const buckets = useMemo(() => groupFunnel(filtered), [filtered]);
  const recent = useMemo(() => recentWon(filtered), [filtered]);
  const stageGroups = useMemo(() => groupNegotiation(buckets.negotiation), [buckets.negotiation]);
  const pending = crm.isPending;
  const currentRecord = (id: Cliente["id"]) => all.find((contact) => String(contact.id) === String(id)) ?? null;

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
      setMoveIntent(intent);
      setMoveError("La etapa cambió mientras el contacto estaba en movimiento. Cierra y vuelve a intentarlo.");
      return;
    }
    const decision = funnelMove(current, intent.target, intent.targetStage);
    if (decision.kind === "noop") { closeMove(); return; }
    if (decision.kind === "blocked") {
      setMoveIntent(intent);
      setMoveError(decision.message);
      setMoveBlocked(true);
      return;
    }
    const patch: Partial<Cliente> = { ...decision.patch };
    if (decision.needsTemperature) {
      const temp = chosenTemperature ?? temperature;
      if (!temp || !TEMPERATURES.some((option) => option.value === temp)) {
        setMoveIntent({ ...intent, needsTemperature: true });
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
      setMoveIntent(intent);
      setMoveError(error instanceof Error ? error.message : "No se pudo guardar el cambio. Inténtalo nuevamente.");
    }
  };

  const requestMove = (cliente: Cliente, target: FunnelColumn, targetStage?: string) => {
    if (pending) return;
    const decision = funnelMove(cliente, target, targetStage);
    if (decision.kind === "noop") return;
    if (decision.kind === "blocked") {
      setMoveIntent({ cliente, target, targetStage, needsTemperature: false, needsConfirmation: true });
      setMoveError(decision.message);
      setMoveBlocked(true);
      return;
    }
    const intent: MoveIntent = {
      cliente,
      target,
      targetStage,
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
    const reason = lossReasonText.trim();
    if (!reason) { setLossError("Escribe el motivo antes de continuar."); return; }
    const current = currentRecord(lossIntent.cliente.id);
    if (!current || current.etapa_actual !== lossIntent.cliente.etapa_actual || funnelColumn(current) !== funnelColumn(lossIntent.cliente)) {
      setLossError("La etapa cambió mientras el contacto estaba abierto. Cierra y vuelve a intentarlo.");
      return;
    }
    let patch: Partial<Cliente>;
    try {
      patch = funnelLoss(current, reason);
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

  const selectedCurrent = selected ? currentRecord(selected.id) ?? selected : null;
  const moveTitle = moveBlocked
    ? "Movimiento no disponible"
    : moveIntent?.target === "won"
      ? "¿Venta ganada?"
      : moveIntent?.needsTemperature
        ? "Temperatura"
        : moveIntent?.cliente && funnelColumn(moveIntent.cliente) === "won"
          ? "¿Reabrir oportunidad?"
          : "Confirmar cambio";
  const moveDescription = moveBlocked
    ? moveError
    : moveIntent?.target === "won"
      ? `${moveIntent.cliente.nombre || "Este contacto"} pasará a Ganado.`
      : moveIntent?.needsTemperature
        ? `Elige una temperatura para ${moveIntent.cliente.nombre || "este contacto"}.`
        : moveIntent
          ? `${moveIntent.cliente.nombre || "Este contacto"} pasará a ${COLUMN_NAMES[moveIntent.target]}.`
          : "";

  if (query.isError) return <><PageHeader eyebrow="Pipeline comercial" title="Embudo" /><ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} /></>;

  return (
    <>
      <PageHeader eyebrow="Pipeline comercial" title="Embudo" />
      {query.isLoading && (
        <div className="grid h-[min(64vh,690px)] min-h-[330px] grid-cols-1 gap-3 md:grid-cols-3" aria-label="Cargando embudo">
          {["lead", "negotiation", "won"].map((key) => (
            <div key={key} className="space-y-3 rounded-lg border border-[#D8DFEB] bg-[#F0F3F8] p-3">
              <Bone className="h-5 w-24" />
              <Bone className="h-12 w-full" />
              <Bone className="h-12 w-full" />
              <Bone className="h-12 w-full" />
            </div>
          ))}
        </div>
      )}
      {query.data && (
        <EmbudoBoard
          lead={buckets.lead}
          negotiation={buckets.negotiation}
          won={recent}
          stageGroups={stageGroups}
          search={search}
          onSearchChange={setSearch}
          onOpen={setSelected}
          onLoss={(cliente) => { setLossIntent({ cliente }); setLossReasonText(""); setLossError(""); }}
          onMove={requestMove}
          onClosed={() => setShowClosed(true)}
          closedCount={buckets.closed.length}
          pending={pending}
        />
      )}

      <Dialog open={showClosed} onOpenChange={(open) => { if (!open) setShowClosed(false); }}>
        <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cerrados ({buckets.closed.length})</DialogTitle>
            <DialogDescription>Contactos perdidos o descartados. Abre uno para revisar su ficha.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[58dvh] space-y-2 overflow-y-auto pr-1">
            {buckets.closed.length ? buckets.closed.map((cliente) => (
              <button
                type="button"
                key={String(cliente.id)}
                onClick={() => { setShowClosed(false); setSelected(cliente); }}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-[#E2E7EE] bg-[#FBFCFD] p-3 text-left hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FDB]"
                data-testid={`card-embudo-cerrado-${cliente.id}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#28374F]">{cliente.nombre?.trim() || "Sin nombre"}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#7B8698]">{cliente.institucion?.trim() || "Sin institución"}</span>
                  <span className="mt-1 block text-[10px] text-[#7B8698]">{lossReason(cliente) || "Sin motivo registrado"}</span>
                </span>
                <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${displayStage(cliente) === "Descartado" ? "bg-[#F2F0EC] text-[#76634D]" : "bg-[#F8ECEA] text-[#9B514B]"}`}>{displayStage(cliente)}</span>
              </button>
            )) : <p className="rounded-md bg-[#F6F8FA] px-3 py-8 text-center text-xs text-[#8791A3]">Todavía no hay contactos cerrados.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveIntent} onOpenChange={(open) => { if (!open && !pending) closeMove(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{moveTitle}</DialogTitle>
            <DialogDescription>{moveDescription}</DialogDescription>
          </DialogHeader>
          {moveIntent?.needsTemperature && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-[#34445E]">Temperatura</legend>
              <div className="flex gap-2">
                {TEMPERATURES.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => { setTemperature(option.value); setMoveError(""); }}
                    aria-label={option.title}
                    aria-pressed={temperature === option.value}
                    className={`flex h-9 flex-1 items-center justify-center rounded-md border transition ${temperature === option.value ? "border-[#9BB0CA] bg-[#F2F6FB]" : "border-[#E1E6ED] bg-white hover:bg-[#F7F9FB]"}`}
                    data-testid={`button-embudo-temperatura-${option.value.toLowerCase()}`}
                  >
                    <span className={`h-3 w-3 rounded-full ${option.color}`} />
                    <span className="sr-only">{option.title}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {moveError && <p role="alert" className="rounded-md bg-[#FFF2F0] px-3 py-2 text-xs leading-5 text-[#9D342C]" data-testid="text-embudo-error">{moveError}</p>}
          <DialogFooter>
            <button type="button" onClick={closeMove} disabled={pending} className="rounded-md border border-[#DDE2EA] bg-white px-3 py-2 text-sm font-semibold text-[#35435A] disabled:opacity-50" data-testid="button-embudo-cancelar-mover">Cancelar</button>
            <button
              type="button"
              onClick={() => moveIntent && void saveMove(moveIntent, temperature || undefined)}
              disabled={pending || moveBlocked || (Boolean(moveIntent?.needsTemperature) && !temperature)}
              className="rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#275FBB] disabled:opacity-50"
              data-testid="button-embudo-confirmar-mover"
            >
              {pending ? "Guardando…" : moveIntent?.target === "won" ? "Sí, ganar" : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lossIntent} onOpenChange={(open) => { if (!open && !pending) closeLoss(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{lossIntent && funnelColumn(lossIntent.cliente) === "won" ? "¿Marcar cliente como perdido?" : "Marcar como perdido"}</DialogTitle>
            <DialogDescription>
              {lossIntent && funnelColumn(lossIntent.cliente) === "won"
                ? `${lossIntent.cliente.nombre || "Este cliente"} dejará de figurar como venta ganada. Indica el motivo para confirmar.`
                : `Indica el motivo para ${lossIntent?.cliente.nombre || "este contacto"}.`}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="embudo-motivo-perdida" className="text-xs font-semibold text-[#34445E]">Motivo</label>
          <textarea
            id="embudo-motivo-perdida"
            value={lossReasonText}
            onChange={(event) => { setLossReasonText(event.target.value); setLossError(""); }}
            rows={3}
            autoFocus
            placeholder="Ej. Eligió otra solución por presupuesto"
            className="w-full resize-y rounded-md border border-[#DDE2EA] bg-white p-2.5 text-sm text-[#26344C] placeholder:text-[#9AA3B1] focus:border-[#2F6FDB] focus:outline-none focus:ring-2 focus:ring-[#2F6FDB]/15"
            data-testid="input-embudo-motivo"
          />
          {lossError && <p role="alert" className="rounded-md bg-[#FFF2F0] px-3 py-2 text-xs leading-5 text-[#9D342C]" data-testid="text-embudo-error-perdida">{lossError}</p>}
          <DialogFooter>
            <button type="button" onClick={closeLoss} disabled={pending} className="rounded-md border border-[#DDE2EA] bg-white px-3 py-2 text-sm font-semibold text-[#35435A] disabled:opacity-50" data-testid="button-embudo-cancelar-perdida">Cancelar</button>
            <button type="button" onClick={() => void saveLoss()} disabled={pending} className="rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#275FBB] disabled:opacity-50" data-testid="button-embudo-confirmar-perdida">{pending ? "Guardando…" : lossIntent && funnelColumn(lossIntent.cliente) === "won" ? "Confirmar pérdida" : "Confirmar cierre"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClienteDetalle cliente={selectedCurrent} onClose={() => setSelected(null)} />
    </>
  );
}
