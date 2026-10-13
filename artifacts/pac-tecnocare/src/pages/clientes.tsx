import { PageHeader } from "@/components/panel-layout";
import { KpiRow } from "@/components/kpis";
import { ClientesTable } from "@/components/clientes-table";
import { usePageMeta } from "@/hooks/use-page-meta";
import { greetingLima } from "@/lib/format";

export default function ClientesPage() {
  usePageMeta("Contactos — PAC TECNOCARE", "Leads, oportunidades, clientes y contactos cerrados.");
  return (
    <>
      <PageHeader eyebrow={`${greetingLima()}, Víctor`} title="Contactos" />
      <KpiRow />
      <ClientesTable />
    </>
  );
}
