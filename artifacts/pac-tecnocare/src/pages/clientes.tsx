import { PageHeader } from "@/components/panel-layout";
import { KpiRow } from "@/components/kpis";
import { ClientesTable } from "@/components/clientes-table";
import { usePageMeta } from "@/hooks/use-page-meta";
import { greetingLima } from "@/lib/format";
import { useState } from "react";
import { Plus, Users, AudioLines } from "lucide-react";
import { ContactEditor } from "@/components/contact-editor";
import { GranolaInbox } from "@/components/granola-inbox";
import { useLocation, useSearch } from "wouter";

export default function ClientesPage() {
  const [creating, setCreating] = useState(false);
  const search = useSearch();
  const [, navigate] = useLocation();
  const section = new URLSearchParams(search).get("seccion") === "reuniones" ? "reuniones" : "contactos";
  const changeSection = (next: "contactos" | "reuniones") => {
    const params = new URLSearchParams(search);
    if (next === "reuniones") params.set("seccion", "reuniones");
    else params.delete("seccion");
    const query = params.toString();
    navigate(`/panel/clientes${query ? `?${query}` : ""}`);
  };
  usePageMeta("Contactos — PAC TECNOCARE", "Leads, oportunidades, clientes y contactos cerrados.");
  return (
    <>
      <PageHeader eyebrow={`${greetingLima()}, Víctor`} title="Contactos" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[#E0E6EF] bg-white p-1" role="tablist" aria-label="Secciones de contactos">
          <button role="tab" aria-selected={section === "contactos"} onClick={() => changeSection("contactos")} data-testid="tab-contactos" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${section === "contactos" ? "bg-[#EAF1FC] text-[#245DB7]" : "text-[#69748A] hover:bg-[#F5F7FA]"}`}><Users className="h-4 w-4" />Contactos</button>
          <button role="tab" aria-selected={section === "reuniones"} onClick={() => changeSection("reuniones")} data-testid="tab-reuniones" className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${section === "reuniones" ? "bg-[#FFF1E3] text-[#A6530A]" : "text-[#69748A] hover:bg-[#F5F7FA]"}`}><AudioLines className="h-4 w-4 shrink-0" />Reuniones por asignar</button>
        </div>
        {section === "contactos" && <button onClick={() => setCreating(true)} data-testid="button-new-contact" className="inline-flex items-center gap-1.5 rounded-md bg-[#2F6FDB] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#255FC2]"><Plus className="h-4 w-4" />Nuevo contacto</button>}
      </div>
      {section === "reuniones" ? <GranolaInbox /> : <><KpiRow /><ClientesTable /></>}
      {creating && <ContactEditor onClose={() => setCreating(false)} />}
    </>
  );
}
