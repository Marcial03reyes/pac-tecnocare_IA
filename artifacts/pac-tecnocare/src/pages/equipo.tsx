import { Link } from "wouter";
import { ArrowRight, CalendarCheck, CheckCircle2, ChevronRight, FileDown } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cotizarEquipo, producto, whatsapp } from "@/site/data";
import { Eyebrow, SiteShell, WhatsAppButton } from "@/site/layout";
import { ProductVisual } from "@/site/visual";

export default function EquipoPage({ slug }: { slug: string }) {
  const p = producto(slug);
  usePageMeta(p ? `${p.nombre} — TECNOCARE` : "Equipo no encontrado — TECNOCARE", p ? `${p.subtitulo}. ${p.registro.join(" · ")}.` : "Equipo no encontrado.");
  if (!p) {
    return <SiteShell><div className="mx-auto max-w-6xl px-5 py-24 text-center"><h1 className="text-2xl font-bold">Equipo no encontrado</h1><Link href="/" className="mt-4 inline-block font-semibold text-[#2F6FDB]">Volver al inicio</Link></div></SiteShell>;
  }
  const relacionados = p.relacionados.map(producto).filter((x) => !!x);
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-8">
        <nav className="flex items-center gap-1 text-xs text-[#69748A]" aria-label="Ruta">
          <Link href="/?s=equipos" className="hover:text-[#2F6FDB]">Equipos</Link><ChevronRight className="h-3 w-3" />
          <span>{p.familia === "ozono" ? "Generadores de ozono" : "Infusión elastomérica"}</span><ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-[#14213D]">{p.nombre}</span>
        </nav>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-center">
          <div>
            <Eyebrow>{p.familia === "ozono" ? "SEDECAL · España" : "Adria Med · Italia"} · {p.etiqueta}</Eyebrow>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{p.nombre}</h1>
            <p className="mt-2 text-lg font-medium text-[#2F6FDB]">{p.subtitulo}</p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#5B6478]">{p.descripcion}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {p.registro.map((r) => <li key={r} className="rounded-full border border-[#D5DAE4] bg-white px-3 py-1 text-xs font-semibold text-[#3A4560]">{r}</li>)}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <WhatsAppButton href={cotizarEquipo(p.nombre)} testId="button-cotizar-equipo">Solicitar cotización</WhatsAppButton>
              {p.ficha && <WhatsAppButton href={p.ficha} variant="outline" testId="button-ficha-tecnica"><FileDown className="h-4 w-4" />Descargar ficha técnica</WhatsAppButton>}
            </div>
          </div>
          <div className="relative">
            <ProductVisual p={p} size="lg" />
            <div className="absolute -bottom-5 left-5 rounded-xl bg-[#14213D] px-5 py-3 text-white shadow-lg">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#B9C2D6]">{p.destacado.label}</p>
              <p className="text-2xl font-bold">{p.destacado.valor}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow>Características principales</Eyebrow>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.caracteristicas.map((c, i) => (
              <article key={c.titulo} className="pac-card p-5">
                <span className="font-mono text-xs font-bold text-[#F28C28]">0{i + 1}</span>
                <h3 className="mt-2 font-semibold leading-snug">{c.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5B6478]">{c.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow>Especificaciones técnicas</Eyebrow>
            <p className="mt-1 text-xs text-[#69748A]">Datos del fabricante.</p>
            <dl className="pac-card mt-4 divide-y divide-[#EEF1F6]">
              {p.specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[1fr_1.3fr] gap-4 px-5 py-3 text-sm"><dt className="text-[#5B6478]">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div>
            <Eyebrow>Contenido de la entrega</Eyebrow>
            <ul className="pac-card mt-4 space-y-3 p-5">
              {p.entrega.map((e) => <li key={e} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F9D61]" />{e}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <WhatsAppButton href={cotizarEquipo(p.nombre)}>Solicitar cotización</WhatsAppButton>
              <WhatsAppButton href={whatsapp(`Hola TECNOCARE, quisiera agendar una demostración del ${p.nombre}.`)} variant="outline" testId="button-demo"><CalendarCheck className="h-4 w-4" />Agendar demostración</WhatsAppButton>
            </div>
          </div>
        </div>
      </section>

      {relacionados.length > 0 && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-5">
            <Eyebrow>Otros equipos de la familia</Eyebrow>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {relacionados.map((r) => (
                <Link key={r!.slug} href={`/equipos/${r!.slug}`} className="pac-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5">
                  <div><p className="font-bold">{r!.nombre}</p><p className="text-sm text-[#5B6478]">{r!.etiqueta}</p></div>
                  <ArrowRight className="h-4 w-4 text-[#2F6FDB] transition group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
