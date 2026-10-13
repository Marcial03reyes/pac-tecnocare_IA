import type { Cliente } from "./types";

export function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length === 9 ? `51${digits}` : digits;
}
export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
export function emailUrl(email: string | null | undefined, text: string): string | null {
  return email?.trim() ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent("TECNOCARE – seguimiento")}&body=${encodeURIComponent(text)}` : null;
}
export function greeting(c: Cliente): string {
  return `Hola${c.nombre?.trim() ? `, ${c.nombre.trim()}` : ""}. Soy Víctor de TECNOCARE. ¿Cómo estás? Quería dar seguimiento a nuestra conversación.`;
}
