import { useMemo, useState } from "react";
import { Search, Users, ChevronRight } from "lucide-react";
import { useClientes } from "@/hooks/use-pac-data";
import { ScoreBar, TempBadge } from "@/components/temp";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { ClienteDetalle } from "@/components/cliente-detalle";
import { textoOGuion } from "@/lib/format";
import { normalizarTemp, TEMP_META } from "@/lib/temperatura";
import type { Cliente } from "@/lib/types";

export function ClientesTable() {
  const q = useClientes();
  const [sel, setSel] = useState<Cliente | null>(null);
  const [term, setTerm] = useState("");
  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = q.data ?? [];
    const filtered = t ? list.filter((c) => [c.nombre, c.institucion, c.especialidad].some((v) => (v ?? "").toLowerCase().includes(t))) : list;
    return [...filtered].sort((a, b) => (TEMP_META[normalizarTemp(b.temperatura_actual)].score ?? 0) - (TEMP_META[normalizarTemp(a.temperatura_actual)].score ?? 0));
  }, [q.data, term]);

  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />;

  return (
    <div className="pac-card fade-up overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold text-[#14213D]">Cartera de clientes {q.data && <span className="ml-1 font-normal text-muted-foreground">({rows.length})</span>}</p>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar cliente, institución…" data-testid="input-buscar-cliente"
            className="w-56 rounded-md border bg-[#F4F6FB] py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[#2F6FDB] focus:bg-white" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {["Cliente", "Especialidad", "Institución", "Puntaje", "Estado", "Siguiente paso", ""].map((h, i) => <th key={i} className="px-4 py-2.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {q.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t">{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-3.5"><Bone className="h-3 w-20" /></td>)}</tr>
            ))}
            {rows.map((c) => (
              <tr key={String(c.id)} onClick={() => setSel(c)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(c)} data-testid={`row-cliente-${c.id}`}
                className="group cursor-pointer border-t transition-colors hover:bg-[#F7F9FD] focus:bg-[#F0F5FD] focus:outline-none">
                <td className="px-4 py-3 font-semibold text-[#14213D]">{textoOGuion(c.nombre, "Sin nombre")}</td>
                <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.especialidad)}</td>
                <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.institucion)}</td>
                <td className="px-4 py-3"><ScoreBar value={c.temperatura_actual} /></td>
                <td className="px-4 py-3"><TempBadge value={c.temperatura_actual} /></td>
                <td className="px-4 py-3 text-[#3A4560]">{textoOGuion(c.proximo_contacto_motivo, "Sin definir")}</td>
                <td className="px-2 py-3"><ChevronRight className="h-4 w-4 text-[#C2C9D6] transition group-hover:translate-x-0.5 group-hover:text-[#2F6FDB]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.data && q.data.length === 0 && <EmptyState icon={<Users className="h-5 w-5" />} title="Aún no hay clientes registrados" text="Cuando se agreguen clientes a la base de datos aparecerán en esta tabla." />}
      {q.data && q.data.length > 0 && rows.length === 0 && <EmptyState icon={<Search className="h-5 w-5" />} title="Sin coincidencias" text={`Ningún cliente coincide con "${term}".`} />}
      <ClienteDetalle cliente={sel} onClose={() => setSel(null)} />
    </div>
  );
}
