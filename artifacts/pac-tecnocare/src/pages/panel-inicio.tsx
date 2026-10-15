import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Mic, PhoneOff } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { KpiRow } from "@/components/kpis";
import { LlamadaRow } from "@/components/llamada-row";
import { ReunionCard } from "@/components/reunion-card";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { useReuniones, useSeguimientos } from "@/hooks/use-pac-data";
import { usePageMeta } from "@/hooks/use-page-meta";
import { greetingLima, todayLima } from "@/lib/format";
import { GranolaNotice } from "@/components/granola-notice";

function SectionHead({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#F28C28]">{title}</p>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FDB] transition hover:gap-2" data-testid={`link-ver-${label}`}>Ver todo <ArrowRight className="h-3.5 w-3.5" /></Link>
    </div>
  );
}

export default function PanelInicio() {
  usePageMeta("Inicio — PAC TECNOCARE", "Resumen diario del panel comercial PAC.");
  const seg = useSeguimientos();
  const reu = useReuniones();
  const today = todayLima();
  const hoy = useMemo(() => (seg.data ?? []).filter((c) => c.proximo_contacto_fecha?.slice(0, 10) === today), [seg.data, today]);

  return (
    <>
      <PageHeader eyebrow="Panel comercial" title={`${greetingLima()}, Víctor`} action={<GranolaNotice />} />
      <KpiRow />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="pac-card fade-up overflow-hidden">
          <SectionHead title="Llamadas de hoy" href="/panel/llamadas" label="llamadas" />
          {seg.isError && <div className="p-4"><ErrorState error={seg.error} onRetry={() => seg.refetch()} retrying={seg.isFetching} /></div>}
          {seg.isLoading && <div className="space-y-3 p-4"><Bone className="h-4 w-full" /><Bone className="h-4 w-3/4" /></div>}
          {seg.data && hoy.length === 0 && <EmptyState icon={<PhoneOff className="h-5 w-5" />} title="Sin llamadas para hoy" text="No hay seguimientos programados para la fecha de hoy." />}
          {hoy.length > 0 && <ul className="divide-y">{hoy.map((c) => <LlamadaRow key={String(c.id)} c={c} today={today} />)}</ul>}
        </section>
        <section className="pac-card fade-up overflow-hidden">
          <SectionHead title="Últimas reuniones" href="/panel/clientes" label="reuniones" />
          <div className="space-y-3 bg-[#F8FAFD] p-3">
            {reu.isError && <ErrorState error={reu.error} onRetry={() => reu.refetch()} retrying={reu.isFetching} />}
            {reu.isLoading && <><Bone className="h-16 w-full" /><Bone className="h-16 w-full" /></>}
            {reu.data?.length === 0 && <EmptyState icon={<Mic className="h-5 w-5" />} title="Sin reuniones aún" text="Las reuniones registradas aparecerán aquí." />}
            {reu.data?.slice(0, 3).map((r) => <ReunionCard key={String(r.id)} r={r} compact />)}
          </div>
        </section>
      </div>
    </>
  );
}
