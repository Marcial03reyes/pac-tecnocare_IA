import { useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, MessageCircle, Sparkles } from "lucide-react";
import { TempBadge } from "@/components/temp";
import { CopyButton } from "@/components/copy-button";
import { whatsappUrl } from "@/lib/direct-contact";
import { formatFecha } from "@/lib/format";
import type { Cliente, Reunion } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function parseAnalisis(a: unknown): Obj | null {
  if (typeof a === "string") { try { const p = JSON.parse(a); return isObj(p) ? p : null; } catch { return null; } }
  return isObj(a) ? a : null;
}

function isEmpty(v: unknown): boolean {
  if (v == null || v === false) return true;
  if (typeof v === "string") return !v.trim();
  if (Array.isArray(v)) return v.every(isEmpty);
  if (isObj(v)) return Object.values(v).every(isEmpty);
  return false;
}

/** Flatten any value into plain text for copying. */
function toText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return v === true ? "Sí" : v === false ? "No" : String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).map((t) => `- ${t}`).join("\n");
  if (isObj(v)) return Object.entries(v).filter(([, x]) => !isEmpty(x)).map(([k, x]) => `${human(k)}: ${toText(x)}`).join("\n");
  return "";
}

const human = (k: string) => { const s = k.replace(/_/g, " ").trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

function Value({ v }: { v: unknown }): ReactNode {
  if (isEmpty(v)) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return <span className="whitespace-pre-wrap">{toText(v)}</span>;
  if (Array.isArray(v)) return <ul className="list-disc space-y-0.5 pl-4">{v.filter((x) => !isEmpty(x)).map((x, i) => <li key={i}><Value v={x} /></li>)}</ul>;
  if (isObj(v)) return (
    <dl className="space-y-1">{Object.entries(v).filter(([, x]) => !isEmpty(x)).map(([k, x]) => (
      <div key={k}><dt className="inline font-semibold text-[#14213D]">{human(k)}: </dt><dd className="inline text-[#3A4560]"><Value v={x} /></dd></div>
    ))}</dl>
  );
  return null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function TextBlock({ label, value, testId, tone = "default", extra }: { label: string; value: unknown; testId: string; tone?: "default" | "accent"; extra?: ReactNode }) {
  if (isEmpty(value)) return null;
  return (
    <div className={`mt-3 rounded-md p-3 ${tone === "accent" ? "border border-[#C9DAF6] bg-[#E4EDFB]" : "bg-[#F4F6FB]"}`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${tone === "accent" ? "text-[#2459B5]" : "text-muted-foreground"}`}>{label}</span>
        <div className="flex items-center gap-1.5">{extra}<CopyButton text={toText(value)} testId={testId} /></div>
      </div>
      <div className="text-xs leading-relaxed text-[#3A4560]"><Value v={value} /></div>
    </div>
  );
}

export function MeetingCard({ reunion: r, cliente, onRegister }: { reunion: Reunion; cliente: Cliente; onRegister?: () => void }) {
  const [offerRegister, setOfferRegister] = useState(false);
  const { toast } = useToast();
  const a = parseAnalisis(r.analisis);
  const etapa = str(a?.etapa) ?? str(a?.etapa_actual) ?? r.etapa;
  const temp = str(a?.temperatura) ?? r.temperatura;
  const demo = a && isObj(a.demo) && a.demo.acordada ? a.demo : null;
  const falta = demo?.falta_confirmar;
  const pick = (k: string, flat: string | null) => (a && !isEmpty(a[k]) ? a[k] : flat);
  const resumen = pick("resumen", r.transcripcion_resumen);
  const objeciones = pick("objeciones", r.objeciones_detectadas);
  const acuerdos = pick("acuerdos", r.acuerdos_proximo_paso);
  const borradorRaw = pick("borrador_whatsapp", r.borrador_whatsapp);
  const borrador = toText(borradorRaw);
  const wa = borrador ? whatsappUrl(cliente.telefono, borrador) : null;
  const sendAction = (value: unknown, testId: string) => {
    const text = toText(value);
    const url = text ? whatsappUrl(cliente.telefono, text) : null;
    return url ? <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={() => { setOfferRegister(true); toast({ title: "Abriendo WhatsApp", description: "El mensaje no se envía automáticamente." }); }}
      className="inline-flex items-center gap-1.5 rounded-md bg-[#1F9D61] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#1A8754]" data-testid={testId}>
      <MessageCircle className="h-3.5 w-3.5" />Enviar por WhatsApp
    </a> : undefined;
  };

  return (
    <article className="pac-card fade-up p-4" data-testid={`card-meeting-${r.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#14213D]">{formatFecha(r.fecha_reunion, true)}</span>
        <div className="flex items-center gap-1.5">
          {etapa && <span className="rounded-md border border-[#DDE1EA] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#14213D]">{etapa}</span>}
           {temp && <TempBadge value={temp} />}
        </div>
      </div>
      {r.origen_audio && <p className="mt-1 text-[11px] text-muted-foreground">Origen: {r.origen_audio}</p>}
      {!isEmpty(resumen) && <div className="mt-2 text-sm leading-relaxed text-[#3A4560]"><Value v={resumen} /></div>}

      {demo && !isEmpty(demo) && (
        <div className="mt-3 rounded-md border border-[#F9D3AC] bg-[#FFF8F0] p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#B45F0E]"><CalendarClock className="h-3.5 w-3.5" /> Demo acordada</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(["dia", "hora", "lugar"] as const).map((k) => !isEmpty(demo[k]) && (
              <div key={k}><span className="block text-[10px] text-muted-foreground">{human(k === "dia" ? "día" : k)}</span><span className="font-semibold text-[#14213D]"><Value v={demo[k]} /></span></div>
            ))}
          </div>
          {!isEmpty(falta) && (
            <div className="mt-2 rounded bg-[#FFF3C4] px-2 py-1.5 text-xs text-[#7A5A00]" role="note">
              <span className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Falta confirmar</span>
              {falta !== true && <Value v={falta} />}
            </div>
          )}
        </div>
      )}

      {a && !isEmpty(a.equipos_y_competencia) && (
        <div className="mt-3 text-xs"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Equipos y competencia</p><Value v={a.equipos_y_competencia} /></div>
      )}

      {a && !isEmpty(a.recomendacion) && (
        <div className="mt-3 rounded-md border-l-4 border-l-[#2F6FDB] bg-[#E4EDFB] p-3 text-xs text-[#14213D]">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#2459B5]"><Sparkles className="h-3.5 w-3.5" /> Recomendación</p>
          <Value v={a.recomendacion} />
        </div>
      )}

      <TextBlock label="Objeciones" value={objeciones} testId={`button-copiar-objeciones-${r.id}`} extra={sendAction(objeciones, `link-whatsapp-objeciones-${r.id}`)} />
      <TextBlock label="Acuerdos y próximo paso" value={acuerdos} testId={`button-copiar-acuerdos-${r.id}`} extra={sendAction(acuerdos, `link-whatsapp-acuerdos-${r.id}`)} />
      {r.feedback_estrategico && <TextBlock label="Feedback estratégico" value={r.feedback_estrategico} testId={`button-copiar-feedback-${r.id}`} />}
      <TextBlock label="Borrador WhatsApp" value={borradorRaw} testId={`button-copiar-borrador-${r.id}`} tone="accent"
        extra={sendAction(borradorRaw, `link-whatsapp-borrador-${r.id}`)} />
      {borrador && !wa && <p className="mt-1 text-[11px] text-muted-foreground">Sin teléfono válido para abrir WhatsApp.</p>}
      {onRegister && offerRegister && (
        <button type="button" onClick={onRegister} className="mt-2 text-xs font-semibold text-[#2F6FDB] hover:underline" data-testid={`button-registrar-resultado-${r.id}`}>Registrar resultado del contacto</button>
      )}
    </article>
  );
}
