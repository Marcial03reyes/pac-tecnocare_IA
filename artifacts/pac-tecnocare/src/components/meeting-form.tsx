import { useState, type FormEvent } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase";
import { todayLima } from "@/lib/format";
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
  const [transcripcion, setTranscripcion] = useState("");
  const [ia, setIa] = useState<{ busy: boolean; error: string | null; producto: string | null; done: boolean }>({ busy: false, error: null, producto: null, done: false });
  const analizar = async () => {
    setIa({ busy: true, error: null, producto: null, done: false });
    try {
      const { data } = await requireSupabase().auth.getSession();
      if (!data.session) throw new Error("Tu sesión expiró. Vuelve a ingresar.");
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/reuniones/analizar`, {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ transcripcion, hoy: todayLima(), cliente: { nombre: cliente.nombre, institucion: cliente.institucion, especialidad: cliente.especialidad, etapa: stage, temperatura: temp } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No se pudo analizar la reunión.");
      setValues((old) => ({
        ...old,
        etapa: (STAGES as readonly string[]).includes(body.etapa) ? body.etapa : old.etapa,
        temperatura: body.temperatura || old.temperatura,
        resumen: body.resumen ?? old.resumen, objeciones: body.objeciones ?? old.objeciones,
        acuerdos: body.acuerdos ?? old.acuerdos, borrador: body.borrador_whatsapp ?? old.borrador,
        fechaSeguimiento: body.proximo_contacto_fecha || old.fechaSeguimiento,
        motivoSeguimiento: body.proximo_contacto_fecha ? (body.motivo_seguimiento || old.motivoSeguimiento) : old.motivoSeguimiento,
      }));
      setIa({ busy: false, error: null, producto: body.producto_sugerido || null, done: true });
    } catch (e) {
      setIa({ busy: false, error: e instanceof Error ? e.message : "No se pudo analizar la reunión.", producto: null, done: false });
    }
  };
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
  return <FormShell title="Registrar reunión" description={`Reunión manual con ${cliente.nombre || "este contacto"}. Fecha y hora de Perú. Pega la transcripción y la IA completa el formulario; tú revisas antes de guardar.`} onClose={onClose} busy={mutation.isPending}>
    <form className="space-y-4" onSubmit={submit}>
      {savedId == null && (
        <div className="rounded-lg border border-[#2F6FDB]/25 bg-[#F4F6FB] p-3" data-testid="panel-copiloto">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#14213D]"><Sparkles className="h-4 w-4 text-[#F28C28]" />Copiloto de reuniones</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Pega la transcripción (Granola, Meet, Zoom) o tus notas. Se quitan DNI, correos y celulares antes de enviarla a la IA, y no se guarda.</p>
          <textarea className={`${inputClass} mt-2`} rows={5} value={transcripcion} onChange={(e) => setTranscripcion(e.target.value)} placeholder={"Víctor: Buenos días doctor…\nDoctor: …"} data-testid="input-transcripcion" disabled={ia.busy || mutation.isPending} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={analizar} disabled={ia.busy || mutation.isPending || transcripcion.trim().length < 40} data-testid="button-analizar-ia"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#F28C28] px-3 py-2 text-sm font-semibold text-white hover:bg-[#E07B17] disabled:opacity-50">
              {ia.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{ia.busy ? "Analizando…" : "Completar con IA"}
            </button>
            {ia.done && <span className="text-[12px] font-medium text-[#1F9D61]" data-testid="text-ia-listo">✓ Formulario completado. Revisa y corrige antes de registrar.{ia.producto ? ` Producto sugerido: ${ia.producto}.` : ""}</span>}
          </div>
          {ia.error && <p role="alert" className="mt-2 rounded-md bg-[#FDECEC] p-2 text-[12px] text-[#B42F2F]">{ia.error}</p>}
        </div>
      )}
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
