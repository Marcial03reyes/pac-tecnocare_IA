import { Mic } from "lucide-react";
import { useLocation } from "wouter";

export function VoiceNoteButton({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  return (
    <button type="button" onClick={() => {
      navigate("/panel/asistente");
      window.dispatchEvent(new Event("pac-focus-composer"));
    }} data-testid="button-nota-voz"
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#F28C28] font-semibold text-white shadow-sm transition hover:bg-[#E07B17] active:scale-[.98] ${compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-[13px]"}`}>
      <Mic className="h-4 w-4" /> Nota de voz
    </button>
  );
}
