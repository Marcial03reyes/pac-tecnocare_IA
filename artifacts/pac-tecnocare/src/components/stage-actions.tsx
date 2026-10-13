import { useState, type ReactNode } from "react";
import { Loader2, ThumbsUp, Ban, Trophy, XCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContactStage } from "@/hooks/use-contact-stage";
import { contactBucket, normalizeStage, OPPORTUNITY_STAGES } from "@/lib/contact-stages";
import type { Cliente } from "@/lib/types";

type Temp = "Frio" | "Tibio" | "Caliente";
type Mode = null | "interesado" | "descartar" | "ganado" | "perdido";
const TEMPS: { v: Temp; label: string; cls: string }[] = [
  { v: "Frio", label: "Frio", cls: "border-[#8A94A8] text-[#5B6478]" },
  { v: "Tibio", label: "Tibio", cls: "border-[#2F6FDB] text-[#2F6FDB]" },
  { v: "Caliente", label: "Caliente", cls: "border-[#F28C28] text-[#B85F0B]" },
];

function errText(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  return m && /[áéíóúñ]|no |etapa/i.test(m) ? m : "No se pudo actualizar la etapa. Intenta otra vez.";
}

function Btn({ onClick, children, tone = "ghost", testId, disabled }: { onClick: () => void; children: ReactNode; tone?: "orange" | "green" | "ghost" | "red" | "blue"; testId: string; disabled?: boolean }) {
  const cls = { orange: "bg-[#F28C28] text-white hover:bg-[#E07B17]", green: "bg-[#1F9D61] text-white hover:bg-[#188452]", blue: "bg-[#2F6FDB] text-white hover:bg-[#245BBC]", red: "border border-[#F1C4C4] bg-white text-[#B42F2F] hover:bg-[#FDECEC]", ghost: "border bg-white text-[#14213D] hover:border-[#2F6FDB]" }[tone];
  return <button type="button" disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }} data-testid={testId}
    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${cls}`}>{children}</button>;
}

export function StageActions({ cliente, compact = false }: { cliente: Cliente; compact?: boolean }) {
  const m = useContactStage();
  const [mode, setMode] = useState<Mode>(null);
  const [temp, setTemp] = useState<Temp | null>(null);
  const [motivo, setMotivo] = useState("");
  const bucket = contactBucket(cliente);
  const stage = normalizeStage(cliente.etapa_actual);
  const id = cliente.id;

  const open = (md: Mode) => { m.reset(); setTemp(null); setMotivo(""); setMode(md); };
  const run = (input: Parameters<typeof m.mutate>[0]) => m.mutate(input, { onSuccess: () => setMode(null) });
  const nextStages = OPPORTUNITY_STAGES.filter((s) => s !== stage);

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center gap-1.5">
      {bucket === "leads" && <>
        <Btn tone="orange" onClick={() => open("interesado")} testId={`button-interes-${id}`}><ThumbsUp className="h-3.5 w-3.5" />Respondió con interés</Btn>
        <Btn tone="red" onClick={() => open("descartar")} testId={`button-descartar-${id}`}><Ban className="h-3.5 w-3.5" />Descartar</Btn>
      </>}
      {bucket === "oportunidades" && <>
        {!compact && (
          <label className="flex items-center gap-1.5 text-xs text-[#5B6478]">Etapa
            <select value={stage} disabled={m.isPending} data-testid={`select-etapa-${id}`}
              onChange={(e) => run({ cliente, action: "etapa", etapa: e.target.value as (typeof OPPORTUNITY_STAGES)[number] })}
              className="rounded-md border bg-white px-2 py-1.5 text-xs font-semibold text-[#14213D] outline-none focus:border-[#2F6FDB]">
              <option value={stage}>{stage}</option>
              {nextStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
        <Btn tone="green" onClick={() => open("ganado")} testId={`button-ganado-${id}`}><Trophy className="h-3.5 w-3.5" />Marcar venta ganada</Btn>
        <Btn tone="red" onClick={() => open("perdido")} testId={`button-perdido-${id}`}><XCircle className="h-3.5 w-3.5" />Marcar como perdida</Btn>
      </>}
      {m.isPending && !mode && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2F6FDB]" />}
      {m.isError && !mode && <p role="alert" className="w-full text-[11px] text-[#B42F2F]">{errText(m.error)}</p>}

      <Dialog open={!!mode} onOpenChange={(o) => !o && !m.isPending && setMode(null)}>
        <DialogContent className="max-w-sm bg-[#F8F9FC]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-[#14213D]">
              {mode === "interesado" ? "Respondió con interés" : mode === "descartar" ? "Descartar lead" : mode === "ganado" ? "Confirmar venta ganada" : "Marcar como perdida"}
            </DialogTitle>
            <DialogDescription>
              {mode === "interesado" && `${cliente.nombre ?? "Este contacto"} pasa a Oportunidades como Interesado. Elige qué tan caliente está.`}
              {mode === "descartar" && `${cliente.nombre ?? "Este contacto"} pasará a Cerrados como Descartado. No se borra ningún dato.`}
              {mode === "ganado" && `${cliente.nombre ?? "Este contacto"} pasará a Clientes con estado Ganado y fecha de cierre hoy. Puedes seguir viendo todo su historial.`}
              {mode === "perdido" && "Pasará a Cerrados como Perdido, con fecha de cierre hoy. Anota por qué se perdió."}
            </DialogDescription>
          </DialogHeader>
          {mode === "interesado" && (
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Temperatura">
              {TEMPS.map((t) => (
                <button key={t.v} type="button" role="radio" aria-checked={temp === t.v} onClick={() => setTemp(t.v)} data-testid={`button-temp-${t.v}`}
                  className={`rounded-lg border-2 bg-white py-2.5 text-sm font-semibold transition ${temp === t.v ? `${t.cls} shadow-sm` : "border-transparent text-[#5B6478] hover:border-[#D5DAE4]"}`}>{t.label}</button>
              ))}
            </div>
          )}
          {(mode === "descartar" || mode === "perdido") && (
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} data-testid="input-motivo"
              placeholder={mode === "perdido" ? "Ej.: Eligió otro proveedor por precio" : "Motivo (opcional)"}
              className="w-full rounded-md border bg-white p-2.5 text-sm outline-none focus:border-[#2F6FDB]" />
          )}
          {m.isError && <p role="alert" className="rounded-md bg-[#FDECEC] p-2 text-xs text-[#B42F2F]" data-testid="text-etapa-error">{errText(m.error)}</p>}
          <DialogFooter className="gap-2">
            <Btn onClick={() => setMode(null)} disabled={m.isPending} testId="button-cancelar-etapa">Cancelar</Btn>
            {mode === "interesado" && <Btn tone="orange" disabled={!temp || m.isPending} onClick={() => temp && run({ cliente, action: "interesado", temperatura: temp })} testId="button-confirmar-interes">{m.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}Mover a Oportunidades</Btn>}
            {mode === "descartar" && <Btn tone="red" disabled={m.isPending} onClick={() => run({ cliente, action: "descartar", motivo: motivo.trim() || undefined })} testId="button-confirmar-descartar">{m.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Descartar</Btn>}
            {mode === "ganado" && <Btn tone="green" disabled={m.isPending} onClick={() => run({ cliente, action: "ganado" })} testId="button-confirmar-ganado">{m.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirmar venta</Btn>}
            {mode === "perdido" && <Btn tone="red" disabled={!motivo.trim() || m.isPending} onClick={() => run({ cliente, action: "perdido", motivo: motivo.trim() })} testId="button-confirmar-perdido">{m.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Marcar perdida</Btn>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
