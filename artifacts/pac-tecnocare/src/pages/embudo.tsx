import { useMemo, useState, type DragEvent } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { ClienteDetalle } from "@/components/cliente-detalle";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientes } from "@/hooks/use-pac-data";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { usePageMeta } from "@/hooks/use-page-meta";
import { STAGES, displayStage, normalizeStage } from "@/lib/contact-stages";
import { normalizarTemp } from "@/lib/temperatura";
import type { Cliente } from "@/lib/types";

const ACTIVE = ["Lead", "Primer contacto", "Interesado - evaluando", "Información pendiente", "Demo agendada", "Demo realizada", "Negociación", "Esperando decisión", "Ganado"] as const;
const FOLDED = ["En pausa", "Perdido", "Descartado"] as const;
const LOSS = ["Perdido", "Descartado"];
const UNKNOWN = "__otros__";

const TEMP_EDGE: Record<string, string> = { Caliente: "border-l-[#F28C28]", Tibio: "border-l-[#2F6FDB]", Frio: "border-l-[#A3ABBD]", "Sin dato": "border-l-[#D5DAE4]" };
const TEMP_DOT: Record<string, string> = { Caliente: "bg-[#F28C28]", Tibio: "bg-[#2F6FDB]", Frio: "bg-[#A3ABBD]", "Sin dato": "bg-[#D5DAE4]" };

function columnOf(c: Cliente): string {
  const s = displayStage(c);
  return (STAGES as readonly string[]).includes(s) ? s : UNKNOWN;
}

export default function EmbudoPage() {
  usePageMeta("Embudo — PAC TECNOCARE", "Oportunidades por etapa comercial.");
  const q = useClientes();
  const crm = useCrmMutation();
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [showFolded, setShowFolded] = useState(false);
  const [loss, setLoss] = useState<{ cliente: Cliente; etapa: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [lossErr, setLossErr] = useState<string | null>(null);
  const pending = crm.isPending;

  const groups = useMemo(() => {
    const m = new Map<string, Cliente[]>();
    for (const c of q.data ?? []) {
      const k = columnOf(c);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [q.data]);

  const all = q.data ?? [];
  const findById = (id: string) => all.find((c) => String(c.id) === id) ?? null;

  const commit = async (cliente: Cliente, etapa: string, motivoTxt?: string) => {
    const patch: Partial<Cliente> = { etapa_actual: etapa };
    if (motivoTxt) patch.motivo_perdida = motivoTxt;
    try { await crm.mutateAsync({ kind: "update", cliente, patch }); return true; } catch { return false; /* toast handled by hook */ }
  };

  const move = (cliente: Cliente, etapa: string) => {
    if (pending || normalizeStage(cliente.etapa_actual) === etapa) return;
    if (LOSS.includes(etapa) && !cliente.motivo_perdida?.trim()) {
      setMotivo(""); setLossErr(null); setLoss({ cliente, etapa }); return;
    }
    void commit(cliente, etapa);
  };

  const submitLoss = async () => {
    if (!loss) return;
    if (!motivo.trim()) { setLossErr("Escribe el motivo antes de continuar."); return; }
    if (await commit(loss.cliente, loss.etapa, motivo.trim())) setLoss(null);
  };

  const onDrop = (e: DragEvent, etapa: string) => {
    e.preventDefault(); setOver(null);
    const c = findById(e.dataTransfer.getData("text/plain"));
    if (c) move(c, etapa);
  };

  const card = (c: Cliente) => {
    const t = normalizarTemp(c.temperatura_actual);
    const raw = c.etapa_actual?.trim();
    return (
      <article key={String(c.id)} draggable={!pending}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(c.id)); e.dataTransfer.effectAllowed = "move"; }}
        className={`group rounded-md border border-l-4 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${TEMP_EDGE[t]} ${pending ? "opacity-70" : "cursor-grab active:cursor-grabbing"}`}
        data-testid={`card-embudo-${c.id}`}>
        <button type="button" onClick={() => setSelected(c)} className="block w-full text-left" data-testid={`button-embudo-abrir-${c.id}`}>
          <p className="truncate text-[13px] font-semibold text-[#14213D]">{c.nombre?.trim() || "Sin nombre"}</p>
          <p className="truncate text-[11px] text-[#5B6478]">{c.institucion?.trim() || "Sin institución"}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#5B6478]"><span className={`h-1.5 w-1.5 rounded-full ${TEMP_DOT[t]}`} />{t}</span>
          {columnOf(c) === UNKNOWN && <span className="ml-2 text-[10px] text-[#B45F0E]">Etapa: {raw || "sin etapa"}</span>}
        </button>
        <label className="mt-2 block">
          <span className="sr-only">Mover {c.nombre ?? "contacto"} a etapa</span>
          <select disabled={pending} value={(STAGES as readonly string[]).includes(displayStage(c)) ? displayStage(c) : ""}
            onChange={(e) => e.target.value && move(c, e.target.value)}
            className="w-full rounded border border-[#DDE1EA] bg-[#F4F6FB] px-1.5 py-1 text-[11px] text-[#14213D] focus:border-[#2F6FDB] focus:outline-none disabled:opacity-60"
            data-testid={`select-embudo-etapa-${c.id}`}>
            {columnOf(c) === UNKNOWN && <option value="">{raw || "Sin etapa"}</option>}
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </article>
    );
  };

  const column = (etapa: string, label = etapa, droppable = true, wide = false) => {
    const list = groups.get(etapa) ?? [];
    return (
      <section key={etapa}
        onDragOver={droppable ? (e) => { e.preventDefault(); setOver(etapa); } : undefined}
        onDragLeave={droppable ? () => setOver((o) => (o === etapa ? null : o)) : undefined}
        onDrop={droppable ? (e) => onDrop(e, etapa) : undefined}
        className={`flex flex-col rounded-lg border p-2 transition-colors ${wide ? "" : "w-full md:w-[232px] md:shrink-0"} ${over === etapa ? "border-[#2F6FDB] bg-[#E4EDFB]" : etapa === "Ganado" ? "border-[#BFE5D0] bg-[#EFF8F3]" : "border-[#E2E6EF] bg-[#EBEEF5]"}`}
        data-testid={`column-embudo-${label.toLowerCase().replace(/\s|-/g, "")}`}>
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#14213D]">{label}</h2>
          <span className="rounded bg-white px-1.5 text-[11px] font-semibold tabular-nums text-[#5B6478]">{list.length}</span>
        </header>
        <div className={`min-h-[64px] gap-2 ${wide ? "grid sm:grid-cols-2 lg:grid-cols-4" : "flex flex-col"}`}>
          {list.length ? list.map(card) : <p className="rounded border border-dashed border-[#CBD2E0] p-3 text-center text-[11px] text-[#8A93A6]">Arrastra aquí</p>}
        </div>
      </section>
    );
  };

  const unknown = groups.get(UNKNOWN) ?? [];
  const foldedCount = FOLDED.reduce((n, s) => n + (groups.get(s)?.length ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Pipeline comercial" title="Embudo" />
      <p className="mb-4 text-sm text-[#5B6478]">Arrastra una tarjeta para cambiar su etapa, o usa el selector de cada tarjeta en el celular.{pending && <span className="ml-2 font-semibold text-[#2F6FDB]">Guardando…</span>}</p>
      {q.isLoading && <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <div key={i} className="w-[232px] shrink-0 space-y-2 rounded-lg bg-[#EBEEF5] p-2"><Bone className="h-3 w-20" /><Bone className="h-16 w-full" /><Bone className="h-16 w-full" /></div>)}</div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.data && q.data.length === 0 && <div className="pac-card"><EmptyState icon={<Filter className="h-5 w-5" />} title="Sin contactos" text="Cuando registres contactos aparecerán en el embudo." /></div>}
      {q.data && q.data.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:overflow-x-auto md:pb-3">{ACTIVE.map((s) => column(s))}</div>
          {unknown.length > 0 && (
            <div>
              {column(UNKNOWN, "Otras oportunidades", false, true)}
            </div>
          )}
          <div className="rounded-lg border border-[#E2E6EF] bg-white">
            <button type="button" onClick={() => setShowFolded((v) => !v)} aria-expanded={showFolded}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#14213D]" data-testid="button-embudo-cerrados">
              <span>En pausa, perdidos y descartados <span className="ml-1 text-xs font-normal text-[#5B6478]">({foldedCount})</span></span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFolded ? "rotate-180" : ""}`} />
            </button>
            <div className={`${showFolded ? "flex" : "hidden"} flex-col gap-3 p-3 pt-0 md:flex-row`}>{FOLDED.map((s) => column(s))}</div>
            {!showFolded && <div className="flex flex-wrap gap-2 px-3 pb-3">{FOLDED.map((s) => (
              <div key={s} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, s)}
                className={`rounded-md border border-dashed px-3 py-1.5 text-xs text-[#5B6478] ${over === s ? "border-[#2F6FDB] bg-[#E4EDFB]" : "border-[#CBD2E0]"}`}>
                {s} · {groups.get(s)?.length ?? 0}
              </div>
            ))}</div>}
          </div>
        </div>
      )}

      <Dialog open={!!loss} onOpenChange={(o) => !o && setLoss(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover a {loss?.etapa}</DialogTitle>
            <DialogDescription>Registra el motivo para {loss?.cliente.nombre ?? "este contacto"}. Quedará en el historial del cliente.</DialogDescription>
          </DialogHeader>
          <label htmlFor="embudo-motivo" className="text-xs font-semibold text-[#14213D]">Motivo</label>
          <textarea id="embudo-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} autoFocus
            className="w-full rounded-md border border-[#DDE1EA] p-2 text-sm focus:border-[#2F6FDB] focus:outline-none" data-testid="input-embudo-motivo" />
          {lossErr && <p role="alert" className="text-xs text-[#B4261E]">{lossErr}</p>}
          <DialogFooter>
            <button type="button" onClick={() => setLoss(null)} className="rounded-md border bg-white px-3 py-1.5 text-sm font-semibold text-[#14213D]">Cancelar</button>
            <button type="button" onClick={submitLoss} disabled={pending} className="rounded-md bg-[#2F6FDB] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" data-testid="button-embudo-confirmar-motivo">{pending ? "Guardando…" : "Confirmar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClienteDetalle cliente={selected ? findById(String(selected.id)) ?? selected : null} onClose={() => setSelected(null)} />
    </>
  );
}
