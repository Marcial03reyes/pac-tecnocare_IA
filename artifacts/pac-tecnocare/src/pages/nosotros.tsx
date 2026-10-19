import { Building2, FileCheck2, MapPin, PackageCheck } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PRESENCIA, cotizarEquipo, whatsapp } from "@/site/data";
import { Eyebrow, SiteShell, WhatsAppButton } from "@/site/layout";

const BLOQUES = [
  { icon: Building2, titulo: "Quiénes somos", texto: "Distribuidor autorizado por DIGEMID con casi una década importando equipamiento médico europeo al Perú. Atendemos a clínicas privadas, médicos independientes y a la red EsSalud, con un principio: solo vendemos lo que podemos respaldar localmente." },
  { icon: PackageCheck, titulo: "Qué hacemos", texto: "Distribuimos generadores de ozono médico y dispositivos de infusión de fabricantes europeos certificados. Cada equipo incluye instalación, capacitación, garantía y soporte técnico local. No vendemos equipos sin servicio." },
  { icon: FileCheck2, titulo: "Compromiso regulatorio", texto: "Seguimos la normativa DIGEMID y los estándares de los fabricantes: marcado CE, conformidad RoHS y sistemas de calidad ISO 9001 e ISO 13485. Cada producto tiene un registro sanitario peruano verificable." },
];

const ALIADOS = [
  { nombre: "SEDECAL", lugar: "Madrid, España", texto: "Fabricante de generadores de ozono médico con más de tres décadas en electromedicina. TECNOCARE es su representante directo en el Perú." },
  { nombre: "Adria Med · Easyflow-R", lugar: "Tocco da Casauria, Italia", texto: "Fabricante de infusores elastoméricos conforme a ISO 28620. TECNOCARE es su representante directo en el Perú." },
];

export default function NosotrosPage() {
  usePageMeta("Nosotros — TECNOCARE", "Tecnology Care S.R.L.: distribuidor autorizado de tecnología sanitaria europea certificada, con respaldo local en el Perú.");
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Eyebrow>Sobre TECNOCARE</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Tecnología sanitaria certificada, con respaldo local en el Perú</h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {BLOQUES.map((b) => (
            <article key={b.titulo} className="pac-card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E4EDFB] text-[#2F6FDB]"><b.icon className="h-5 w-5" /></span>
              <h2 className="mt-3 text-lg font-bold">{b.titulo}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5B6478]">{b.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#14213D] py-14 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow light>Presencia nacional</Eyebrow>
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div className="grid grid-cols-3 gap-4">
              {PRESENCIA.cifras.map(([n, l]) => <div key={l}><p className="text-4xl font-bold text-[#F28C28]">{n}</p><p className="mt-1 text-sm text-[#B9C2D6]">{l}</p></div>)}
            </div>
            <div className="flex flex-wrap gap-3">
              {PRESENCIA.regiones.map((r) => <span key={r.region} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm ring-1 ring-white/10"><MapPin className="h-4 w-4 text-[#F28C28]" />{r.region} · {r.area}</span>)}
            </div>
          </div>
          <p className="mt-6 text-sm text-[#B9C2D6]">Equipos suministrados a hospitales de la red EsSalud. Detalle institucional disponible a solicitud.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Aliados estratégicos</Eyebrow>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {ALIADOS.map((a) => (
              <article key={a.nombre} className="pac-card p-6">
                <h2 className="text-xl font-bold">{a.nombre}</h2>
                <p className="text-sm font-medium text-[#2F6FDB]">{a.lugar}</p>
                <p className="mt-3 text-sm leading-relaxed text-[#5B6478]">{a.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-5 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight">¿Evalúas una compra institucional?</h2><p className="mt-1 text-[15px] text-[#5B6478]">Te enviamos la propuesta comercial y el dossier de homologación.</p></div>
          <div className="flex flex-wrap gap-3">
            <WhatsAppButton href={cotizarEquipo()}>Solicitar cotización</WhatsAppButton>
            <WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera recibir el dossier comercial e institucional.")} variant="outline">Solicitar dossier</WhatsAppButton>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
