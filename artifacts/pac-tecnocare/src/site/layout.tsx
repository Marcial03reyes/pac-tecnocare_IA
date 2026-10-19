import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Mail, MapPin, Menu, MessageCircle, Phone, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { CONTACTO, PRODUCTOS, whatsapp, cotizarEquipo } from "./data";

/** Secciones de la portada a las que se puede saltar desde cualquier página. */
export const SECCIONES = [["Equipos", "equipos"], ["Servicio", "servicio"], ["Respaldo", "respaldo"], ["Comunidad", "comunidad"]] as const;

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** En la portada: al llegar con ?s=<id> (desde otra página) baja a esa sección. */
export function useSectionFromQuery() {
  const [location] = useLocation();
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("s");
    if (!id) return;
    const t = setTimeout(() => scrollToSection(id), 80);
    return () => clearTimeout(t);
  }, [location]);
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`font-mono text-[11px] font-semibold uppercase tracking-[.2em] ${light ? "text-[#F28C28]" : "text-[#2F6FDB]"}`}>{children}</p>;
}

export function WhatsAppButton({ href, children, variant = "primary", testId }: { href: string; children: ReactNode; variant?: "primary" | "outline" | "dark"; testId?: string }) {
  const styles = variant === "primary"
    ? "bg-[#F28C28] text-white shadow-[0_6px_16px_-6px_rgba(242,140,40,.6)] hover:bg-[#E57D17] hover:-translate-y-0.5"
    : variant === "dark" ? "bg-[#14213D] text-white hover:bg-[#22325A]"
      : "border border-[#D5DAE4] bg-white text-[#14213D] hover:border-[#14213D]";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition active:translate-y-0 ${styles}`}>
      {children}
    </a>
  );
}

function NavItem({ label, id, onDone }: { label: string; id: string; onDone?: () => void }) {
  const [location, navigate] = useLocation();
  const go = () => {
    onDone?.();
    if (location === "/") scrollToSection(id);
    else navigate(`/?s=${id}`);
  };
  return (
    <button onClick={go} data-testid={`nav-${id}`}
      className="relative py-1 text-left text-[13px] font-medium text-[#3A4560] transition hover:text-[#2F6FDB] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded after:bg-[#F28C28] after:transition-transform hover:after:scale-x-100">
      {label}
    </button>
  );
}

function PageLink({ href, label, onDone }: { href: string; label: string; onDone?: () => void }) {
  const [location] = useLocation();
  const active = location === href;
  return (
    <Link href={href} onClick={onDone} data-testid={`nav-${href.slice(1)}`}
      className={`py-1 text-[13px] font-medium transition hover:text-[#2F6FDB] ${active ? "text-[#2F6FDB]" : "text-[#3A4560]"}`}>
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const close = () => setOpen(false);
  const items = (
    <>
      {SECCIONES.map(([l, id]) => <NavItem key={id} label={l} id={id} onDone={close} />)}
      <PageLink href="/nosotros" label="Nosotros" onDone={close} />
      <PageLink href="/recursos" label="Recursos" onDone={close} />
    </>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-[#E3E7F0] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <button onClick={() => (location === "/" ? window.scrollTo({ top: 0, behavior: "smooth" }) : navigate("/"))} data-testid="link-logo" aria-label="Ir al inicio"><Logo /></button>
        <nav className="hidden flex-1 gap-5 md:flex">{items}</nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={cotizarEquipo()} target="_blank" rel="noopener noreferrer" data-testid="button-cotizar"
            className="rounded-md bg-[#14213D] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#22325A] active:scale-[.98]">Cotizar</a>
          <button onClick={() => setOpen((v) => !v)} className="rounded-md p-1.5 text-[#3A4560] md:hidden" aria-label="Menú" aria-expanded={open} data-testid="button-menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && <nav className="flex flex-col gap-2 border-t border-[#E3E7F0] bg-white px-5 py-3 md:hidden">{items}</nav>}
    </header>
  );
}

export function SiteFooter() {
  const [location, navigate] = useLocation();
  const ir = (id: string) => (location === "/" ? scrollToSection(id) : navigate(`/?s=${id}`));
  const ozono = PRODUCTOS.filter((p) => p.familia === "ozono");
  return (
    <footer className="bg-[#14213D] pt-14 text-[#B9C2D6]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Equipos de ozono médico europeos y sistemas de infusión, con respaldo y servicio técnico en el Perú.</p>
          <div className="mt-4 flex gap-3 text-sm">
            {CONTACTO.redes.map((r) => <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#F28C28]">{r.nombre}</a>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-white">Equipos</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {ozono.map((p) => <li key={p.slug}><Link href={`/equipos/${p.slug}`} className="hover:text-white">{p.nombre}</Link></li>)}
            <li><Link href="/equipos/easyflow-r" className="hover:text-white">Easyflow-R</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-white">Empresa</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link href="/nosotros" className="hover:text-white">Nosotros</Link></li>
            <li><button onClick={() => ir("servicio")} className="hover:text-white">Servicio integral</button></li>
            <li><button onClick={() => ir("presencia")} className="hover:text-white">Presencia nacional</button></li>
            <li><button onClick={() => ir("respaldo")} className="hover:text-white">Respaldo</button></li>
            <li><Link href="/recursos" className="hover:text-white">Recursos</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-white">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={whatsapp()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" />{CONTACTO.telefono}</a></li>
            <li><a href={`mailto:${CONTACTO.correo}`} className="inline-flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4" />{CONTACTO.correo}</a></li>
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{CONTACTO.direccion}</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 px-5 py-6 text-xs leading-relaxed text-[#8E99B3]">
        <p>Los equipos comercializados cuentan con registro sanitario DIGEMID. La información de este sitio describe características y uso previsto; no constituye indicación ni recomendación terapéutica y no reemplaza el criterio del profesional de la salud.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {CONTACTO.razonSocial} · SEDECAL® y Easyflow® son marcas de sus respectivos fabricantes.</p>
          <Link href="/login" className="text-[#8E99B3] hover:text-white" data-testid="link-footer-pac">Acceso equipo comercial</Link>
        </div>
      </div>
    </footer>
  );
}

export function FloatingWhatsApp() {
  return (
    <a href={whatsapp()} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp" data-testid="button-whatsapp-flotante"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#1F9D61] text-white shadow-[0_12px_30px_-8px_rgba(31,157,97,.7)] transition hover:scale-105">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-[100dvh] bg-[#F4F6FB] text-[#14213D]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <FloatingWhatsApp />
    </div>
  );
}
