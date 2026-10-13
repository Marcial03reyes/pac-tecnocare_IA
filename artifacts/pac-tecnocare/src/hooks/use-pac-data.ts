import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { useAuth } from "@/auth/auth-provider";
import { todayLima } from "@/lib/format";
import type { Cliente, Reunion, ReunionConCliente } from "@/lib/types";

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

const CLIENTE_COLS = "id,nombre,institucion,especialidad,telefono,email,created_at,etapa_actual,temperatura_actual,proximo_contacto_fecha,proximo_contacto_motivo,ultima_reunion";
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
    queryFn: () => fetchAll<Cliente>((f, t) =>
      requireSupabase().from("clientes").select(CLIENTE_COLS).order("created_at", { ascending: false }).order("id").range(f, t) as unknown as PromiseLike<{ data: Cliente[] | null; error: unknown }>),
  });
}

export interface Kpis { calientes: number; hoy: number; clientes: number; reuniones: number; fecha: string }

export function useKpis() {
  const { uid, enabled } = useUserKey();
  return useQuery({
    queryKey: ["pac", uid, "kpis"],
    enabled,
    staleTime: STALE,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Kpis> => {
      const sb = requireSupabase();
      const fecha = todayLima();
      const head = { count: "exact" as const, head: true };
      const [cal, hoy, cli, reu] = await Promise.all([
        sb.from("clientes").select("id", head).eq("temperatura_actual", "Caliente"),
        sb.from("clientes").select("id", head).eq("proximo_contacto_fecha", fecha),
        sb.from("clientes").select("id", head),
        sb.from("reuniones").select("id", head),
      ]);
      for (const r of [cal, hoy, cli, reu]) if (r.error) throw r.error;
      return { calientes: cal.count ?? 0, hoy: hoy.count ?? 0, clientes: cli.count ?? 0, reuniones: reu.count ?? 0, fecha };
    },
  });
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
