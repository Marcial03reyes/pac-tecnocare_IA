import { Link } from "wouter";
import { Logo } from "@/components/logo";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function NotFound() {
  usePageMeta("Página no encontrada — TECNOCARE", "La página solicitada no existe.");
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#F4F6FB] px-4">
      <div className="pac-card fade-up max-w-sm p-8 text-center">
        <Logo />
        <p className="mt-4 text-4xl font-bold text-[#14213D]">404</p>
        <p className="mt-1 text-sm text-muted-foreground">La página que buscas no existe o fue movida.</p>
        <Link href="/" className="mt-5 inline-block rounded-md bg-[#F28C28] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E57D17]" data-testid="link-inicio">Volver al inicio</Link>
      </div>
    </div>
  );
}
