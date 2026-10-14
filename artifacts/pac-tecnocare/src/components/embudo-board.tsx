import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { normalizarTemp } from "@/lib/temperatura";
import type { Cliente, Temperatura } from "@/lib/types";
import type { FunnelColumn } from "@/lib/funnel";
import "./embudo-board.css";

export type NegotiationGroup = { key: string; label: string; contacts: Cliente[] };

type Props = {
  lead: Cliente[];
  negotiation: Cliente[];
  won: Cliente[];
  stageGroups: NegotiationGroup[];
  search: string;
  onSearchChange: (value: string) => void;
  onOpen: (cliente: Cliente) => void;
  onLoss: (cliente: Cliente) => void;
  onMove: (cliente: Cliente, target: FunnelColumn, targetStage?: string) => void;
  onClosed: () => void;
  closedCount: number;
  pending: boolean;
};

const TEMPERATURE_DOT: Record<string, string> = {
  Caliente: "bg-[#F28C28]",
  Tibio: "bg-[#2F6FDB]",
  Frio: "bg-[#A3ABBD]",
  "Sin dato": "bg-[#A3ABBD]",
};
const FLOW = [
  { key: "lead", label: "Lead", tone: "lead" },
  { key: "negotiation", label: "Negociación", tone: "negotiation" },
  { key: "won", label: "Ganado", tone: "won" },
] as const;
type PointerOrigin = { id: string; x: number; y: number; dragging: boolean };

export function EmbudoBoard(props: Props) {
  const [activeTab, setActiveTab] = useState<FunnelColumn>("lead");
  const [leadLimit, setLeadLimit] = useState(5);
  const [wonLimit, setWonLimit] = useState(5);
  const [groupLimits, setGroupLimits] = useState<Record<string, number>>({});
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const pointerOrigin = useRef<PointerOrigin | null>(null);
  const touchDragged = useRef(false);

  useEffect(() => {
    setLeadLimit(5);
    setWonLimit(5);
    setGroupLimits({});
  }, [props.search]);

  const totals: Record<FunnelColumn, number> = {
    lead: props.lead.length,
    negotiation: props.negotiation.length,
    won: props.won.length,
  };
  const groups = useMemo(() => props.stageGroups.filter((group) => group.contacts.length > 0), [props.stageGroups]);

  const card = (cliente: Cliente, column: FunnelColumn, targetStage?: string) => {
    const temp = normalizarTemp(cliente.temperatura_actual);
    const id = String(cliente.id);
    const startPointer = (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" || props.pending ||
        (event.target instanceof Element && event.target.closest(".embudo-card__dismiss"))) return;
      pointerOrigin.current = { id, x: event.clientX, y: event.clientY, dragging: false };
      touchDragged.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    };
    return (
      <article
        key={id}
        draggable={!props.pending}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onPointerDown={startPointer}
        onPointerMove={(event) => {
          const origin = pointerOrigin.current;
          if (!origin || origin.id !== id) return;
          if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 9) {
            origin.dragging = true;
            touchDragged.current = true;
            const hoveredTab = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-flow-tab]");
            if (hoveredTab?.dataset.flowTab) setActiveTab(hoveredTab.dataset.flowTab as FunnelColumn);
          }
        }}
        onPointerUp={(event) => {
          const origin = pointerOrigin.current;
          pointerOrigin.current = null;
          if (!origin?.dragging) return;
          const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-drop-column]");
          const target = dropTarget?.dataset.dropColumn as FunnelColumn | undefined;
          const targetStageKey = dropTarget?.dataset.dropStage;
          if (target) props.onMove(
            props.lead.concat(props.negotiation, props.won).find((row) => String(row.id) === id) ?? cliente,
            target,
            targetStageKey,
          );
        }}
        onPointerCancel={() => { pointerOrigin.current = null; }}
        onClick={(event) => {
          if (touchDragged.current) {
            event.preventDefault();
            event.stopPropagation();
            touchDragged.current = false;
            return;
          }
          props.onOpen(cliente);
        }}
        onDragOver={(event) => event.preventDefault()}
        className={`embudo-card group relative flex min-h-11 items-center gap-2 rounded-md border border-[#DFE5ED] bg-white px-2.5 py-2 transition-colors hover:border-[#B9C8DC] hover:bg-[#FCFDFE] ${props.pending ? "opacity-65" : "cursor-grab active:cursor-grabbing"}`}
        data-testid={`card-embudo-${cliente.id}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${TEMPERATURE_DOT[temp]}`} aria-label={`Temperatura: ${temp}`} title={temp} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FDB]"
          aria-label={`Abrir contacto ${cliente.nombre || "Sin nombre"}`}
          data-testid={`button-embudo-abrir-${cliente.id}`}
        >
          <span className="block truncate text-[12px] font-semibold leading-4 text-[#24334D]">{cliente.nombre?.trim() || "Sin nombre"}</span>
          <span className="block truncate text-[10px] leading-4 text-[#798397]">{cliente.institucion?.trim() || "Sin institución"}</span>
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); props.onLoss(cliente); }}
          disabled={props.pending}
          aria-label={`Marcar ${cliente.nombre || "contacto"} como perdido`}
          title="Marcar perdido"
          className="embudo-card__dismiss absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded bg-white text-[#8A94A4] shadow-sm hover:bg-[#FCEFED] hover:text-[#A33F36] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33F36] disabled:opacity-50"
          data-testid={`button-embudo-cerrar-${cliente.id}`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
        {column === "negotiation" && (
          <span className="sr-only">{targetStage}</span>
        )}
      </article>
    );
  };

  const startNativeDrop = (event: DragEvent<HTMLElement>, target: FunnelColumn, targetStage?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    const cliente = props.lead.concat(props.negotiation, props.won).find((row) => String(row.id) === id);
    if (cliente) props.onMove(cliente, target, targetStage);
  };

  const columnContent = (key: FunnelColumn) => {
    if (key === "negotiation") {
      let initialQuota = 5;
      return (
        <div className="space-y-1.5">
          {groups.map((group) => {
            const isOpen = group.key in groupOpen
              ? groupOpen[group.key]
              : group.contacts.some((contact) => normalizarTemp(contact.temperatura_actual) === "Caliente");
            const hasExplicitLimit = Object.prototype.hasOwnProperty.call(groupLimits, group.key);
            const count = !isOpen ? 0 : hasExplicitLimit
              ? Math.min(group.contacts.length, groupLimits[group.key])
              : Math.min(group.contacts.length, 5, initialQuota);
            if (isOpen && !hasExplicitLimit) initialQuota -= count;
            return (
              <section key={group.key} className="overflow-hidden rounded-md border border-[#DCE4EF] bg-white">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    const currentlyOpen = group.key in groupOpen
                      ? groupOpen[group.key]
                      : group.contacts.some((contact) => normalizarTemp(contact.temperatura_actual) === "Caliente");
                    setGroupOpen((current) => ({ ...current, [group.key]: !currentlyOpen }));
                    if (!currentlyOpen) {
                      setGroupLimits((current) => ({ ...current, [group.key]: current[group.key] ?? 5 }));
                    }
                  }}
                  className="flex min-h-9 w-full items-center gap-2 px-2.5 text-left hover:bg-[#F6F8FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F6FDB]"
                  data-testid={`button-embudo-grupo-${group.key}`}
                  data-drop-column="negotiation"
                  data-drop-stage={group.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => startNativeDrop(event, "negotiation", group.key)}
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#64748B]" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />}
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#3C4B63]">{group.label}</span>
                  <span className="rounded bg-[#EEF2F7] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#53627A]">{group.contacts.length}</span>
                </button>
                {isOpen && (
                  <div
                    className="space-y-1.5 border-t border-[#E8EDF3] p-1.5"
                    data-drop-column="negotiation"
                    data-drop-stage={group.key}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => startNativeDrop(event, "negotiation", group.key)}
                  >
                    {group.contacts.slice(0, count).map((contact) => card(contact, "negotiation", group.key))}
                    {group.contacts.length > count && count >= 0 && (
                      <button
                        type="button"
                        disabled={props.pending}
                        onClick={() => {
                          setGroupLimits((current) => ({ ...current, [group.key]: Math.max(current[group.key] ?? count, count) + 5 }));
                        }}
                        className="w-full rounded py-1.5 text-[10px] font-semibold text-[#37639F] hover:bg-[#F0F5FC] disabled:opacity-50"
                        data-testid={`button-embudo-mas-${group.key}`}
                      >
                        Ver {group.contacts.length - count} más
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
          {groups.length === 0 && <EmptyColumn text="No hay oportunidades activas" />}
        </div>
      );
    }
    const rows = key === "lead" ? props.lead : props.won;
    const limit = key === "lead" ? leadLimit : wonLimit;
    return (
      <div className="space-y-1.5" data-drop-column={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => startNativeDrop(event, key)}>
        {rows.slice(0, limit).map((contact) => card(contact, key))}
        {rows.length > limit && (
          <button
            type="button"
            disabled={props.pending}
            onClick={() => key === "lead" ? setLeadLimit((current) => current + 5) : setWonLimit((current) => current + 5)}
            className="w-full rounded py-2 text-[11px] font-semibold text-[#37639F] hover:bg-white/70 disabled:opacity-50"
            data-testid={`button-embudo-mas-${key}`}
          >
            Ver {rows.length - limit} más
          </button>
        )}
        {!rows.length && <EmptyColumn text={key === "lead" ? "No hay leads" : "No hay ventas ganadas recientes"} />}
      </div>
    );
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-[#DCE3EB] shadow-[0_1px_2px_rgba(20,33,61,.04)]" role="group" aria-label="Flujo del embudo">
          {FLOW.map((step, index) => (
            <div key={step.key} className="contents">
              <button
                type="button"
                onClick={() => setActiveTab(step.key)}
                onDragEnter={() => setActiveTab(step.key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => startNativeDrop(event, step.key)}
                className={`embudo-flow-step relative flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 sm:px-4 ${index === 0 ? "embudo-flow-step--first" : index === FLOW.length - 1 ? "embudo-flow-step--last" : "embudo-flow-step--middle"} ${step.tone === "lead" ? "bg-[#F0F3F7] text-[#4C5B70]" : step.tone === "negotiation" ? "bg-[#EAF1FC] text-[#315D9B]" : "bg-[#E9F4ED] text-[#397454]"} ${activeTab === step.key ? "ring-1 ring-inset ring-[#9FB4D0]" : ""}`}
                style={{ zIndex: FLOW.length - index }}
                data-testid={`tab-embudo-${step.key}`}
                data-flow-tab={step.key}
                data-drop-column={step.key}
              >
                <span className="truncate text-[9px] font-bold uppercase tracking-[0.08em] sm:text-[11px]">{step.label}</span>
                <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">{totals[step.key]}</span>
              </button>
            </div>
          ))}
        </div>
        <label className="relative block w-full sm:w-56">
          <span className="sr-only">Buscar nombre o institución</span>
          <input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="Buscar contacto…"
            className="h-9 w-full rounded-md border border-[#DCE3EB] bg-white px-3 text-xs text-[#34445C] outline-none placeholder:text-[#929BAD] focus:border-[#6F91C3] focus:ring-2 focus:ring-[#2F6FDB]/10"
            data-testid="input-buscar-embudo"
          />
        </label>
      </div>

      <div className="embudo-scroll h-[min(64vh,690px)] min-h-[330px] overflow-y-auto rounded-lg border border-[#DDE4EC] bg-[#F5F7FA] p-2">
        <div className="grid h-full min-w-0 grid-cols-1 gap-2 md:grid-cols-3">
          {FLOW.map((step) => {
            const visible = activeTab === step.key;
            return (
              <section
                key={step.key}
                className={`${visible ? "flex" : "hidden"} min-h-0 min-w-0 flex-col overflow-hidden rounded-md border ${step.tone === "lead" ? "border-[#D8DFE9] bg-[#F0F3F7]" : step.tone === "negotiation" ? "border-[#C8D8EE] bg-[#EDF3FB]" : "border-[#CBE1D3] bg-[#EFF7F2]"} md:flex`}
                data-testid={`column-embudo-${step.key}`}
                data-drop-column={step.key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => startNativeDrop(event, step.key)}
              >
                <header className={`flex items-center justify-between border-b px-3 py-2 ${step.tone === "lead" ? "border-[#DCE2EA] bg-[#E8EDF4]" : step.tone === "negotiation" ? "border-[#D6E2F1] bg-[#E2ECFA]" : "border-[#D8E9DE] bg-[#E5F1E9]"}`}>
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#394B64]">{step.label}</h2>
                  <span className="text-[10px] font-semibold tabular-nums text-[#5B6B81]">{totals[step.key]}</span>
                </header>
                <div
                  className="embudo-scroll min-h-0 flex-1 overflow-y-auto p-2"
                  data-drop-column={step.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => startNativeDrop(event, step.key)}
                >
                  {columnContent(step.key)}
                </div>
                {step.key === "won" && (
                  <Link href="/panel/clientes?tab=clientes" className="border-t border-[#D8E9DE] px-3 py-2 text-[10px] font-semibold text-[#376A4B] hover:bg-white/60" data-testid="link-embudo-clientes">
                    Ver todos los clientes <span aria-hidden="true">→</span>
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={props.onClosed}
        className="mt-2 inline-flex items-center gap-1.5 px-1 py-1 text-[11px] font-medium text-[#798397] underline decoration-[#C6CDD7] underline-offset-2 hover:text-[#43536B]"
        data-testid="button-embudo-cerrados"
      >
        Ver cerrados ({props.closedCount}) <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </button>
      {props.pending && <span role="status" className="ml-2 text-[10px] font-medium text-[#3869AD]">Guardando…</span>}
    </section>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#CFD8E4] bg-white/45 px-3 py-5 text-center text-[11px] text-[#8993A3]">{text}</p>;
}
