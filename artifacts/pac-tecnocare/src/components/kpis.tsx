import { useKpis } from "@/hooks/use-pac-data";
import { Bone, ErrorState } from "@/components/states";

const fmt = new Intl.NumberFormat("es-PE");

export function KpiRow() {
  const q = useKpis();
  if (q.isError) return <div className="mb-5"><ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} /></div>;
  const items = [
    { k: "calientes", label: "Leads calientes", color: "text-[#F28C28]" },
    { k: "hoy", label: "Seguimientos hoy", color: "text-[#14213D]" },
    { k: "clientes", label: "Clientes registrados", color: "text-[#14213D]" },
    { k: "reuniones", label: "Reuniones registradas", color: "text-[#2F6FDB]" },
  ] as const;
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={it.k} className="pac-card fade-up px-4 py-3.5 transition hover:-translate-y-0.5" style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-kpi-${it.k}`}>
          {q.data ? <p className={`text-2xl font-bold tabular-nums ${it.color}`} data-testid={`text-kpi-${it.k}`}>{fmt.format(q.data[it.k])}</p> : <Bone className="my-1 h-6 w-10" />}
          <p className="mt-0.5 text-xs text-muted-foreground">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
