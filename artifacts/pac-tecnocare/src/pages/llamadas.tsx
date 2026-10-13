import { useMemo } from "react";
import { Bell, PhoneOff } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { LlamadaRow } from "@/components/llamada-row";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { useSeguimientos } from "@/hooks/use-pac-data";
import { usePageMeta } from "@/hooks/use-page-meta";
import { textoOGuion, todayLima } from "@/lib/format";

export default function LlamadasPage() {
  usePageMeta("Llamadas — PAC TECNOCARE", "Seguimientos telefónicos de hoy y próximos.");
  const q = useSeguimientos();
  const today = todayLima();
  const { hoy, proximas, vencidas } = useMemo(() => {
    const list = q.data ?? [];
    const d = (s: string | null) => (s ?? "").slice(0, 10);
    return {
      hoy: list.filter((c) => d(c.proximo_contacto_fecha) === today),
      proximas: list.filter((c) => d(c.proximo_contacto_fecha) >= today),
      vencidas: list.filter((c) => d(c.proximo_contacto_fecha) < today),
    };
  }, [q.data, today]);

  return (
    <>
      <PageHeader title="Llamadas de hoy y próximas" />
      {hoy.length > 0 && (
        <div className="fade-up mb-4 flex items-center gap-2.5 rounded-lg bg-[#14213D] px-4 py-3 text-sm text-white shadow-md" role="status" data-testid="banner-recordatorio">
          <Bell className="h-4 w-4 shrink-0 text-[#F28C28]" />
          <span>Recordatorio: hoy toca llamar a <strong className="text-[#F28C28]">{hoy.map((c) => textoOGuion(c.nombre, "cliente sin nombre")).join(", ")}</strong></span>
        </div>
      )}
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} /> : (
        <div className="pac-card fade-up overflow-hidden">
          {q.isLoading && <div className="divide-y">{[0, 1, 2, 3].map((i) => <div key={i} className="flex gap-4 px-4 py-4"><Bone className="h-4 w-16" /><Bone className="h-4 flex-1" /><Bone className="h-6 w-16" /></div>)}</div>}
          {q.data && proximas.length === 0 && <EmptyState icon={<PhoneOff className="h-5 w-5" />} title="No hay llamadas programadas" text="Ningún cliente tiene un próximo contacto para hoy o los próximos días." />}
          {proximas.length > 0 && <ul className="divide-y">{proximas.map((c) => <LlamadaRow key={String(c.id)} c={c} today={today} />)}</ul>}
        </div>
      )}
      {vencidas.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seguimientos vencidos ({vencidas.length})</h2>
          <div className="pac-card overflow-hidden"><ul className="divide-y">{vencidas.slice().reverse().map((c) => <LlamadaRow key={String(c.id)} c={c} today={today} />)}</ul></div>
        </section>
      )}
    </>
  );
}
