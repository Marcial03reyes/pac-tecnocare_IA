import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Loader2, MapPin, RotateCw, X, MessageCircle, Mail, ExternalLink, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { VoiceNoteButton } from "@/components/voice-note-modal";
import { useContactApollo, contactChannelUrl } from "@/hooks/use-contact-apollo";
import { useClientes } from "@/hooks/use-pac-data";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { ApolloLead } from "@/lib/apollo-types";
import { APOLLO_SAMPLE, TIER_COLOR, tierOf, type Tier } from "@/lib/apollo-sample";

type Channel = "whatsapp" | "correo";
const SIZE: Record<Tier, number> = { alta: 64, media: 44, baja: 22 };
const RADIUS: Record<Tier, number> = { alta: 0.4, media: 0.66, baja: 0.92 };
const OFFSET: Record<Tier, number> = { alta: -60, media: -20, baja: 15 };

interface Placed { lead: ApolloLead; tier: Tier; x: number; y: number; delay: number }

// Ellipse fits a wide view: rx/ry are % of container width/height.
function place(leads: ApolloLead[]): Placed[] {
  const groups: Record<Tier, ApolloLead[]> = { alta: [], media: [], baja: [] };
  leads.forEach((l) => groups[tierOf(l.afinidad)].push(l));
  const out: Placed[] = [];
  let i = 0;
  (["alta", "media", "baja"] as Tier[]).forEach((t) => {
    const g = groups[t];
    g.forEach((lead, k) => {
      const jitter = t === "baja" ? ((k * 37) % 17) - 8 : 0;
      const ang = ((OFFSET[t] + (360 / g.length) * k + jitter) * Math.PI) / 180;
      const r = RADIUS[t] * (t === "baja" ? 0.9 + ((k * 13) % 10) / 50 : 1);
      out.push({ lead, tier: t, x: 50 + 44 * r * Math.cos(ang), y: 54 + 38 * r * Math.sin(ang), delay: i++ * 70 });
    });
  });
  return out;
}
const DOTS = [[12, 22], [86, 18], [7, 70], [93, 62], [30, 90], [72, 92], [60, 12], [20, 48]];

function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  return m && /[áéíóúñ]|no |error/i.test(m) ? m : "No pudimos guardar el contacto. Revisa tu conexión e intenta otra vez.";
}
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export default function ApolloPage() {
  usePageMeta("Apollo · Prospección — PAC TECNOCARE", "Leads de ejemplo por afinidad y creación de contactos para TECNOCARE.");
  const placed = useMemo(() => place(APOLLO_SAMPLE), []);
  const clientes = useClientes();
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string | number>>({});
  const [picking, setPicking] = useState(false);
  const [fallback, setFallback] = useState<{ id: string; url: string; channel: Channel } | null>(null);
  const mutation = useContactApollo();
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Persisted status: existing rows with same name count as contacted.
  const persisted = useMemo(() => {
    const m = new Map<string, string | number>();
    (clientes.data ?? []).forEach((c) => { if (c.nombre) m.set(norm(c.nombre), c.id); });
    return m;
  }, [clientes.data]);
  const contactedId = (l: ApolloLead) => done[l.id] ?? persisted.get(norm(l.nombre));

  const current = placed.find((p) => p.lead.id === sel) ?? null;
  const choose = (id: string | null) => { if (id !== sel) { mutation.reset(); setPicking(false); } setSel(id); };

  useEffect(() => {
    if (!sel) return;
    const h = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (cardRef.current?.contains(t) || t.closest("[data-apollo-bubble]")) return;
      setSel(null); setPicking(false);
    };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    document.addEventListener("pointerdown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("pointerdown", h); document.removeEventListener("keydown", k); };
  }, [sel]);

  useLayoutEffect(() => {
    const box = boxRef.current, card = cardRef.current;
    if (!current || !box || !card) { setPos(null); return; }
    const W = box.clientWidth, H = box.clientHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    const bx = (current.x / 100) * W, by = (current.y / 100) * H, gap = SIZE[current.tier] / 2 + 14;
    let left = current.x > 50 ? bx - gap - cw : bx + gap;
    if (W < 640) left = (W - cw) / 2;
    left = Math.max(8, Math.min(left, W - cw - 8));
    let top = W < 640 ? (by > H / 2 ? by - gap - ch : by + gap) : by - ch / 2;
    top = Math.max(8, Math.min(top, H - ch - 8));
    setPos({ left, top });
  }, [current, picking, mutation.isError, fallback, done]);

  const contactar = async (lead: ApolloLead, channel: Channel) => {
    const url = contactChannelUrl(lead, channel);
    setFallback(null);
    // Open WhatsApp tab synchronously within the user gesture, navigate after save.
    const win = channel === "whatsapp" ? window.open("about:blank", "_blank") : null;
    try {
      const res = await mutation.mutateAsync(lead);
      setDone((d) => ({ ...d, [lead.id]: res.clienteId }));
      setPicking(false);
      if (channel === "whatsapp") {
        if (win && !win.closed) { win.opener = null; win.location.href = url; }
        else setFallback({ id: lead.id, url, channel });
      } else {
        window.location.href = url;
        setFallback({ id: lead.id, url, channel });
      }
    } catch {
      win?.close();
    }
  };

  const cid = current ? contactedId(current.lead) : undefined;

  return (
    <div className="-mx-1 sm:mx-0">
      <div ref={boxRef} className="fade-up relative h-[clamp(560px,78dvh,760px)] w-full overflow-hidden rounded-2xl bg-[#14213D]" data-testid="view-apollo">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_54%,rgba(47,111,219,.28),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <header className="absolute left-5 right-5 top-5 z-30 flex items-start justify-between gap-3 sm:left-7 sm:right-7 sm:top-6">
          <div className="pointer-events-none min-w-0">
          <p className="text-[10px] font-bold tracking-[.28em] text-[#F28C28]">APOLLO · PROSPECCIÓN</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-white sm:text-[32px]">Leads cerca de TECNOCARE</h1>
          <p className="mt-2 text-[10px] text-[#B9C2D6]" data-testid="text-datos-ejemplo">Datos de ejemplo · integración Apollo próximamente</p>
          </div>
          <div className="shrink-0"><VoiceNoteButton compact /></div>
        </header>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[0.4, 0.66, 0.92].map((r) => <ellipse key={r} cx="50" cy="54" rx={44 * r} ry={38 * r} fill="none" stroke="rgba(185,194,214,.22)" strokeWidth=".18" strokeDasharray="0.8 1.2" vectorEffect="non-scaling-stroke" />)}
          {placed.filter((p) => contactedId(p.lead) !== undefined).map((p) => (
            <line key={p.lead.id} x1="50" y1="54" x2={p.x} y2={p.y} pathLength={100} className="orbit-line" stroke="#1F9D61" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {DOTS.map(([x, y], i) => (
          <span key={i} className="orbit-drift pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#B9C2D6]/40" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 900}ms` }} />
        ))}

        <div className="absolute left-1/2 top-[54%] z-10 grid h-[clamp(96px,16vw,148px)] w-[clamp(96px,16vw,148px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white px-3 shadow-[0_0_0_10px_rgba(47,111,219,.22),0_0_60px_18px_rgba(47,111,219,.35)]" data-testid="img-apollo-centro">
          <Logo size="sm" className="w-full justify-center [&_img]:h-auto [&_img]:w-full" />
        </div>

        {placed.map((p) => {
          const active = sel === p.lead.id;
          const s = SIZE[p.tier];
          const color = TIER_COLOR[p.tier];
          const contacted = contactedId(p.lead) !== undefined;
          return (
            <div key={p.lead.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: active ? 25 : 15 }}>
              <div className="orbit-pop" style={{ animationDelay: `${p.delay}ms` }}>
                <div className={p.tier === "baja" ? "orbit-drift" : "orbit-float"} style={{ animationDelay: `${(p.delay * 3) % 5000}ms` }}>
                  <div className="relative flex items-center">
                    <button type="button" data-apollo-bubble onClick={() => choose(active ? null : p.lead.id)} aria-pressed={active}
                      aria-label={`${p.lead.institucion}${contacted ? ", contactado" : ""}`} data-testid={`button-lead-${p.lead.id}`}
                      className="relative shrink-0 rounded-full outline-none transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-white/70"
                      style={{ width: s, height: s, background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color})`, boxShadow: `0 0 ${s * 0.5}px ${s * 0.12}px ${color}55` }}>
                      {active && <><span className="absolute -inset-1.5 rounded-full border-2 border-[#F28C28]" /><span className="apollo-ring absolute -inset-1.5 rounded-full border-2 border-[#F28C28]" /></>}
                      {contacted && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[#14213D] bg-[#1F9D61]" />}
                    </button>
                    {p.tier === "alta" && (
                      <span className={`pointer-events-none absolute w-[80px] text-[9px] font-medium leading-tight text-white sm:w-[150px] sm:text-[11px] ${p.x > 50 ? "right-full mr-2 text-right sm:left-full sm:right-auto sm:ml-2 sm:mr-0 sm:text-left" : "right-full mr-2 text-right"}`}>{p.lead.institucion}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <ul className="absolute bottom-4 left-5 z-20 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#B9C2D6]" data-testid="legend-apollo">
          {([["alta", "Afinidad alta (80+)"], ["media", "Media (50–79)"], ["baja", "Baja (<50)"]] as [Tier, string][]).map(([t, l]) => (
            <li key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLOR[t] }} />{l}</li>
          ))}
        </ul>

        {current && (
          <div ref={cardRef} key={current.lead.id} className="apollo-card absolute z-40 w-[min(300px,calc(100%-16px))] rounded-xl bg-white p-4 shadow-[0_18px_50px_-12px_rgba(0,0,0,.55)]"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }} data-testid="card-lead">
            <button onClick={() => choose(null)} aria-label="Cerrar" className="absolute right-2.5 top-2.5 rounded p-1 text-muted-foreground hover:text-[#14213D]" data-testid="button-cerrar-lead"><X className="h-4 w-4" /></button>
            <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: TIER_COLOR[current.tier] }} data-testid="text-afinidad">Afinidad {current.lead.afinidad}%</span>
            <h2 className="mt-2 pr-5 text-base font-bold leading-tight text-[#14213D]">{current.lead.nombre}</h2>
            <p className="text-[13px] font-medium text-[#2F6FDB]">{current.lead.institucion}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{current.lead.especialidad} · {current.lead.ciudad}</p>
            <p className="mt-2 rounded-md bg-[#F4F6FB] p-2.5 text-[12px] leading-snug text-[#14213D]">{current.lead.nota}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">Ejemplo · {current.lead.telefono} · {current.lead.email} <span className="font-semibold">(ficticios)</span></p>

            {cid !== undefined ? (
              <Link href={`/panel/clientes?tab=leads&contacto=${encodeURIComponent(String(cid))}`} data-testid="link-ver-en-leads"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#1F9D61] py-2 text-[13px] font-semibold text-white transition hover:bg-[#188452]">
                Contactado ✓ · Ver en Leads
              </Link>
            ) : picking ? (
              <div className="mt-3 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => contactar(current.lead, "whatsapp")} disabled={mutation.isPending} data-testid="button-contactar-whatsapp"
                    className="flex items-center justify-center gap-1.5 rounded-md bg-[#1F9D61] py-2 text-[13px] font-semibold text-white hover:bg-[#188452] disabled:opacity-60"><MessageCircle className="h-4 w-4" />WhatsApp</button>
                  <button onClick={() => contactar(current.lead, "correo")} disabled={mutation.isPending} data-testid="button-contactar-correo"
                    className="flex items-center justify-center gap-1.5 rounded-md bg-[#2F6FDB] py-2 text-[13px] font-semibold text-white hover:bg-[#245BBC] disabled:opacity-60"><Mail className="h-4 w-4" />Correo</button>
                </div>
                {mutation.isPending ? <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Guardando contacto…</p>
                  : <button onClick={() => setPicking(false)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#14213D]" data-testid="button-volver-canal"><ArrowLeft className="h-3 w-3" />Volver</button>}
              </div>
            ) : (
              <button onClick={() => { mutation.reset(); setPicking(true); }} data-testid="button-contactar"
                className="mt-3 flex w-full items-center justify-center rounded-md bg-[#F28C28] py-2 text-[13px] font-semibold text-white transition hover:bg-[#E07B17]">Contactar</button>
            )}
            {fallback && fallback.id === current.lead.id && (
              <a href={fallback.url} target={fallback.channel === "whatsapp" ? "_blank" : undefined} rel="noreferrer" data-testid="link-fallback-canal"
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#2F6FDB] underline">
                <ExternalLink className="h-3 w-3" />{fallback.channel === "whatsapp" ? "¿No se abrió WhatsApp? Ábrelo aquí" : "¿No se abrió tu correo? Ábrelo aquí"}
              </a>
            )}
            {mutation.isError && cid === undefined && (
              <p role="alert" className="mt-2 rounded-md bg-[#FDECEC] p-2 text-[11px] text-[#B42F2F]" data-testid="text-contactar-error">
                {errMsg(mutation.error)}
                <button onClick={() => mutation.reset()} className="ml-1 inline-flex items-center gap-1 font-semibold underline"><RotateCw className="h-3 w-3" />Reintentar</button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
