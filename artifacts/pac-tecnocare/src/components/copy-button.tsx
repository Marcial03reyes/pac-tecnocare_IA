import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CopyButton({ text, testId }: { text: string; testId?: string }) {
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast({ title: "No se pudo copiar", description: "Tu navegador bloqueó el acceso al portapapeles.", variant: "destructive" });
    }
  };
  return (
    <button onClick={copy} data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${done ? "border-[#BFE5D0] bg-[#E6F6EE] text-[#1F8A55]" : "bg-white text-[#14213D] hover:border-[#2F6FDB] hover:text-[#2F6FDB]"}`}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copiado" : "Copiar"}
    </button>
  );
}
