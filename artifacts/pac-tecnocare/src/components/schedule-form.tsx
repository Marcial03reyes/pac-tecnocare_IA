import { useState, type FormEvent } from "react";
import type { Cliente } from "@/lib/types";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { FormShell, FormField, inputClass, actionClass } from "./crm-form-shell";

export function ScheduleForm({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const [fecha, setFecha] = useState(cliente.proximo_contacto_fecha?.slice(0, 10) ?? "");
  const [motivo, setMotivo] = useState(cliente.proximo_contacto_motivo ?? "");
  const mutation = useCrmMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await mutation.mutateAsync({ kind: "update", cliente, patch: { proximo_contacto_fecha: fecha, proximo_contacto_motivo: motivo } }); onClose(); } catch { /* toast */ }
  }
  return <FormShell title="Agendar seguimiento" description={`Próximo contacto con ${cliente.nombre || "este contacto"}.`} onClose={onClose} busy={mutation.isPending}>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={mutation.isPending} className="space-y-3">
      <FormField label="Fecha *"><input type="date" required className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} /></FormField>
      <FormField label="Motivo *"><input required className={inputClass} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></FormField>
    </fieldset><div className="flex justify-end gap-2"><button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onClose} disabled={mutation.isPending}>Cancelar</button><button className={actionClass} disabled={mutation.isPending}>Agendar seguimiento</button></div></form>
  </FormShell>;
}
