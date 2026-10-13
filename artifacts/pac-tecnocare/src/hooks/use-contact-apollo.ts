import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/auth/auth-provider";
import { requireSupabase } from "@/lib/supabase";
import { todayLima } from "@/lib/format";
import type { ApolloContactResult, ApolloLead } from "@/lib/apollo-types";

const pending = new Map<string, Promise<unknown>>();

/** Serialize identical names in this tab, including browsers without Web Locks. */
async function withLocalLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = pending.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(action);
  pending.set(key, next);
  try {
    return await next;
  } finally {
    if (pending.get(key) === next) pending.delete(key);
  }
}

function contactError(error: { code?: string; message?: string }): Error {
  if (error.code === "42501" || error.code === "PGRST301") {
    return new Error("Tu sesión no tiene permiso para crear este contacto. Revisa los permisos existentes de Supabase.");
  }
  return new Error("No pudimos guardar el contacto. Revisa la conexión y vuelve a intentar.");
}

/** No schema changes: reuse an existing name, otherwise insert only the requested fields. */
export async function createOrFindApolloClient(
  sb: SupabaseClient,
  lead: ApolloLead,
  userId: string,
): Promise<ApolloContactResult> {
  if (!lead.nombre.trim() || !lead.institucion.trim() ||
      !Number.isFinite(lead.afinidad) || lead.afinidad < 0 || lead.afinidad > 100) {
    throw new Error("El lead no tiene datos válidos para crear un contacto.");
  }
  const { data: identity, error: authError } = await sb.auth.getUser();
  if (authError || identity.user?.id !== userId) {
    throw new Error("Tu sesión ha cambiado o expirado. Ingresa nuevamente antes de crear el contacto.");
  }
  const findExisting = async () => {
    const { data, error } = await sb.from("clientes").select("id")
      .eq("nombre", lead.nombre).limit(1);
    if (error) throw contactError(error);
    return data?.[0]?.id as string | number | undefined;
  };
  const existing = await findExisting();
  if (existing !== undefined) return { clienteId: existing, created: false };

  const { data: localIdentity } = await sb.auth.getSession();
  if (localIdentity.session?.user.id !== userId) {
    throw new Error("Tu sesión ha cambiado. Vuelve a ingresar antes de crear el contacto.");
  }
  const { data, error } = await sb.from("clientes").insert({
    nombre: lead.nombre,
    institucion: lead.institucion,
    especialidad: lead.especialidad,
    temperatura_actual: lead.afinidad >= 80 ? "Tibio" : "Frio",
    etapa_actual: "Prospecto Apollo",
    proximo_contacto_fecha: todayLima(),
    proximo_contacto_motivo: "Primer contacto Apollo",
  }).select("id").single();
  if (error) {
    // If an existing database constraint catches a concurrent insert, reuse it.
    if (error.code === "23505") {
      const found = await findExisting();
      if (found !== undefined) return { clienteId: found, created: false };
    }
    throw contactError(error);
  }
  if (data?.id == null) {
    throw new Error("No pudimos confirmar el contacto guardado. Reintenta para comprobar si ya existe.");
  }
  return { clienteId: data.id as string | number, created: true };
}

export function useContactApollo() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation<ApolloContactResult, Error, ApolloLead>({
    mutationKey: ["pac", userId, "contactar-apollo"],
    retry: false,
    mutationFn: async (lead) => {
      if (!userId) throw new Error("Ingresa al panel antes de crear un contacto.");
      const action = () => createOrFindApolloClient(requireSupabase(), lead, userId);
      const key = `pac-apollo:${userId}:${lead.nombre}`;
      if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request(key, action);
      }
      return withLocalLock(key, action);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pac", userId] });
    },
  });
}
