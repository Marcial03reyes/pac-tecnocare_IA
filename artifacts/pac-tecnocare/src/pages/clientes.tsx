import { PageHeader } from "@/components/panel-layout";
import { KpiRow } from "@/components/kpis";
import { ClientesTable } from "@/components/clientes-table";
import { usePageMeta } from "@/hooks/use-page-meta";
import { greetingLima } from "@/lib/format";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ContactEditor } from "@/components/contact-editor";

export default function ClientesPage() {
  const [creating, setCreating] = useState(false);
  usePageMeta("Contactos — PAC TECNOCARE", "Leads, oportunidades, clientes y contactos cerrados.");
  return (
    <>
      <PageHeader eyebrow={`${greetingLima()}, Víctor`} title="Contactos" />
      <div className="mb-4 flex justify-end"><button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nuevo contacto</button></div>
      <KpiRow />
      <ClientesTable />
      {creating && <ContactEditor onClose={() => setCreating(false)} />}
    </>
  );
}
