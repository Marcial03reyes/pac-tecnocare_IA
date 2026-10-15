import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/auth/auth-provider";
import type { ApolloLead } from "@/lib/apollo-types";

/** Fila de la tabla `prospectos` que llena el agente de prospección (copiloto en el VPS). */
interface ProspectoRow {
  id: number;
  nombre: string;
  segmento: string | null;
  distrito: string | null;
  telefono: string | null;
  celular: string | null;
  web: string | null;
  correo: string | null;
  ofrece_ozono: string | null;
  afinidad: number | null;
  razon: string | null;
  producto_sugerido: string | null;
}

const COLS = "id,nombre,segmento,distrito,telefono,celular,web,correo,ofrece_ozono,afinidad,razon,producto_sugerido";
const MAX = 30; // burbujas en pantalla: las de mayor afinidad

/** Celular peruano → formato internacional para wa.me ("987654321" → "51987654321"). Vacío si no es celular. */
function celularWhatsapp(n: string | null): string {
  const d = (n ?? "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(d)) return `51${d}`;
  if (/^519\d{8}$/.test(d)) return d;
  return "";
}

export function prospectoALead(p: ProspectoRow): ApolloLead {
  const nombre = (p.nombre ?? "").replace(/\s+/g, " ").trim();
  return {
    id: `p${p.id}`,
    prospectoId: p.id,
    real: true,
    nombre,
    institucion: nombre,
    especialidad: p.segmento ?? "Centro de salud",
    ciudad: p.distrito ? `${p.distrito}, Lima` : "Lima",
    afinidad: Math.max(0, Math.min(100, Math.round(p.afinidad ?? 0))),
    ofreceOzono: p.ofrece_ozono === "Sí",
    nota: p.razon ?? "Calificado por el agente de prospección.",
    telefono: celularWhatsapp(p.celular),
    fijo: p.telefono,
    email: p.correo ?? "",
    web: p.web,
    producto: p.producto_sugerido && p.producto_sugerido !== "Ninguno" ? p.producto_sugerido : null,
  };
}

/**
 * Prospectos reales calificados por el agente. Devuelve [] si la tabla está vacía o si la sesión
 * aún no tiene permiso de lectura (la pantalla cae entonces a los datos de ejemplo).
 */
export function useProspectos() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  return useQuery({
    queryKey: ["pac", uid, "prospectos"],
    enabled: Boolean(session),
    staleTime: 60_000,
    queryFn: async (): Promise<ApolloLead[]> => {
      const { data, error } = await requireSupabase()
        .from("prospectos")
        .select(COLS)
        .not("afinidad", "is", null)
        .not("estado", "in", "(Aprobado,Descartado)")
        .order("afinidad", { ascending: false })
        .limit(MAX);
      if (error) return [];
      return ((data ?? []) as ProspectoRow[]).map(prospectoALead);
    },
  });
}

/** Marca el prospecto como aprobado y lo enlaza al contacto creado. Si falla, no bloquea a Víctor. */
export async function marcarProspectoAprobado(prospectoId: number, clienteId: string | number): Promise<void> {
  try {
    await requireSupabase().from("prospectos").update({ estado: "Aprobado", cliente_id: Number(clienteId) || null }).eq("id", prospectoId);
  } catch {
    // Sin permiso de actualización todavía: el contacto ya quedó creado en `clientes`.
  }
}
