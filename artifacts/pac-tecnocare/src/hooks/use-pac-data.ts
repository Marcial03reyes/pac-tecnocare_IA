import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/auth/auth-provider";
import { todayLima } from "@/lib/format";
import type { Cliente, Reunion, ReunionConCliente } from "@/lib/types";
import { contactBucket } from "@/lib/contact-stages";
import { normalizarTemp } from "@/lib/temperatura";

const PAGE = 1000;
const STALE = 60_000;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export const CLIENTE_COLS = "id,nombre,institucion,especialidad,telefono,email,created_at,etapa_actual,temperatura_actual,proximo_contacto_fecha,proximo_contacto_motivo,ultima_reunion,origen,motivo_perdida,fecha_cierre";
const REUNION_COLS = "id,cliente_id,fecha_reunion,origen_audio,transcripcion_resumen,temperatura,objeciones_detectadas,feedback_estrategico,borrador_whatsapp,acuerdos_proximo_paso,etapa,proximo_contacto_fecha,analisis,transcripcion";

function useUserKey() {
  const { session } = useAuth();
  return { uid: session?.user.id ?? null, enabled: Boolean(session) };
}

export function useClientes() {
  const { uid, enabled } = useUserKey();
  return useQuery({
    queryKey: ["pac", uid, "clientes"],
    enabled,
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const sb = requireSupabase();
      const clientes = await fetchAll<Cliente>((f, t) =>
        sb.from("clientes").select(CLIENTE_COLS).order("created_at", { ascending: false }).order("id").range(f, t) as unknown as PromiseLike<{ data: Cliente[] | null; error: unknown }>);
      type MeetingSummary = Pick<Reunion, "cliente_id" | "objeciones_detectadas">;
      const latest = new Map<string, MeetingSummary>();
      for (let i = 0; i < clientes.length; i += 200) {
        const ids = clientes.slice(i, i + 200).map((c) => c.id);
        const reuniones = await fetchAll<MeetingSummary>((f, t) =>
          sb.from("reuniones").select("id,cliente_id,fecha_reunion,objeciones_detectadas").in("cliente_id", ids)
            .order("fecha_reunion", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(f, t) as unknown as PromiseLike<{ data: MeetingSummary[] | null; error: unknown }>);
        for (const r of reuniones) {
          if (r.cliente_id != null && !latest.has(String(r.cliente_id))) latest.set(String(r.cliente_id), r);
        }
      }
      return clientes.map((c) => ({
        ...c, tiene_reuniones: latest.has(String(c.id)),
        objeciones_ultima_reunion: latest.get(String(c.id))?.objeciones_detectadas ?? null,
      }));
    },
  });
}

export interface Kpis { leads: number; calientes: number; hoy: number; clientes: number; fecha: string }

export function useKpis() {
  const q = useClientes();
  const fecha = todayLima();
  const rows = q.data;
  return { ...q, data: rows ? {
    leads: rows.filter((c) => contactBucket(c) === "leads").length,
    calientes: rows.filter((c) => contactBucket(c) === "oportunidades" && normalizarTemp(c.temperatura_actual) === "Caliente").length,
    hoy: rows.filter((c) => c.proximo_contacto_fecha?.slice(0, 10) === fecha).length,
    clientes: rows.filter((c) => contactBucket(c) === "clientes").length,
    fecha,
  } satisfies Kpis : undefined };
}

export function useSeguimientos() {
  const { uid, enabled } = useUserKey();
  return useQuery({
    queryKey: ["pac", uid, "seguimientos"],
    enabled,
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: () => fetchAll<Cliente>((f, t) =>
      requireSupabase().from("clientes").select(CLIENTE_COLS).not("proximo_contacto_fecha", "is", null)
        .order("proximo_contacto_fecha", { ascending: true }).order("id").range(f, t) as unknown as PromiseLike<{ data: Cliente[] | null; error: unknown }>),
  });
}

export function useReunionesCliente(clienteId: Cliente["id"] | null) {
  const { uid, enabled } = useUserKey();
  return useQuery({
    queryKey: ["pac", uid, "reuniones-cliente", clienteId],
    enabled: enabled && clienteId != null,
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: () => fetchAll<Reunion>((f, t) =>
      requireSupabase().from("reuniones").select(REUNION_COLS).eq("cliente_id", clienteId as string)
        .order("fecha_reunion", { ascending: false, nullsFirst: false }).order("id").range(f, t) as unknown as PromiseLike<{ data: Reunion[] | null; error: unknown }>),
  });
}

export function useReuniones() {
  const { uid, enabled } = useUserKey();
  return useQuery({
    queryKey: ["pac", uid, "reuniones"],
    enabled,
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ReunionConCliente[]> => {
      const sb = requireSupabase();
      const reuniones = await fetchAll<Reunion>((f, t) =>
        sb.from("reuniones").select(REUNION_COLS).order("fecha_reunion", { ascending: false, nullsFirst: false }).order("id").range(f, t) as unknown as PromiseLike<{ data: Reunion[] | null; error: unknown }>);
      const ids = Array.from(new Set(reuniones.map((r) => r.cliente_id).filter((v): v is string | number => v != null)));
      const map = new Map<string, ReunionConCliente["cliente"]>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await sb.from("clientes").select("id,nombre,institucion").in("id", ids.slice(i, i + 200));
        if (error) throw error;
        for (const c of data ?? []) map.set(String(c.id), c as ReunionConCliente["cliente"]);
      }
      return reuniones.map((r) => ({ ...r, cliente: r.cliente_id != null ? map.get(String(r.cliente_id)) ?? null : null }));
    },
  });
}
