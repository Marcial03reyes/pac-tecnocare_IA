import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/auth/auth-provider";
import { stagePatch, type ContactStageInput } from "@/lib/contact-stages";
import type { Cliente } from "@/lib/types";
import { CLIENTE_COLS } from "./use-pac-data";

export async function updateContactStage(
  sb: SupabaseClient, input: ContactStageInput, userId: string,
): Promise<Cliente> {
  const patch = stagePatch(input);
  const { data: auth, error: authError } = await sb.auth.getUser();
  if (authError || auth.user?.id !== userId) throw new Error("Tu sesión ha expirado o cambiado. Vuelve a ingresar.");
  let update = sb.from("clientes").update(patch).eq("id", input.cliente.id);
  // Compare-and-set prevents a stale drawer from overwriting another stage change.
  update = input.cliente.etapa_actual == null
    ? update.is("etapa_actual", null)
    : update.eq("etapa_actual", input.cliente.etapa_actual);
  const { data, error } = await update.select(CLIENTE_COLS).maybeSingle();
  if (error) throw new Error("No pudimos guardar la nueva etapa. Revisa tu conexión y los permisos de Supabase.");
  if (!data) throw new Error("La etapa cambió o el contacto ya no está disponible. Actualiza la lista antes de intentar otra vez.");
  return data as Cliente;
}

export function useContactStage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  return useMutation<Cliente, Error, ContactStageInput>({
    mutationKey: ["pac", uid, "contact-stage"],
    retry: false,
    mutationFn: (input) => {
      if (!uid) throw new Error("Ingresa al panel para cambiar una etapa.");
      return updateContactStage(requireSupabase(), input, uid);
    },
    onSuccess: (saved) => {
      qc.setQueryData<Cliente[]>(["pac", uid, "clientes"], (old) => old?.map((c) => String(c.id) === String(saved.id) ? saved : c));
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ["pac", uid] });
    },
  });
}
