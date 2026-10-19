import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, FileCheck2, Gauge, GraduationCap, HeartHandshake, MapPin, MessageCircle, Quote, ShieldCheck, Stethoscope, Wrench } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { CERTIFICACIONES, EVENTOS, POR_QUE, PRESENCIA, PRODUCTOS, RESPALDO, SERVICIO, TESTIMONIOS, cotizarEquipo, whatsapp } from "@/site/data";
import { Eyebrow, SiteShell, WhatsAppButton, scrollToSection, useSectionFromQuery } from "@/site/layout";
import { ProductVisual } from "@/site/visual";

const POR_QUE_ICONOS = [BadgeCheck, Gauge, ShieldCheck, Wrench];
const SERVICIO_ICONOS = [Wrench, GraduationCap, Stethoscope, HeartHandshake, FileCheck2];

function Cotizacion() {
  const [v, setV] = useState({ nombre: "", apellido: "", correo: "", telefono: "", equipo: "", institucion: "", cargo: "", proyecto: "", acepto: false });
  const set = (k: keyof typeof v, val: string | boolean) => setV((o) => ({ ...o, [k]: val }));
  const input = "w-full rounded-md border border-[#D5DAE4] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#2F6FDB] focus:ring-2 focus:ring-[#2F6FDB]/15";
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const lineas = [
      "Hola TECNOCARE, quisiera solicitar una cotización.",
      `Nombre: ${v.nombre} ${v.apellido}`.trim(),
      `Equipo de interés: ${v.equipo}`,
      v.institucion && `Institución / clínica: ${v.institucion}`,
      v.cargo && `Cargo: ${v.cargo}`,
      `Correo: ${v.correo}`,
      `Teléfono: ${v.telefono}`,
      v.proyecto && `Proyecto: ${v.proyecto}`,
    ].filter(Boolean).join("\n");
    window.open(whatsapp(lineas), "_blank", "noopener,noreferrer");
  };
  return (
    <form onSubmit={enviar} className="pac-card grid gap-3 p-6 sm:grid-cols-2" data-testid="form-cotizacion">
      <input required placeholder="Nombre *" className={input} value={v.nombre} onChange={(e) => set("nombre", e.target.value)} />
      <input required placeholder="Apellido *" className={input} value={v.apellido} onChange={(e) => set("apellido", e.target.value)} />
      <input required type="email" placeholder="Correo *" className={input} value={v.correo} onChange={(e) => set("correo", e.target.value)} />
      <input required type="tel" placeholder="Teléfono / WhatsApp *" className={input} value={v.telefono} onChange={(e) => set("telefono", e.target.value)} />
      <select required className={`${input} sm:col-span-2`} value={v.equipo} onChange={(e) => set("equipo", e.target.value)} data-testid="select-equipo">
        <option value="">Equipo de interés *</option>
        {PRODUCTOS.map((p) => <option key={p.slug}>{p.nombre}</option>)}
        <option>Aún no lo sé, necesito asesoría</option>
      </select>
      <input placeholder="Institución / clínica" className={input} value={v.institucion} onChange={(e) => set("institucion", e.target.value)} />
      <input placeholder="Cargo" className={input} value={v.cargo} onChange={(e) => set("cargo", e.target.value)} />
      <textarea rows={3} placeholder="Cuéntanos brevemente tu proyecto" className={`${input} sm:col-span-2`} value={v.proyecto} onChange={(e) => set("proyecto", e.target.value)} />
      <label className="flex items-start gap-2 text-xs text-[#5B6478] sm:col-span-2">
        <input required type="checkbox" checked={v.acepto} onChange={(e) => set("acepto", e.target.checked)} className="mt-0.5" />
        Acepto que TECNOCARE use estos datos solo para atender mi solicitud (Ley 29733 de Protección de Datos Personales).
      </label>
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-[#F28C28] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#E57D17] sm:col-span-2" data-testid="button-enviar-cotizacion">
        <MessageCircle className="h-4 w-4" />Enviar por WhatsApp
      </button>
    </form>
  );
}

export default function HomePage() {
  usePageMeta("TECNOCARE — Equipos de ozono médico europeos en el Perú", "Generadores de ozono médico SEDECAL y sistemas de infusión con registro DIGEMID, instalación, capacitación y soporte técnico local en el Perú.");
  useSectionFromQuery();
  const ozono = PRODUCTOS.filter((p) => p.familia === "ozono");
  const infusion = PRODUCTOS.filter((p) => p.familia === "infusion");

  return (
    <SiteShell>
      {/* Hero */}
      <section id="inicio" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="fade-up">
            <Eyebrow>Generadores de ozono médico · Europa</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">Equipos de ozono médico europeos, con <span className="text-[#2F6FDB]">respaldo y servicio</span> en el Perú.</h1>
            <p className="mt-4 max-w-md text-[15px] text-[#5B6478]">Equipamiento para profesionales de la salud, con instalación, capacitación y soporte técnico local.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <WhatsAppButton href={cotizarEquipo()} testId="button-solicitar-cotizacion">Solicitar cotización</WhatsAppButton>
              <button onClick={() => scrollToSection("equipos")} data-testid="button-ver-equipos" className="rounded-md border border-[#D5DAE4] bg-white px-5 py-2.5 text-sm font-medium transition hover:border-[#14213D]">Ver equipos</button>
            </div>
            <p className="mt-5 text-xs text-[#69748A]">Importación por droguería autorizada · registros DIGEMID verificables.</p>
          </div>
          <div className="mx-auto w-full max-w-[90%] md:max-w-[560px]">
            <img src={`${import.meta.env.BASE_URL}om302_hero.png`} alt="Generador de ozono médico OM-302 con medición dual de concentración" className="block h-auto w-full object-contain" />
          </div>
        </div>
      </section>

      {/* Certificaciones */}
      <section className="border-y border-[#E3E7F0] bg-white">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-[13px] font-semibold text-[#3A4560]">
          {CERTIFICACIONES.map((c) => <li key={c} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#1F9D61]" />{c}</li>)}
        </ul>
      </section>

      {/* Por qué */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Por qué TECNOCARE</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Solo vendemos lo que podemos respaldar</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POR_QUE.map((x, i) => { const I = POR_QUE_ICONOS[i]; return (
              <article key={x.titulo} className="pac-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E4EDFB] text-[#2F6FDB]"><I className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold">{x.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5B6478]">{x.texto}</p>
              </article>
            ); })}
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section id="equipos" className="scroll-mt-16 bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Catálogo</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Generadores de ozono médico SEDECAL</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ozono.map((p) => (
              <Link key={p.slug} href={`/equipos/${p.slug}`} className="pac-card group flex flex-col overflow-hidden p-3 transition hover:-translate-y-1" data-testid={`card-equipo-${p.slug}`}>
                <ProductVisual p={p} />
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-center gap-2"><span className="rounded bg-[#EAF0FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2459B5]">{p.etiqueta}</span>{p.bajoPedido && <span className="rounded bg-[#FDEBD8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B45F0E]">Bajo pedido</span>}</div>
                  <h3 className="mt-2 text-lg font-bold">{p.nombre}</h3>
                  <p className="mt-1 flex-1 text-sm text-[#5B6478]">{p.resumen}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F6FDB] transition group-hover:gap-2.5">Ver ficha del equipo <ArrowRight className="h-4 w-4" /></span>
                </div>
              </Link>
            ))}
          </div>
          <h2 className="mt-14 text-2xl font-bold tracking-tight">Sistemas de infusión elastoméricos</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {infusion.map((p) => (
              <Link key={p.slug} href={`/equipos/${p.slug}`} className="pac-card group flex flex-col overflow-hidden p-3 transition hover:-translate-y-1" data-testid={`card-equipo-${p.slug}`}>
                <ProductVisual p={p} />
                <div className="p-3">
                  <span className="rounded bg-[#EAF0FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2459B5]">{p.etiqueta}</span>
                  <h3 className="mt-2 text-lg font-bold">{p.nombre}</h3>
                  <p className="mt-1 text-sm text-[#5B6478]">{p.resumen}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F6FDB] transition group-hover:gap-2.5">Ver ficha del equipo <ArrowRight className="h-4 w-4" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Servicio integral */}
      <section id="servicio" className="scroll-mt-16 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Servicio integral</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">No vendemos equipos sin servicio</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {SERVICIO.map((s, i) => { const I = SERVICIO_ICONOS[i]; return (
              <li key={s.titulo} className="pac-card relative p-5">
                <span className="font-mono text-xs font-bold text-[#F28C28]">0{i + 1}</span>
                <I className="mt-2 h-6 w-6 text-[#2F6FDB]" strokeWidth={1.6} />
                <h3 className="mt-2 font-semibold leading-snug">{s.titulo}</h3>
                <p className="mt-1 text-sm text-[#5B6478]">{s.texto}</p>
              </li>
            ); })}
          </ol>
        </div>
      </section>

      {/* Presencia nacional */}
      <section id="presencia" className="scroll-mt-16 bg-[#14213D] py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <Eyebrow light>Presencia nacional</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Equipos en uso clínico en el Perú</h2>
            <p className="mt-3 text-[15px] text-[#B9C2D6]">Hemos suministrado equipos a hospitales de la red EsSalud. Detalle institucional disponible a solicitud.</p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {PRESENCIA.cifras.map(([n, l]) => <div key={l}><p className="text-4xl font-bold text-[#F28C28]">{n}</p><p className="mt-1 text-sm text-[#B9C2D6]">{l}</p></div>)}
            </div>
          </div>
          <ul className="grid gap-3">
            {PRESENCIA.regiones.map((r) => (
              <li key={r.region} className="flex items-center gap-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F28C28]/15 text-[#F28C28]"><MapPin className="h-5 w-5" /></span>
                <div><p className="font-semibold">{r.region}</p><p className="text-sm text-[#B9C2D6]">{r.area}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Respaldo + fabricante */}
      <section id="respaldo" className="scroll-mt-16 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-2">
          <div>
            <Eyebrow>Respaldo verificable</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Registros y certificaciones</h2>
            <ul className="mt-6 grid gap-3">
              {RESPALDO.map(([t, d]) => <li key={t} className="pac-card flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1F9D61]" /><div><p className="font-semibold">{t}</p><p className="text-sm text-[#5B6478]">{d}</p></div></li>)}
            </ul>
          </div>
          <div className="pac-card flex flex-col justify-between bg-white p-7">
            <div>
              <Eyebrow>Fabricante</Eyebrow>
              <h3 className="mt-2 text-2xl font-bold">SEDECAL · Madrid, España</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5B6478]">Más de tres décadas en electromedicina. TECNOCARE es su representante directo en el Perú. El dossier incluye el certificado CE vigente, declaraciones de conformidad, certificaciones ISO del fabricante y la Declaración de Madrid sobre ozonoterapia, para evaluación técnica, homologación, compras e ingeniería biomédica.</p>
            </div>
            <div className="mt-6"><WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera solicitar el dossier técnico de SEDECAL.")} variant="dark" testId="button-dossier">Solicitar dossier</WhatsAppButton></div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Voces médicas</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Lo que dicen quienes los usan</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {TESTIMONIOS.map((t) => (
              <figure key={t.nombre} className="pac-card p-6">
                <Quote className="h-6 w-6 text-[#F28C28]" />
                <blockquote className="mt-3 text-lg leading-relaxed">«{t.texto}»</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-semibold">{t.nombre}</span> · <span className="text-[#5B6478]">{t.area}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Comunidad */}
      <section id="comunidad" className="scroll-mt-16 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Comunidad TECNOCARE</Eyebrow>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Eventos y capacitaciones</h2>
          <p className="mt-2 text-[15px] text-[#5B6478]">Para profesionales de rehabilitación, terapia física y del dolor. Contenido educativo, no consejo clínico.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {EVENTOS.map((e, i) => (
              <article key={e.titulo} className="pac-card p-5" data-testid={`card-evento-${i}`}>
                <span className="inline-flex items-center gap-1 rounded bg-[#E4EDFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2459B5]"><CalendarDays className="h-3 w-3" />{e.tag}</span>
                <h3 className="mt-2 font-semibold">{e.titulo}</h3>
                <p className="mt-1 text-sm text-[#5B6478]">{e.texto}</p>
                <a href={whatsapp(`Hola TECNOCARE, quisiera inscribirme en «${e.titulo}».`)} target="_blank" rel="noopener noreferrer" data-testid={`button-inscribirme-${i}`}
                  className="mt-4 inline-flex rounded-md border border-[#D5DAE4] px-3 py-1.5 text-[13px] font-medium transition hover:border-[#F28C28] hover:text-[#B45F0E]">Inscribirme por WhatsApp</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cotización */}
      <section id="contacto" className="scroll-mt-16 bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Contáctanos</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">¿Evalúas ozonoterapia con un proveedor que responde?</h2>
            <p className="mt-3 text-[15px] text-[#5B6478]">Completa el formulario y te escribimos con una propuesta para tu especialidad. También puedes conversar directo con un especialista.</p>
            <div className="mt-6"><WhatsAppButton href={whatsapp("Hola TECNOCARE, quisiera conversar con un especialista.")} variant="outline" testId="button-especialista"><MessageCircle className="h-4 w-4" />Conversar con un especialista</WhatsAppButton></div>
          </div>
          <Cotizacion />
        </div>
      </section>
    </SiteShell>
  );
}
