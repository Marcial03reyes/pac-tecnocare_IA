import { useState, type FormEvent } from "react";
import type { Cliente, Reunion } from "@/lib/types";
import { STAGES, displayStage } from "@/lib/contact-stages";
import { normalizarTemp } from "@/lib/temperatura";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { FormShell, FormField, inputClass, actionClass } from "./crm-form-shell";

export function MeetingForm({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const stage = displayStage(cliente);
  const temp = normalizarTemp(cliente.temperatura_actual);
  const [values, setValues] = useState({
    fecha: new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).slice(0, 16).replace(" ", "T"),
    etapa: (STAGES as readonly string[]).includes(stage) ? stage : "Primer contacto",
    temperatura: temp === "Sin dato" ? "Tibio" : temp,
    resumen: "", objeciones: "", acuerdos: "", borrador: "", fechaSeguimiento: "", motivoSeguimiento: "", motivoPerdida: "",
  });
  const [savedId, setSavedId] = useState<Reunion["id"]>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const mutation = useCrmMutation();
  const set = (key: keyof typeof values, value: string) => setValues((old) => ({ ...old, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await mutation.mutateAsync({
        kind: "meeting", cliente, savedId,
        reunion: {
          fecha_reunion: new Date(`${values.fecha}:00-05:00`).toISOString(), etapa: values.etapa, temperatura: values.temperatura,
          transcripcion_resumen: values.resumen, objeciones_detectadas: values.objeciones,
          acuerdos_proximo_paso: values.acuerdos, borrador_whatsapp: values.borrador,
        },
        followup: values.fechaSeguimiento ? { fecha: values.fechaSeguimiento, motivo: values.motivoSeguimiento } : undefined,
        motivoPerdida: values.motivoPerdida,
      });
      if (result && "syncError" in result) {
        if (result.syncError) { setSavedId(result.id); setSyncError(result.syncError); }
        else onClose();
      }
    } catch { /* preserve form for retry; hook reports error */ }
  };
  return <FormShell title="Registrar reunión" description={`Reunión manual con ${cliente.nombre || "este contacto"}. Fecha y hora de Perú. No genera análisis automático.`} onClose={onClose} busy={mutation.isPending}>
    <form className="space-y-4" onSubmit={submit}>
      {syncError && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">{syncError}</p>}
      <fieldset disabled={mutation.isPending || savedId != null} className="grid gap-3 sm:grid-cols-2">
        <FormField label="Fecha y hora (Perú) *"><input type="datetime-local" required className={inputClass} value={values.fecha} onChange={(e) => set("fecha", e.target.value)} /></FormField>
        <FormField label="Etapa *"><select className={inputClass} value={values.etapa} onChange={(e) => set("etapa", e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Temperatura *"><select className={inputClass} value={values.temperatura} onChange={(e) => set("temperatura", e.target.value)}>{["Frio", "Tibio", "Caliente"].map((t) => <option key={t}>{t}</option>)}</select></FormField>
        {values.etapa === "Perdido" && <FormField label="Motivo de pérdida"><input className={inputClass} value={values.motivoPerdida} onChange={(e) => set("motivoPerdida", e.target.value)} required={!cliente.motivo_perdida} /></FormField>}
        {(["resumen", "objeciones", "acuerdos", "borrador"] as const).map((key, i) => <div key={key} className="sm:col-span-2"><FormField label={["Resumen", "Objeciones", "Acuerdos / próximo paso", "Borrador de WhatsApp"][i]}><textarea className={inputClass} rows={3} value={values[key]} onChange={(e) => set(key, e.target.value)} /></FormField></div>)}
        <FormField label="Próximo contacto (opcional)"><input type="date" className={inputClass} value={values.fechaSeguimiento} onChange={(e) => set("fechaSeguimiento", e.target.value)} /></FormField>
        <FormField label="Motivo del seguimiento"><input className={inputClass} required={!!values.fechaSeguimiento} value={values.motivoSeguimiento} onChange={(e) => set("motivoSeguimiento", e.target.value)} /></FormField>
      </fieldset>
      <div className="flex justify-end gap-2"><button type="button" className="rounded-md border px-3 py-2 text-sm" disabled={mutation.isPending} onClick={onClose}>Cerrar</button><button className={actionClass} disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : savedId != null ? "Reintentar actualización del contacto" : "Registrar reunión"}</button></div>
    </form>
  </FormShell>;
}
