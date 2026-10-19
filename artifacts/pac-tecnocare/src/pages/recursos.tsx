import { ExternalLink, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PRODUCTOS, whatsapp } from "@/site/data";
import { Eyebrow, SiteShell, WhatsAppButton } from "@/site/layout";

const REFERENCIAS = [
  { titulo: "Declaración de Madrid sobre la Ozonoterapia, 4.ª ed. 2025 (ISCO3)", texto: "Marco de referencia internacional para la práctica clínica.", url: "https://isco3.org/producto/declaracion-de-madrid-sobre-la-ozonoterapia-isco3-4-a-ed-2025-castellano-solo-lectura/" },
  { titulo: "Declaración de São Paulo (WFOT)", texto: "Guías de buenas prácticas clínicas en el tratamiento con ozono médico.", url: "https://www.wfoot.org/blogs/sao-paulo-declaration----wfots-good-clinical-practices-in-medical-ozone-treatment--guidelines-in-medicine" },
  { titulo: "Requisitos para generadores médicos (ISCO3)", texto: "Requisitos médicos y técnicos de los generadores de ozonoterapia (PDF).", url: "https://isco3.org/wp-content/uploads/2015/09/Generadores-ISCO3-SOP-DEV-01-01-2019-CORREGIDA-1.pdf" },
  { titulo: "Documentos oficiales ISCO3", texto: "Repositorio de documentos del comité científico internacional.", url: "https://isco3.org/officialdocs/" },
];

export default function RecursosPage() {
  usePageMeta("Recursos — TECNOCARE", "Documentación de referencia, fichas técnicas, dossier de homologación y formación para profesionales de la salud.");
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Eyebrow>Recursos para profesionales</Eyebrow>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Documentación, marco metodológico y formación</h1>

        <h2 className="mt-12 text-xl font-bold">Marco internacional de referencia</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {REFERENCIAS.map((r) => (
            <a key={r.titulo} href={r.url} target="_blank" rel="noopener noreferrer" className="pac-card group flex items-start gap-3 p-5 transition hover:-translate-y-0.5">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#2F6FDB]" />
              <div className="flex-1"><p className="font-semibold">{r.titulo}</p><p className="mt-1 text-sm text-[#5B6478]">{r.texto}</p></div>
              <ExternalLink className="h-4 w-4 text-[#8E99B3] transition group-hover:text-[#2F6FDB]" />
            </a>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-bold">Fichas técnicas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTOS.filter((p) => p.ficha).map((p) => (
            <a key={p.slug} href={p.ficha} target="_blank" rel="noopener noreferrer" className="pac-card flex items-center justify-between p-4 text-sm font-semibold transition hover:text-[#2F6FDB]">
              {p.nombre}<ExternalLink className="h-4 w-4" />
            </a>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#69748A]">También están en la página de cada <Link href="/?s=equipos" className="underline">equipo</Link>.</p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="pac-card flex flex-col p-6">
            <ShieldCheck className="h-6 w-6 text-[#1F9D61]" />
            <h2 className="mt-3 text-lg font-bold">Dossier de homologación</h2>
            <p className="mt-1.5 flex-1 text-sm text-[#5B6478]">Registros CE, ISO y DIGEMID, declaraciones de conformidad y material institucional. Disponible a solicitud.</p>
            <div className="mt-5"><WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera solicitar el dossier de homologación.")} variant="dark">Solicitar dossier</WhatsAppButton></div>
          </article>
          <article className="pac-card flex flex-col p-6">
            <GraduationCap className="h-6 w-6 text-[#F28C28]" />
            <h2 className="mt-3 text-lg font-bold">Charla mensual «Geometría de la ozonoterapia»</h2>
            <p className="mt-1.5 flex-1 text-sm text-[#5B6478]">Contenido educativo para profesionales de la salud; no constituye consejo clínico. También la llevamos a tu institución.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera una invitación a la próxima sesión de «Geometría de la ozonoterapia».")}>Quiero la invitación</WhatsAppButton>
              <WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera solicitar la charla para mi institución.")} variant="outline">Charla para mi institución</WhatsAppButton>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
