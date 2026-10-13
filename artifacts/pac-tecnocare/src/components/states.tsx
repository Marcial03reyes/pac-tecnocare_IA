import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { errorMessage } from "@/lib/format";

export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="pac-card fade-up flex flex-col items-center px-6 py-10 text-center" role="alert" data-testid="state-error">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FDECEC] text-[#C93B3B]"><AlertTriangle className="h-5 w-5" /></span>
      <p className="mt-3 text-sm font-semibold text-[#14213D]">No se pudo cargar la información</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{errorMessage(error)}</p>
      <button onClick={onRetry} disabled={retrying} data-testid="button-retry"
        className="mt-4 inline-flex items-center gap-2 rounded-md border bg-white px-3.5 py-2 text-sm font-medium text-[#14213D] transition hover:border-[#2F6FDB] hover:text-[#2F6FDB] active:scale-[.98] disabled:opacity-60">
        <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> Reintentar
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="fade-up flex flex-col items-center px-6 py-12 text-center" data-testid="state-empty">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#E4EDFB] text-[#2F6FDB]">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-[#14213D]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Bone({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-[#E8ECF4] ${className}`} />;
}
