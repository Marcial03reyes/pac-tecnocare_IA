import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/auth-provider";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { GRANOLA_COLUMNS, updateGranolaNote, type GranolaAction, type GranolaNota } from "@/lib/granola";

export function useGranolaCount() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["pac", session?.user.id, "granola-count"],
    enabled: Boolean(session), staleTime: 15_000, refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await requireSupabase().from("granola_notas")
        .select("note_id", { count: "exact", head: true }).in("estado", ["por_asignar", "error"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useGranolaNotes(history = false) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["pac", session?.user.id, "granola-notas", history],
    enabled: Boolean(session), staleTime: 0, refetchInterval: 30_000,
    queryFn: async () => {
      const rows: GranolaNota[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await requireSupabase().from("granola_notas").select(GRANOLA_COLUMNS)
          .in("estado", history ? ["procesada", "ignorada"] : ["por_asignar", "error", "listo", "procesando"])
          .order("fecha", { ascending: false, nullsFirst: false }).order("note_id").range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []) as GranolaNota[]);
        if ((data?.length ?? 0) < 1000) break;
      }
      return rows;
    },
  });
}

export function useGranolaMutation() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    retry: false,
    mutationFn: async ({ note, action }: { note: GranolaNota; action: GranolaAction }) => {
      if (!session) throw new Error("Ingresa al panel para guardar cambios.");
      return updateGranolaNote(requireSupabase(), note, action);
    },
    onSuccess: (note) => toast({
      title: note.estado === "listo" ? "Se procesará en unos minutos" : note.estado === "ignorada" ? "Reunión ignorada" : "Reunión pendiente de asignar",
    }),
    onError: (error) => toast({ variant: "destructive", title: "No se pudo actualizar la reunión", description: error.message }),
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["pac", session?.user.id, "granola-notas"] }),
        qc.invalidateQueries({ queryKey: ["pac", session?.user.id, "granola-count"] }),
      ]);
    },
  });
}
