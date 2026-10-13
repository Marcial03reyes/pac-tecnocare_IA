import { Mic } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { ReunionCard } from "@/components/reunion-card";
import { Bone, EmptyState, ErrorState } from "@/components/states";
import { useReuniones } from "@/hooks/use-pac-data";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function NotasPage() {
  usePageMeta("Notas de voz — PAC TECNOCARE", "Reuniones registradas, acuerdos y borradores de WhatsApp.");
  const q = useReuniones();
  return (
    <>
      <PageHeader title="Notas de voz" />
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />}
      {q.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="pac-card space-y-2 p-4"><Bone className="h-4 w-40" /><Bone className="h-3 w-full" /><Bone className="h-16 w-full" /></div>)}</div>}
      {q.data?.length === 0 && <div className="pac-card"><EmptyState icon={<Mic className="h-5 w-5" />} title="Aún no hay reuniones registradas" text="Las notas de voz procesadas aparecerán aquí con su resumen y borrador de WhatsApp." /></div>}
      {q.data && q.data.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{q.data.map((r) => <ReunionCard key={String(r.id)} r={r} />)}</div>}
    </>
  );
}
