import { Link } from "wouter";
import { AlertCircle, AudioLines } from "lucide-react";
import { useGranolaCount } from "@/hooks/use-granola";
import { GRANOLA_INBOX_HREF } from "@/lib/granola";

export function GranolaNotice({ compact = false }: { compact?: boolean }) {
  const count = useGranolaCount();
  const amount = count.data ?? 0;
  if (!count.isError && amount === 0) return null;

  return (
    <Link
      href={GRANOLA_INBOX_HREF}
      data-testid="link-granola-inbox"
      aria-label={count.isError ? "Revisar bandeja de reuniones" : `${amount} ${amount === 1 ? "reunión" : "reuniones"} por asignar`}
      title={count.isError ? "No se pudo consultar la bandeja" : `${amount} ${amount === 1 ? "reunión" : "reuniones"} por asignar`}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md text-[#F28C28] transition hover:bg-[#FFF4E8] ${compact ? "h-8 w-8" : "gap-2 rounded-full border border-[#F6C89D] bg-[#FFF7EF] px-3 py-1.5 text-xs font-semibold"}`}
    >
      {compact ? <AudioLines className="h-4 w-4" /> : <><AudioLines className="h-4 w-4" /><span>{count.isError ? "Revisar reuniones" : `${amount} ${amount === 1 ? "reunión" : "reuniones"} por asignar`}</span></>}
      <span className={`absolute flex items-center justify-center rounded-full bg-[#F28C28] font-bold leading-none text-white ring-2 ring-white ${compact ? "-right-0.5 -top-0.5 min-h-[17px] min-w-[17px] px-1 text-[10px]" : "-right-1 -top-1 min-h-[18px] min-w-[18px] px-1 text-[10px]"}`}>
        {count.isError ? <AlertCircle className="h-2.5 w-2.5" /> : amount > 99 ? "99+" : amount}
      </span>
    </Link>
  );
}
