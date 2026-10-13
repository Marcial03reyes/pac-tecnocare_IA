import { useState, type FormEvent } from "react";
import type { Cliente } from "@/lib/types";
import { STAGES } from "@/lib/contact-stages";
import { ORIGINS } from "@/lib/crm-writes";
import { normalizarTemp } from "@/lib/temperatura";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { FormField, FormShell, inputClass, actionClass } from "./crm-form-shell";

export function ContactEditor({ cliente, initialStage, onClose }: { cliente?: Cliente; initialStage?: string; onClose: () => void }) {
  const temperature = normalizarTemp(cliente?.temperatura_actual);
  const [values, setValues] = useState<Record<string, string>>({
    nombre: cliente?.nombre ?? "", institucion: cliente?.institucion ?? "", especialidad: cliente?.especialidad ?? "",
    telefono: cliente?.telefono ?? "", email: cliente?.email ?? "", origen: cliente?.origen ?? "",
    etapa_actual: initialStage ?? cliente?.etapa_actual ?? (cliente ? "" : "Lead"),
    temperatura_actual: temperature === "Sin dato" ? "" : temperature,
    proximo_contacto_fecha: cliente?.proximo_contacto_fecha?.slice(0, 10) ?? "",
    proximo_contacto_motivo: cliente?.proximo_contacto_motivo ?? "",
    ultima_reunion: cliente?.ultima_reunion?.slice(0, 10) ?? "", fecha_cierre: cliente?.fecha_cierre?.slice(0, 10) ?? "",
    motivo_perdida: cliente?.motivo_perdida ?? "",
  });
  const mutation = useCrmMutation();
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const editable = Object.fromEntries(Object.entries(values).filter(([key]) => cliente || !["ultima_reunion", "fecha_cierre"].includes(key))) as Partial<Cliente>;
    // Only changed fields are sent on edit, preserving full timestamps and copilot-owned values.
    const patch = cliente ? Object.fromEntries(Object.entries(editable).filter(([key, value]) => {
      const original = cliente[key as keyof Cliente];
      const shown = key.endsWith("fecha") || key === "ultima_reunion" || key === "fecha_cierre" ? String(original ?? "").slice(0, 10) : String(original ?? "");
      return value !== shown;
    })) as Partial<Cliente> : editable;
    try {
      await mutation.mutateAsync(cliente ? { kind: "update", cliente, patch } : { kind: "create", patch });
      onClose();
    } catch { /* mutation renders the error toast; preserve entered values */ }
  };
  const text = (key: string, label: string, type = "text") => <FormField label={label}><input className={inputClass} name={key} type={type} required={key === "nombre"} value={values[key]} onChange={(e) => set(key, e.target.value)} /></FormField>;
  return <FormShell title={cliente ? "Editar contacto" : "Nuevo contacto"} description="Guarda los datos en el CRM. Los campos sin información pueden quedar vacíos." onClose={onClose} busy={mutation.isPending}>
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={mutation.isPending} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {text("nombre", "Nombre *")}{text("institucion", "Institución")}{text("especialidad", "Especialidad")}
        {text("telefono", "Teléfono", "tel")}{text("email", "Email", "email")}
        <FormField label="Origen"><select className={inputClass} value={values.origen} onChange={(e) => set("origen", e.target.value)}>
          <option value="">Sin origen</option>{!ORIGINS.includes(values.origen as typeof ORIGINS[number]) && values.origen && <option>{values.origen}</option>}
          {ORIGINS.map((o) => <option key={o}>{o}</option>)}
        </select></FormField>
        <FormField label="Etapa"><select className={inputClass} value={values.etapa_actual} onChange={(e) => set("etapa_actual", e.target.value)}>
          <option value="">Sin etapa</option>{values.etapa_actual && !(STAGES as readonly string[]).includes(values.etapa_actual) && <option>{values.etapa_actual}</option>}
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select></FormField>
        <FormField label="Temperatura"><select className={inputClass} value={values.temperatura_actual} onChange={(e) => set("temperatura_actual", e.target.value)}>
          <option value="">Sin temperatura</option>{["Frio", "Tibio", "Caliente"].map((t) => <option key={t}>{t}</option>)}
        </select></FormField>
        {text("proximo_contacto_fecha", "Próximo contacto (fecha)", "date")}{text("proximo_contacto_motivo", "Próximo contacto (motivo)")}
        {(cliente || values.etapa_actual === "Perdido") && text("motivo_perdida", "Motivo de pérdida")}
        {cliente && <>{text("ultima_reunion", "Última reunión (fecha)", "date")}{text("fecha_cierre", "Fecha de cierre", "date")}</>}
      </fieldset>
      <div className="flex justify-end gap-2"><button type="button" disabled={mutation.isPending} className="rounded-md border px-3 py-2 text-sm" onClick={onClose}>Cancelar</button><button className={actionClass} disabled={mutation.isPending}>{mutation.isPending ? "Guardando…" : "Guardar contacto"}</button></div>
    </form>
  </FormShell>;
}
