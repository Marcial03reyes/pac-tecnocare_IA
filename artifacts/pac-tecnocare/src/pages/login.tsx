import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/auth/auth-provider";
import { supabaseConfigured } from "@/lib/supabase";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function LoginPage() {
  usePageMeta("Acceso PAC — TECNOCARE", "Acceso privado al panel comercial PAC de TECNOCARE.");
  const { signIn, session, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(supabaseConfigured ? null : "La conexión con la base de datos no está configurada.");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && session) navigate("/panel", { replace: true }); }, [loading, session, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Ingresa tu correo y contraseña."); return; }
    setBusy(true); setError(null);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err); else navigate("/panel");
  };

  const input = "w-full rounded-md border border-[#D5DAE4] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2F6FDB] focus:ring-4 focus:ring-[#2F6FDB]/15";
  return (
    <div className="relative grid min-h-[100dvh] place-items-center bg-gradient-to-br from-[#14213D] via-[#1D3266] to-[#2A4A9A] px-4 pb-16 pt-16">
      <Link href="/" className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-white/70 transition hover:text-white" data-testid="link-volver"><ArrowLeft className="h-4 w-4" /> Volver al sitio</Link>
      <form onSubmit={submit} className="fade-up w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(10,18,40,.5)]" data-testid="form-login">
        <div className="flex justify-center"><Logo size="lg" /></div>
        <h1 className="mt-4 text-center text-xl font-bold text-[#14213D]">Acceso PAC</h1>
        <p className="text-center text-xs text-muted-foreground">Panel comercial privado</p>
        <label className="mt-6 block text-[11px] font-medium text-[#5B6478]">Correo electrónico
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-1`} data-testid="input-email" />
        </label>
        <label className="mt-3 block text-[11px] font-medium text-[#5B6478]">Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} mt-1`} data-testid="input-password" />
        </label>
        {error && <p className="mt-3 rounded-md bg-[#FDECEC] px-3 py-2 text-xs text-[#B42F2F]" role="alert" data-testid="text-login-error">{error}</p>}
        <button type="submit" disabled={busy || !supabaseConfigured} data-testid="button-login"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#14213D] py-2.5 text-sm font-semibold text-white transition hover:bg-[#22325A] active:scale-[.99] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Acceso solo para usuarios autorizados de TECNOCARE.</p>
      </form>
      <p className="absolute inset-x-0 bottom-5 text-center text-xs italic text-white/70" data-testid="text-slogan">Víctor vende. PAC se encarga del resto.</p>
    </div>
  );
}
