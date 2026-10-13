import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { requireSupabase } from "@/lib/supabase";
import { verifyWriter, saveContact, deleteContact, saveManualMeeting, type ManualMeetingInput } from "@/lib/crm-writes";
import type { Cliente } from "@/lib/types";

type Input =
  | { kind: "create"; patch: Partial<Cliente> }
  | { kind: "update"; cliente: Cliente; patch: Partial<Cliente> }
  | { kind: "delete"; cliente: Cliente }
  | ({ kind: "meeting" } & ManualMeetingInput);
export function useCrmMutation() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    retry: false,
    mutationFn: async (input: Input) => {
      if (!uid) throw new Error("Ingresa al panel para guardar cambios.");
      const sb = requireSupabase();
      await verifyWriter(sb, uid);
      if (input.kind === "delete") { await deleteContact(sb, input.cliente); return null; }
      if (input.kind === "meeting") return saveManualMeeting(sb, input);
      return saveContact(sb, input.patch, input.kind === "update" ? input.cliente : undefined);
    },
    onSuccess: (result, input) => {
      const syncError = result && "syncError" in result ? result.syncError : null;
      toast(syncError ? { variant: "destructive", title: "Reunión guardada; actualización pendiente", description: syncError } : {
        title: input.kind === "create" ? "Contacto creado" : input.kind === "delete" ? "Contacto y reuniones eliminados" : input.kind === "meeting" ? "Reunión registrada y contacto actualizado" : "Cambios guardados",
      });
    },
    onError: (error) => toast({ variant: "destructive", title: "No se completó la acción", description: error.message }),
    onSettled: async () => { await qc.invalidateQueries({ queryKey: ["pac", uid] }); },
  });
}
