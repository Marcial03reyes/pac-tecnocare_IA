import { Clock } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function Proximamente({ title }: { title: string }) {
  usePageMeta(`${title} — PAC TECNOCARE`, `${title}: módulo próximamente disponible en PAC.`);
  return (
    <>
      <PageHeader title={title} />
      <div className="pac-card fade-up flex flex-col items-center px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#FDEBD8] text-[#F28C28]"><Clock className="h-5 w-5" /></span>
        <p className="mt-3 text-lg font-semibold text-[#14213D]" data-testid="text-proximamente">Próximamente</p>
        <p className="mt-1 text-sm text-muted-foreground">Este módulo estará disponible en una próxima versión de PAC.</p>
      </div>
    </>
  );
}
