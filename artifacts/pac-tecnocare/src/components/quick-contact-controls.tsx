import type { Cliente } from "@/lib/types";
import { STAGES, displayStage } from "@/lib/contact-stages";
import { normalizarTemp } from "@/lib/temperatura";
import { useCrmMutation } from "@/hooks/use-crm-mutation";
import { FormField, inputClass } from "./crm-form-shell";
import { useState } from "react";
import { ContactEditor } from "./contact-editor";

export function QuickContactControls({ cliente }: { cliente: Cliente }) {
  const mutation = useCrmMutation();
  const [editLoss, setEditLoss] = useState(false);
  const stage = displayStage(cliente);
  const temp = normalizarTemp(cliente.temperatura_actual);
  return <><div className="grid grid-cols-2 gap-3">
    <FormField label="Etapa rápida"><select className={inputClass} value={stage} disabled={mutation.isPending} onChange={(e) => {
      if (e.target.value === "Perdido" && !cliente.motivo_perdida) { setEditLoss(true); return; }
      mutation.mutate({ kind: "update", cliente, patch: { etapa_actual: e.target.value } });
    }}>{!(STAGES as readonly string[]).includes(stage) && <option>{stage}</option>}{STAGES.map((s) => <option key={s}>{s}</option>)}</select></FormField>
    <FormField label="Temperatura rápida"><select className={inputClass} value={temp === "Sin dato" ? "" : temp} disabled={mutation.isPending} onChange={(e) => mutation.mutate({ kind: "update", cliente, patch: { temperatura_actual: e.target.value || null } })}>
      <option value="">Sin temperatura</option>{["Frio", "Tibio", "Caliente"].map((t) => <option key={t}>{t}</option>)}
    </select></FormField>
  </div>{editLoss && <ContactEditor cliente={cliente} initialStage="Perdido" onClose={() => setEditLoss(false)} />}</>;
}
