import { useEffect, useRef, useState } from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";
import type { Cliente } from "@/lib/types";
import { emailUrl, greeting, phoneDigits, whatsappUrl } from "@/lib/direct-contact";
import { useToast } from "@/hooks/use-toast";

export function DirectContactActions({ cliente, borrador, disabled, onRegister }: { cliente: Cliente; borrador?: string | null; disabled?: boolean; onRegister: () => void }) {
  const [awaiting, setAwaiting] = useState(false);
  const [returned, setReturned] = useState(false);
  const blurred = useRef(false);
  const { toast } = useToast();
  const text = borrador?.trim() || greeting(cliente);
  const wa = whatsappUrl(cliente.telefono, text);
  const email = emailUrl(cliente.email, text);
  const digits = phoneDigits(cliente.telefono);
  useEffect(() => {
    if (!awaiting) return;
    const blur = () => { blurred.current = true; };
    const focus = () => { if (blurred.current) setReturned(true); };
    const visibility = () => { if (document.hidden) blur(); else focus(); };
    window.addEventListener("blur", blur); window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); };
  }, [awaiting]);
  function start() {
    blurred.current = false; setAwaiting(true); setReturned(false);
    toast({ title: "Abriendo contacto directo", description: "El mensaje no se envía automáticamente. Al volver puedes registrar el resultado." });
  }
  const linkClass = "inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-semibold text-[#14213D] hover:border-[#2F6FDB]";
  if (disabled) return <p className="text-xs text-muted-foreground">Esperando el borrador de la última reunión. Reintenta la consulta si hay un error.</p>;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {wa && <a className={linkClass} href={wa} target="_blank" rel="noopener noreferrer" onClick={start} data-testid={`link-whatsapp-${cliente.id}`}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
      {email && <a className={linkClass} href={email} onClick={start}><Mail className="h-3.5 w-3.5" />Correo</a>}
      {digits && <a className={linkClass} href={`tel:${digits}`} onClick={start}><Phone className="h-3.5 w-3.5" />Llamar</a>}
      {!wa && !email && !digits && <p className="text-xs text-muted-foreground">Agrega un teléfono o email para contactar directamente.</p>}
    </div>
    {awaiting && <div role="status" className="flex flex-wrap items-center gap-2 rounded-md bg-[#EEF3FB] p-2 text-xs">
      <span>{returned ? "¿Registrar resultado?" : "Al volver: ¿Registrar resultado?"}</span>
      <button className="font-semibold text-[#2F6FDB] underline" onClick={() => { setAwaiting(false); onRegister(); }}>Registrar resultado</button>
      <button className="ml-auto text-muted-foreground" onClick={() => setAwaiting(false)}>Ahora no</button>
    </div>}
  </div>;
}
