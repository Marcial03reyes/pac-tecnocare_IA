import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/auth/auth-provider";
import { Logo } from "@/components/logo";

export function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => { if (!loading && !session) navigate("/login", { replace: true }); }, [loading, session, navigate]);
  if (loading || !session) {
    return <div className="grid min-h-[100dvh] place-items-center bg-[#F4F6FB]"><div className="animate-pulse"><Logo /></div></div>;
  }
  return <>{children}</>;
}
