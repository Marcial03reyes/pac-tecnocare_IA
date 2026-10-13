import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const userRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      userRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (active) { setSession(null); setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const uid = s?.user.id ?? null;
      if (uid !== userRef.current) {
        qc.clear();
        userRef.current = uid;
      }
      setSession(s);
      setLoading(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [qc]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return "La conexión con la base de datos no está configurada.";
    let error;
    try {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    } catch {
      return "No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.";
    }
    if (!error) return null;
    const m = error.message.toLowerCase();
    if (m.includes("invalid")) return "Correo o contraseña incorrectos.";
    if (m.includes("confirm")) return "Tu correo aún no ha sido confirmado.";
    if (m.includes("fetch") || m.includes("network")) return "No pudimos conectar con el servidor. Revisa tu conexión.";
    return "No fue posible iniciar sesión. Intenta nuevamente.";
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error("No pudimos cerrar la sesión. Intenta nuevamente.");
    }
    qc.clear();
    userRef.current = null;
    setSession(null);
  };

  return <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
