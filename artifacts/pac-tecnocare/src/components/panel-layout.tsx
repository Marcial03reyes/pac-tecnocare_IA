import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, Phone, MessageCircle, Orbit, BarChart3, Route, LogOut, Menu, X, Mic, MoreHorizontal } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/auth/auth-provider";
import { VoiceNoteButton } from "@/components/voice-note-modal";
import { useSeguimientos } from "@/hooks/use-pac-data";
import { useToast } from "@/hooks/use-toast";
import { todayLima } from "@/lib/format";
import { GranolaNotice } from "@/components/granola-notice";

const NAV = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/clientes", label: "Contactos", icon: Users },
  { href: "/panel/embudo", label: "Ruta de venta", icon: Route },
  { href: "/panel/llamadas", label: "Llamadas", icon: Phone },
  { href: "/panel/asistente", label: "Asistente PAC", icon: MessageCircle },
  { href: "/panel/ozonar", label: "Ozonar", icon: Orbit },
  { href: "/panel/reportes", label: "Reportes", icon: BarChart3 },
];

export function PanelLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const seg = useSeguimientos();
  const { toast } = useToast();
  const reminded = useRef(false);
  useEffect(() => {
    if (reminded.current || !seg.data) return;
    reminded.current = true;
    const hoy = todayLima();
    const list = seg.data.filter((c) => c.proximo_contacto_fecha?.slice(0, 10) === hoy);
    if (!list.length) return;
    const names = list.slice(0, 3).map((c) => c.nombre || c.institucion || "un cliente");
    const extra = list.length > 3 ? ` y ${list.length - 3} más` : "";
    toast({ title: "Recordatorio", description: `Recordatorio: hoy toca llamar a ${names.join(", ")}${extra}` });
  }, [seg.data, toast]);

  const logout = async () => {
    setLeaving(true);
    setLogoutError(null);
    try {
      await signOut();
      navigate("/login");
    } catch {
      setLogoutError("No pudimos cerrar la sesión. Intenta nuevamente.");
    } finally {
      setLeaving(false);
    }
  };

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link href="/panel" onClick={() => setOpen(false)} className="mb-5 flex justify-center rounded-lg bg-white py-2.5" data-testid="link-panel-logo"><Logo size="sm" /></Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== "/panel" && location.startsWith(href));
        return (
          <div key={href} className="flex items-center gap-1">
            <Link href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              className={`group flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-[#2F6FDB] text-white shadow-sm" : "text-[#B9C2D6] hover:bg-white/5 hover:text-white"}`}>
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" /> {label}
            </Link>
            {label === "Contactos" && <div onClick={() => setOpen(false)}><GranolaNotice compact /></div>}
          </div>
        );
      })}
      <div className="mt-auto border-t border-white/10 pt-3">
        <p className="truncate px-3 pb-2 text-[11px] text-[#7F8BA5]" data-testid="text-user-email">{session?.user.email ?? ""}</p>
        {logoutError && <p role="alert" className="px-3 pb-2 text-xs text-orange-200">{logoutError}</p>}
        <button onClick={logout} disabled={leaving} data-testid="button-logout"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-[#B9C2D6] transition hover:bg-white/5 hover:text-white disabled:opacity-60">
          <LogOut className="h-4 w-4" /> {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F4F6FB]">
      <aside className="fixed inset-y-0 left-0 hidden w-[208px] bg-[#14213D] md:block">{nav}</aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#14213D] px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] md:hidden">
        <Logo light size="sm" />
        <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" data-testid="button-menu" className="rounded-md p-1.5 text-white hover:bg-white/10"><Menu className="h-5 w-5" /></button></div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#14213D]/50" onClick={() => setOpen(false)} />
          <aside className="fade-up absolute inset-y-0 left-0 w-64 bg-[#14213D]">
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute right-2 top-2 rounded p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
            {nav}
          </aside>
        </div>
      )}
      <main className="pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0 md:pl-[208px]"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-8">{children}</div></main>
      <MobileTabBar location={location} onMore={() => setOpen(true)} />
    </div>
  );
}

const TABS = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/clientes", label: "Contactos", icon: Users },
  { href: "/panel/llamadas", label: "Llamadas", icon: Phone },
];

/** Barra inferior solo en celular: lo que Víctor usa con el pulgar; el resto queda en "Más". */
function MobileTabBar({ location, onMore }: { location: string; onMore: () => void }) {
  const [, navigate] = useLocation();
  const isActive = (href: string) => location === href || (href !== "/panel" && location.startsWith(href));
  const item = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${active ? "text-[#2F6FDB]" : "text-[#5B6478]"}`;
  const tab = ({ href, label, icon: Icon }: (typeof TABS)[number]) => (
    <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={item(isActive(href))} data-testid={`tab-mobile-${label.toLowerCase()}`}>
      <Icon className="h-[22px] w-[22px]" /> {label}
    </Link>
  );
  const moreActive = !TABS.some((t) => isActive(t.href)) && !location.startsWith("/panel/asistente");
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E3E7F0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex h-[68px] max-w-md items-stretch px-2">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <div className="flex flex-1 items-start justify-center">
          <button type="button" aria-label="Grabar nota de voz" data-testid="tab-mobile-nota-voz"
            onClick={() => { navigate("/panel/asistente"); window.dispatchEvent(new Event("pac-focus-composer")); }}
            className="-mt-5 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#F28C28] text-white shadow-[0_8px_20px_rgba(242,140,40,.45)] ring-4 ring-white transition active:scale-95">
            <Mic className="h-7 w-7" />
          </button>
        </div>
        {tab(TABS[2])}
        <button type="button" onClick={onMore} className={item(moreActive)} data-testid="tab-mobile-mas">
          <MoreHorizontal className="h-[22px] w-[22px]" /> Más
        </button>
      </div>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs text-muted-foreground" data-testid="text-greeting">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-[#14213D]" data-testid="text-page-title">{title}</h1>
      </div>
       <div className="ml-auto flex shrink-0 items-center gap-2">{action}<span className="hidden md:inline-flex"><VoiceNoteButton /></span></div>
    </div>
  );
}
