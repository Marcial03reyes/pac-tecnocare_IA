import { useMemo, useState } from "react";
import { Loader2, MapPin, RotateCw, X, Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { LogoIcon } from "@/components/logo";
import { useContactApollo } from "@/hooks/use-contact-apollo";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { ApolloLead } from "@/lib/apollo-types";
import { APOLLO_SAMPLE, TIER_COLOR, tierOf, type Tier } from "@/lib/apollo-sample";

const RING: Record<Tier, number> = { alta: 19, media: 31, baja: 43 };
const OFFSET: Record<Tier, number> = { alta: -70, media: -35, baja: -100 };

interface Placed { lead: ApolloLead; tier: Tier; x: number; y: number; size: number; delay: number }

function place(leads: ApolloLead[]): Placed[] {
  const groups: Record<Tier, ApolloLead[]> = { alta: [], media: [], baja: [] };
  leads.forEach((l) => groups[tierOf(l.afinidad)].push(l));
  const out: Placed[] = [];
  let i = 0;
  (["alta", "media", "baja"] as Tier[]).forEach((t) => {
    const g = groups[t];
    g.forEach((lead, k) => {
      const ang = ((OFFSET[t] + (360 / g.length) * k) * Math.PI) / 180;
      out.push({ lead, tier: t, x: 50 + RING[t] * Math.cos(ang), y: 50 + RING[t] * Math.sin(ang), size: 34 + (lead.afinidad / 100) * 22, delay: i++ * 70 });
    });
  });
  return out;
}

function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  return m && /[áéíóúñ]|no |error/i.test(m) ? m : "No pudimos crear el contacto. Revisa tu conexión e intenta otra vez.";
}

export default function ApolloPage() {
  usePageMeta("Apollo · Prospección — PAC TECNOCARE", "Leads de ejemplo por afinidad y creación de contactos para TECNOCARE.");
  const placed = useMemo(() => place(APOLLO_SAMPLE), []);
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const mutation = useContactApollo();
  const current = placed.find((p) => p.lead.id === sel) ?? null;

  const choose = (id: string | null) => { if (id !== sel) mutation.reset(); setSel(id); };
  const contactar = async (lead: ApolloLead) => {
    try {
      const res = await mutation.mutateAsync(lead);
      setDone((d) => ({ ...d, [lead.id]: res.created }));
    } catch { /* error shown from mutation state */ }
  };

  return (
    <div>
      <PageHeader eyebrow="Apollo · Prospección" title="Leads cerca de TECNOCARE"
        action={<span className="rounded-full border border-[#D5DAE4] bg-white px-3 py-1 text-[11px] text-[#5B6478]" data-testid="text-datos-ejemplo">Datos de ejemplo · integración Apollo próximamente</span>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="fade-up relative overflow-hidden rounded-2xl bg-[#14213D] p-3 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(47,111,219,.25),transparent_60%)]" />
          <div className="relative mx-auto aspect-square w-full max-w-[620px]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <g className="orbit-spin">
                {Object.values(RING).map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(185,194,214,.35)" strokeWidth=".25" strokeDasharray="1 1.4" />)}
              </g>
              {placed.filter((p) => p.lead.id in done).map((p) => (
                <line key={p.lead.id} x1="50" y1="50" x2={p.x} y2={p.y} pathLength={100} className="orbit-line" stroke={TIER_COLOR[p.tier]} strokeWidth=".45" strokeLinecap="round" />
              ))}
            </svg>
            <div className="absolute left-1/2 top-1/2 grid h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,.08)]">
              <LogoIcon className="h-[62%] w-[62%]" />
            </div>
            {placed.map((p) => {
              const active = sel === p.lead.id;
              return (
                <div key={p.lead.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: active ? 20 : 10 }}>
                  <div className="orbit-pop" style={{ animationDelay: `${p.delay}ms` }}>
                    <div className="orbit-float" style={{ animationDelay: `${(p.delay * 3) % 5000}ms` }}>
                      <button type="button" onClick={() => choose(active ? null : p.lead.id)} aria-pressed={active}
                        aria-label={`${p.lead.institucion}, afinidad ${p.lead.afinidad}%`} data-testid={`button-lead-${p.lead.id}`}
                        className="apollo-bubble group relative grid place-items-center rounded-full font-bold text-white outline-none transition-transform duration-200 hover:scale-125 focus-visible:scale-125 focus-visible:ring-4 focus-visible:ring-white/60"
                        style={{ width: `clamp(26px, ${p.size / 6.2}vw, ${p.size}px)`, height: `clamp(26px, ${p.size / 6.2}vw, ${p.size}px)`, background: TIER_COLOR[p.tier], boxShadow: active ? "0 0 0 3px #fff" : "0 4px 12px rgba(0,0,0,.25)" }}>
                        <span className="text-[10px] sm:text-[11px]">{p.lead.afinidad}</span>
                        {p.lead.id in done && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#1F9D61]"><Check className="h-2.5 w-2.5" /></span>}
                        <span className="apollo-tooltip pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[#14213D] shadow-lg">{p.lead.institucion}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#B9C2D6] sm:absolute sm:bottom-5 sm:left-5 sm:mt-0 sm:flex-col" data-testid="legend-apollo">
            {([["alta", "Más cerca = más afinidad"], ["media", "Interés medio"], ["baja", "Lejano"]] as [Tier, string][]).map(([t, l]) => (
              <li key={t} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLOR[t] }} />{l}</li>
            ))}
          </ul>
        </div>

        <aside className="fade-up">
          {current ? (
            <div key={current.lead.id} className="pac-card relative p-5" data-testid="card-lead">
              <button onClick={() => choose(null)} aria-label="Cerrar" className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-[#14213D]" data-testid="button-cerrar-lead"><X className="h-4 w-4" /></button>
              <span className="inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: TIER_COLOR[current.tier] }} data-testid="text-afinidad">Afinidad {current.lead.afinidad}%</span>
              <h2 className="mt-3 text-lg font-bold leading-tight text-[#14213D]">{current.lead.nombre}</h2>
              <p className="text-sm font-medium text-[#2F6FDB]">{current.lead.institucion}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{current.lead.especialidad} · {current.lead.ciudad}</p>
              <p className="mt-2 text-[11px] font-medium text-[#5B6478]">{current.lead.ofreceOzono ? "Ya ofrece ozono" : "Aún no ofrece ozono"}</p>
              <p className="mt-3 rounded-lg bg-[#F4F6FB] p-3 text-sm text-[#14213D]">{current.lead.nota}</p>
              {current.lead.id in done ? (
                <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#1F9D61] py-2.5 text-sm font-semibold text-white" data-testid="status-contacto">
                  {done[current.lead.id] ? "Contacto creado ✓" : "Contacto existente"}
                </div>
              ) : (
                <button onClick={() => contactar(current.lead)} disabled={mutation.isPending} data-testid="button-contactar"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#F28C28] py-2.5 text-sm font-semibold text-white transition hover:bg-[#E07B17] disabled:opacity-60">
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{mutation.isPending ? "Creando contacto…" : "Contactar"}
                </button>
              )}
              {mutation.isError && !(current.lead.id in done) && (
                <p role="alert" className="mt-3 rounded-md bg-[#FDECEC] p-2.5 text-xs text-[#B42F2F]" data-testid="text-contactar-error">
                  {errMsg(mutation.error)}
                  <button onClick={() => contactar(current.lead)} className="ml-1 inline-flex items-center gap-1 font-semibold underline"><RotateCw className="h-3 w-3" />Reintentar</button>
                </p>
              )}
            </div>
          ) : (
            <div className="pac-card p-5 text-sm text-muted-foreground" data-testid="card-lead-vacio">
              <Sparkles className="mb-2 h-5 w-5 text-[#F28C28]" />
              <p className="font-semibold text-[#14213D]">Elige una burbuja</p>
              <p className="mt-1">Cada burbuja es una clínica. Mientras más cerca del centro, más afinidad con TECNOCARE. Al contactar, se crea en Clientes con próximo contacto hoy.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
