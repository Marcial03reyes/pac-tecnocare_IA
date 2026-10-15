import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, GraduationCap, Info, MonitorPlay, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { usePageMeta } from "@/hooks/use-page-meta";
import equipo from "@/assets/equipo-referencia.png";

type Info = { title: string; text: string } | null;

const EVENTOS = [
  { tag: "Webinar", title: "Dosimetría: medir la dosis real", icon: MonitorPlay, tone: "bg-[#E4EDFB] text-[#2459B5]" },
  { tag: "Taller práctico", title: "Ozonoterapia en rehabilitación", icon: Wrench, tone: "bg-[#FDEBD8] text-[#B45F0E]" },
  { tag: "Capacitación online", title: "Uso seguro del generador", icon: GraduationCap, tone: "bg-[#EEF0F5] text-[#5B6478]" },
];

const NAV = [["Inicio", "inicio"], ["Equipos", "equipos"], ["Comunidad", "comunidad"], ["Capacitaciones", "capacitaciones"], ["Eventos", "eventos"]] as const;

export default function HomePage() {
  usePageMeta("TECNOCARE — Equipos de ozono médico europeos en el Perú", "Equipos de ozono médico europeos con respaldo y servicio técnico en el Perú. Comunidad, eventos y capacitaciones TECNOCARE.");
  const [info, setInfo] = useState<Info>(null);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const cotizar = () => setInfo({ title: "Solicitar cotización", text: "Las cotizaciones se atienden de forma personalizada por un asesor comercial de TECNOCARE. Comunícate con tu asesor habitual para recibir una propuesta según tu especialidad y volumen de pacientes." });
  const inscribir = (t: string) => setInfo({ title: `Inscripción: ${t}`, text: "Las inscripciones a eventos y capacitaciones se coordinan directamente con el equipo comercial de TECNOCARE. Pregunta a tu asesor por las fechas y cupos disponibles." });

  return (
    <div className="min-h-[100dvh] bg-[#F4F6FB] text-[#14213D]">
      <header className="sticky top-0 z-30 border-b border-[#E3E7F0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <button onClick={() => go("inicio")} data-testid="link-logo"><Logo /></button>
          <nav className="hidden flex-1 gap-5 md:flex">
            {NAV.map(([l, id]) => (
              <button key={id} onClick={() => go(id)} data-testid={`link-${id}`} className="relative py-1 text-[13px] font-medium text-[#3A4560] transition hover:text-[#2F6FDB] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded after:bg-[#F28C28] after:transition-transform hover:after:scale-x-100">{l}</button>
            ))}
          </nav>
          <div className="ml-auto flex gap-2">
            <Link href="/login" data-testid="link-ingresar" className="rounded-md border border-[#D5DAE4] bg-white px-3.5 py-1.5 text-[13px] font-medium transition hover:border-[#14213D]">Ingresar</Link>
            <button onClick={cotizar} data-testid="button-cotizar" className="rounded-md bg-[#14213D] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#22325A] active:scale-[.98]">Cotizar</button>
          </div>
        </div>
      </header>

      <section id="inicio" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div className="fade-up">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[.2em] text-[#2F6FDB]">Generadores de ozono médico · Europa</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">Equipos de ozono médico europeos, con <span className="text-[#2F6FDB]">respaldo y servicio</span> en el Perú.</h1>
            <p className="mt-4 max-w-md text-[15px] text-[#5B6478]">Equipamiento para profesionales de la salud, con capacitación y soporte técnico local.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={cotizar} data-testid="button-solicitar-cotizacion" className="rounded-md bg-[#F28C28] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(242,140,40,.6)] transition hover:-translate-y-0.5 hover:bg-[#E57D17] active:translate-y-0">Solicitar cotización</button>
              <button onClick={() => go("equipos")} data-testid="button-ver-equipos" className="rounded-md border border-[#D5DAE4] bg-white px-5 py-2.5 text-sm font-medium transition hover:border-[#14213D]">Ver equipos</button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[90%] md:max-w-[560px]">
            <img
              src={`${import.meta.env.BASE_URL}om302_hero.png`}
              alt="Generador de ozono médico OM-302 con medición dual de concentración"
              className="block h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      <section id="equipos" className="scroll-mt-16 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1fr_1.4fr] md:items-center">
          <img src={equipo} alt="Equipo de ozono médico TECNOCARE" className="mx-auto w-64" />
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[.2em] text-[#2F6FDB]">Equipos</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Tecnología europea, acompañamiento local</h2>
            <p className="mt-3 max-w-lg text-[15px] text-[#5B6478]">Te ayudamos a elegir el generador adecuado para tu práctica. Las fichas técnicas y la propuesta comercial se entregan a través de tu asesor.</p>
            <button onClick={cotizar} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F6FDB] transition hover:gap-2.5" data-testid="button-ficha">Solicitar información <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section id="comunidad" className="scroll-mt-16 py-16">
        <div id="capacitaciones" className="mx-auto max-w-6xl scroll-mt-16 px-5">
          <p id="eventos" className="scroll-mt-20 font-mono text-[11px] font-semibold uppercase tracking-[.2em] text-[#2F6FDB]">Comunidad TECNOCARE</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Eventos y capacitaciones</h2>
          <p className="mt-2 text-[15px] text-[#5B6478]">Para profesionales de rehabilitación, terapia física y del dolor.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {EVENTOS.map((e, i) => (
              <article key={e.title} className="pac-card fade-up group overflow-hidden transition hover:-translate-y-1" style={{ animationDelay: `${i * 70}ms` }} data-testid={`card-evento-${i}`}>
                <div className="grid h-32 place-items-center bg-[#EAF0FB]"><e.icon className="h-10 w-10 text-[#2F6FDB] transition group-hover:scale-110" strokeWidth={1.5} /></div>
                <div className="p-4">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${e.tone}`}><CalendarDays className="h-3 w-3" />{e.tag}</span>
                  <h3 className="mt-2 font-semibold">{e.title}</h3>
                  <button onClick={() => inscribir(e.title)} data-testid={`button-inscribirme-${i}`} className="mt-4 rounded-md border border-[#D5DAE4] px-3 py-1.5 text-[13px] font-medium transition hover:border-[#F28C28] hover:text-[#B45F0E]">Inscribirme</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#14213D] py-10 text-[#B9C2D6]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm">
          <Logo light />
          <div><p>Equipos de ozono médico europeos · Perú</p><p className="mt-1 text-xs italic text-[#F28C28]" data-testid="text-slogan">Víctor vende. PAC se encarga del resto.</p></div>
          <Link href="/login" className="text-white hover:text-[#F28C28]" data-testid="link-footer-pac">Acceso PAC</Link>
        </div>
      </footer>

      <Dialog open={!!info} onOpenChange={(o) => !o && setInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <span className="mb-1 grid h-10 w-10 place-items-center rounded-full bg-[#E4EDFB] text-[#2F6FDB]"><Info className="h-5 w-5" /></span>
            <DialogTitle>{info?.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">{info?.text}</DialogDescription>
          </DialogHeader>
          <button onClick={() => setInfo(null)} className="mt-2 rounded-md bg-[#14213D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#22325A]" data-testid="button-cerrar-info">Entendido</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
