import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ChatError } from "./contracts";

export async function sessionClient(authorization: string | undefined): Promise<{ sb: SupabaseClient; userId: string }> {
  const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token || token.length > 8192) throw new ChatError(401, "Tu sesión no es válida. Vuelve a ingresar al panel.");
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ChatError(503, "Falta configurar la conexión del servidor con Supabase.");
  // Fail closed if someone accidentally configures a privileged key in the anon slot.
  if (key.startsWith("sb_secret_")) throw new ChatError(503, "La configuración de Supabase debe usar una clave pública anon.");
  if (key.split(".").length === 3) {
    try {
      if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "service_role") throw new ChatError(503, "La configuración de Supabase debe usar una clave pública anon.");
    } catch (error) { if (error instanceof ChatError) throw error; }
  }
  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let userId: string | undefined;
  try {
    const { data, error } = await sb.auth.getUser(token);
    if (error) throw new ChatError(401, "Tu sesión expiró. Vuelve a ingresar al panel.");
    userId = data.user?.id;
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError(503, "No pude verificar la sesión con Supabase. Inténtalo nuevamente.");
  }
  if (!userId) throw new ChatError(401, "Tu sesión no es válida. Vuelve a ingresar al panel.");
  return { sb, userId };
}
