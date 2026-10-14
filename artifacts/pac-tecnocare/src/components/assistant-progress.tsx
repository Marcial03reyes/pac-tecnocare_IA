import { useQuery } from "@tanstack/react-query";
import { pacChatProgress } from "@workspace/api-client-react";
import { useAuth } from "@/auth/auth-provider";
import { requireSupabase } from "@/lib/supabase";

/** A mounted, authenticated read query; never retries or repeats a chat write. */
export function AssistantProgress({ requestId, slow }: { requestId: string; slow: boolean }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const { data } = useQuery({
    queryKey: ["pac-chat-progress", uid, requestId],
    enabled: Boolean(uid && requestId),
    queryFn: async () => {
      const { data } = await requireSupabase().auth.getSession();
      if (!data.session || data.session.user.id !== uid) throw new Error("Sesión no disponible");
      return pacChatProgress(requestId, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
    },
    refetchInterval: 1000,
    retry: false,
    staleTime: 0,
    gcTime: 5000,
    refetchOnWindowFocus: false,
  });
  const text = data?.message ?? (data?.state === "retrying" ? "Mucha demanda, reintentando…"
    : slow ? "La respuesta está tardando; sigo consultando el CRM…" : "Pensando…");
  return <span aria-live="polite" data-testid="assistant-progress">{text}</span>;
}
