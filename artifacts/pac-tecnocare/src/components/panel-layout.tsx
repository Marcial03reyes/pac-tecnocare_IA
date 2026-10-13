import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, Phone, Mic, Orbit, BarChart3, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/auth/auth-provider";

const NAV = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/clientes", label: "Clientes", icon: Users },
  { href: "/panel/llamadas", label: "Llamadas", icon: Phone },
  { href: "/panel/notas-de-voz", label: "Notas de voz", icon: Mic },
  { href: "/panel/apollo", label: "Apollo", icon: Orbit },
  { href: "/panel/reportes", label: "Reportes", icon: BarChart3 },
];

export function PanelLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { signOut, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

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
      <Link href="/panel" onClick={() => setOpen(false)} className="mb-5 flex justify-center rounded-lg bg-white py-2.5" data-testid="link-panel-logo"><Logo /></Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== "/panel" && location.startsWith(href));
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
            className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-[#2F6FDB] text-white shadow-sm" : "text-[#B9C2D6] hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> {label}
          </Link>
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
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#14213D] px-4 py-3 md:hidden">
        <Logo light />
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" data-testid="button-menu" className="rounded-md p-1.5 text-white hover:bg-white/10"><Menu className="h-5 w-5" /></button>
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
      <main className="md:pl-[208px]"><div className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-8">{children}</div></main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs text-muted-foreground" data-testid="text-greeting">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-[#14213D]" data-testid="text-page-title">{title}</h1>
      </div>
      {action}
    </div>
  );
}
