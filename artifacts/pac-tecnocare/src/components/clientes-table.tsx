import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Search, Users, ChevronRight } from "lucide-react";
import { useClientes } from "@/hooks/use-pac-data";
import { ScoreBar, TempBadge } from "@/components/temp";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { ClienteDetalle } from "@/components/cliente-detalle";
import { StageActions } from "@/components/stage-actions";
import { textoOGuion } from "@/lib/format";
import { contactBucket, normalizeStage, lossReason, displayStage, STAGES } from "@/lib/contact-stages";
import { ORIGINS } from "@/lib/crm-writes";
import { normalizarTemp, TEMP_META } from "@/lib/temperatura";
import type { Cliente } from "@/lib/types";

type Tab = "leads" | "oportunidades" | "clientes" | "cerrados";
const TABS: { k: Tab; label: string; hint: string }[] = [
  { k: "leads", label: "Leads", hint: "Contactados, esperando respuesta" },
  { k: "oportunidades", label: "Oportunidades", hint: "Desde Primer contacto hasta En pausa; incluye etapas desconocidas" },
  { k: "clientes", label: "Clientes", hint: "Ventas ganadas" },
  { k: "cerrados", label: "Cerrados", hint: "Perdidos y descartados" },
];
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.k === v);
export const motivoDe = lossReason;

export function ClientesTable() {
  const q = useClientes();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const tab: Tab = isTab(params.get("tab")) ? (params.get("tab") as Tab) : "leads";
  const [selId, setSelId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [tempFilter, setTempFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");

  const setParams = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(search);
    Object.entries(next).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)));
    const s = p.toString();
    navigate(`/panel/clientes${s ? `?${s}` : ""}`, { replace: true });
  };

  const contactoParam = params.get("contacto");
  useEffect(() => { if (contactoParam) setSelId(contactoParam); }, [contactoParam]);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { leads: 0, oportunidades: 0, clientes: 0, cerrados: 0 };
    all.forEach((x) => { c[contactBucket(x)]++; });
    return c;
  }, [all]);
  const sel = useMemo(() => all.find((c) => String(c.id) === selId) ?? null, [all, selId]);

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = all.filter((c) => contactBucket(c) === tab
      && (!stageFilter || displayStage(c) === stageFilter)
      && (!tempFilter || normalizarTemp(c.temperatura_actual) === tempFilter)
      && (!originFilter || (originFilter === "__empty" ? !c.origen?.trim() : c.origen === originFilter)));
    const filtered = t ? list.filter((c) => [c.nombre, c.institucion, c.especialidad].some((v) => (v ?? "").toLowerCase().includes(t))) : list;
    if (tab !== "oportunidades") return filtered;
    return [...filtered].sort((a, b) => (TEMP_META[normalizarTemp(b.temperatura_actual)].score ?? 0) - (TEMP_META[normalizarTemp(a.temperatura_actual)].score ?? 0));
  }, [all, term, tab, stageFilter, tempFilter, originFilter]);

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />;

  const visibleTabs = TABS;
  const heads = tab === "leads" ? ["Contacto", "Institución", "Respuesta", "Siguiente paso", "Acciones", ""]
    : tab === "oportunidades" ? ["Contacto", "Institución", "Etapa", "Puntaje", "Temperatura", "Siguiente paso", ""]
    : tab === "clientes" ? ["Contacto", "Institución", "Especialidad", "Estado", "Siguiente paso", ""]
    : tab === "cerrados" ? ["Contacto", "Institución", "Resultado", "Motivo", ""]
    : ["Contacto", "Institución", "Etapa registrada", "Siguiente paso", ""];
  const close = () => { setSelId(null); if (contactoParam) setParams({ contacto: null }); };

  return (
    <div className="space-y-3">
      <div className="pac-card fade-up overflow-hidden">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b px-2 pt-2">
          {visibleTabs.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setParams({ tab: t.k })} title={t.hint} data-testid={`tab-${t.k}`}
              className={`relative shrink-0 rounded-t-md px-3.5 py-2 text-[13px] font-semibold transition ${tab === t.k ? "text-[#14213D]" : "text-muted-foreground hover:text-[#14213D]"}`}>
              {t.label}<span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === t.k ? "bg-[#14213D] text-white" : "bg-[#EEF1F7] text-[#5B6478]"}`}>{q.data ? counts[t.k] : "·"}</span>
              {tab === t.k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#F28C28]" />}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-xs text-muted-foreground">{TABS.find((t) => t.k === tab)?.hint}</p>
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar contacto, institución…" data-testid="input-buscar-cliente"
              className="w-56 rounded-md border bg-[#F4F6FB] py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[#2F6FDB] focus:bg-white" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          <select aria-label="Filtrar por etapa" className="max-w-full rounded-md border bg-white px-2 py-2 text-xs" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="">Todas las etapas</option>{[...STAGES, ...Array.from(new Set(all.map(displayStage))).filter((s) => !(STAGES as readonly string[]).includes(s))].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filtrar por temperatura" className="rounded-md border bg-white px-2 py-2 text-xs" value={tempFilter} onChange={(e) => setTempFilter(e.target.value)}>
            <option value="">Todas las temperaturas</option>{["Frio", "Tibio", "Caliente", "Sin dato"].map((t) => <option key={t} value={t}>{t === "Sin dato" ? "Sin temperatura" : t}</option>)}
          </select>
          <select aria-label="Filtrar por origen" className="rounded-md border bg-white px-2 py-2 text-xs" value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
            <option value="">Todos los orígenes</option><option value="__empty">Sin origen</option>{[...ORIGINS, ...Array.from(new Set(all.map((c) => c.origen).filter((o): o is string => !!o))).filter((o) => !(ORIGINS as readonly string[]).includes(o))].map((o) => <option key={o}>{o}</option>)}
          </select>
          {(stageFilter || tempFilter || originFilter || term) && <button className="text-xs font-semibold text-[#2F6FDB]" onClick={() => { setStageFilter(""); setTempFilter(""); setOriginFilter(""); setTerm(""); }}>Limpiar filtros</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead><tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{heads.map((h, i) => <th key={i} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {q.isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">{heads.map((__, j) => <td key={j} className="px-4 py-3.5"><Bone className="h-3 w-20" /></td>)}</tr>
              ))}
              {rows.map((c) => (
                <tr key={String(c.id)} onClick={() => setSelId(String(c.id))} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setSelId(String(c.id))} data-testid={`row-cliente-${c.id}`}
                  className={`group cursor-pointer border-t transition-colors hover:bg-[#F7F9FD] focus:bg-[#F0F5FD] focus:outline-none ${String(c.id) === contactoParam ? "bg-[#EEF8F2]" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-[#14213D]">{textoOGuion(c.nombre, "Sin nombre")}</td>
                  <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.institucion)}</td>
                  {tab === "leads" && <>
                    <td className="px-4 py-3"><span className="rounded-md border border-dashed border-[#B9C2D6] px-2 py-0.5 text-[11px] font-semibold text-[#5B6478]" data-testid={`status-sin-respuesta-${c.id}`}>Sin respuesta</span></td>
                    <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.proximo_contacto_motivo, "Sin definir")}</td>
                    <td className="px-4 py-3"><StageActions cliente={c} compact /></td>
                  </>}
                  {tab === "oportunidades" && <>
                    <td className="px-4 py-3"><span className="rounded-md bg-[#EAF1FC] px-2 py-0.5 text-[11px] font-semibold text-[#2F6FDB]">{normalizeStage(c.etapa_actual)}</span></td>
                    <td className="px-4 py-3"><ScoreBar value={c.temperatura_actual} /></td>
                    <td className="px-4 py-3"><TempBadge value={c.temperatura_actual} /></td>
                    <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.proximo_contacto_motivo, "Sin definir")}</td>
                  </>}
                  {tab === "clientes" && <>
                    <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.especialidad)}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-[#1F9D61] px-2 py-0.5 text-[11px] font-semibold text-white" data-testid={`badge-cliente-${c.id}`}>Cliente</span></td>
                    <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.proximo_contacto_motivo, "Sin definir")}</td>
                  </>}
                  {tab === "cerrados" && <>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${normalizeStage(c.etapa_actual) === "Perdido" ? "bg-[#FDECEC] text-[#B42F2F]" : "bg-[#EEF1F7] text-[#5B6478]"}`}>{normalizeStage(c.etapa_actual)}</span></td>
                    <td className="max-w-[320px] px-4 py-3 text-[#3A4560]">{textoOGuion(motivoDe(c), "Sin motivo")}</td>
                  </>}
                  <td className="px-2 py-3"><ChevronRight className="h-4 w-4 text-[#C2C9D6] transition group-hover:translate-x-0.5 group-hover:text-[#2F6FDB]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {q.data && all.length === 0 && <EmptyState icon={<Users className="h-5 w-5" />} title="Aún no hay contactos" text="Contacta prospectos desde Ozonar y aparecerán aquí." />}
        {q.data && all.length > 0 && rows.length === 0 && (term
          ? <EmptyState icon={<Search className="h-5 w-5" />} title="Sin coincidencias" text={`Ningún contacto coincide con "${term}".`} />
          : <EmptyState icon={<Users className="h-5 w-5" />} title={`Nada en ${TABS.find((t) => t.k === tab)?.label}`} text="Cuando un contacto llegue a esta etapa aparecerá aquí." />)}
        <ClienteDetalle cliente={sel} onClose={close} />
      </div>
    </div>
  );
}
