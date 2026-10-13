import { Link } from "wouter";
import { Mic } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { KpiRow } from "@/components/kpis";
import { ClientesTable } from "@/components/clientes-table";
import { usePageMeta } from "@/hooks/use-page-meta";
import { greetingLima } from "@/lib/format";

export default function ClientesPage() {
  usePageMeta("Clientes — PAC TECNOCARE", "Base de clientes, indicadores y oportunidades comerciales.");
  return (
    <>
      <PageHeader eyebrow={`${greetingLima()}, Víctor`} title="Clientes y oportunidades"
        action={<Link href="/panel/notas-de-voz" data-testid="link-notas" className="inline-flex items-center gap-1.5 rounded-md bg-[#F28C28] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#E57D17]"><Mic className="h-4 w-4" /> Notas de voz</Link>} />
      <KpiRow />
      <ClientesTable />
    </>
  );
}
