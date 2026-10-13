import { useMemo, type ReactNode } from "react";
import { RotateCw, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend, Cell } from "recharts";
import { PageHeader } from "@/components/panel-layout";
import { useClientes, useReuniones } from "@/hooks/use-pac-data";
import { usePageMeta } from "@/hooks/use-page-meta";

const SIN = "Sin etapa";
const TEMP_COLOR: Record<string, string> = { Caliente: "#F28C28", Tibio: "#2F6FDB", Frio: "#8A94A8", "Sin temperatura": "#C9CFDB" };

function count<T>(rows: T[], key: (r: T) => string | null | undefined, empty: string) {
  const m = new Map<string, number>();
  rows.forEach((r) => { const k = key(r)?.trim() || empty; m.set(k, (m.get(k) ?? 0) + 1); });
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const PROY = [
  { mes: "Mes 1", Contactos: 18, Ventas: 2 }, { mes: "Mes 2", Contactos: 27, Ventas: 3 },
  { mes: "Mes 3", Contactos: 34, Ventas: 5 }, { mes: "Mes 4", Contactos: 46, Ventas: 7 },
  { mes: "Mes 5", Contactos: 53, Ventas: 9 }, { mes: "Mes 6", Contactos: 67, Ventas: 12 },
];

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pac-card fade-up min-w-0 max-w-full break-words p-5 ${className}`}>{children}</div>;
}
function Skel({ h = "h-24" }: { h?: string }) { return <div className={`${h} animate-pulse rounded-lg bg-[#EEF1F7]`} />; }
function Err({ retry }: { retry: () => void }) {
  return <div className="rounded-lg bg-[#FDECEC] p-3 text-xs text-[#B42F2F]">No pudimos cargar estos datos.
    <button onClick={retry} className="ml-2 inline-flex items-center gap-1 font-semibold underline" data-testid="button-reintentar-reportes"><RotateCw className="h-3 w-3" />Reintentar</button></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="grid place-items-center rounded-lg border border-dashed border-[#D5DAE4] py-8 text-center text-sm text-muted-foreground"><BarChart3 className="mb-1 h-5 w-5 text-[#B9C2D6]" />{text}</div>;
}

export default function ReportesPage() {
  usePageMeta("Reportes — PAC TECNOCARE", "Indicadores reales de clientes y reuniones, y proyección ilustrativa de PAC.");
  const cli = useClientes();
  const reu = useReuniones();
  const clientes = useMemo(() => cli.data ?? [], [cli.data]);
  const reuniones = useMemo(() => reu.data ?? [], [reu.data]);
  const porTemp = useMemo(() => count(clientes, (c) => c.temperatura_actual, "Sin temperatura"), [clientes]);
  const porEtapaReu = useMemo(() => count(reuniones, (r) => r.etapa, SIN), [reuniones]);
  const porEtapaCli = useMemo(() => count(clientes, (c) => c.etapa_actual, SIN), [clientes]);
  const conProx = clientes.filter((c) => c.proximo_contacto_fecha).length;
  const pct = clientes.length ? Math.round((conProx / clientes.length) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Datos reales de tu cartera" title="Reportes" />
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.8fr)]">
        <Box>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5B6478]">Clientes por temperatura</p>
          {cli.isLoading ? <div className="mt-3"><Skel /></div> : cli.isError ? <div className="mt-3"><Err retry={() => cli.refetch()} /></div> : !clientes.length ? <div className="mt-3"><Empty text="Aún no hay clientes." /></div> : (
            <>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">{porTemp.map((t) => <span key={t.name} style={{ width: `${(t.value / clientes.length) * 100}%`, background: TEMP_COLOR[t.name] ?? "#5B6478" }} />)}</div>
              <ul className="mt-3 grid grid-cols-2 gap-2">{porTemp.map((t) => (
                <li key={t.name} className="flex items-center justify-between rounded-md bg-[#F4F6FB] px-3 py-2 text-sm" data-testid={`kpi-temp-${t.name}`}>
                  <span className="flex items-center gap-1.5 text-[#5B6478]"><span className="h-2 w-2 rounded-full" style={{ background: TEMP_COLOR[t.name] ?? "#5B6478" }} />{t.name}</span><b className="text-[#14213D]">{t.value}</b></li>))}</ul>
            </>
          )}
        </Box>
        <Box>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5B6478]">Reuniones por etapa</p>
          {reu.isLoading ? <div className="mt-3"><Skel /></div> : reu.isError ? <div className="mt-3"><Err retry={() => reu.refetch()} /></div> : !reuniones.length ? <div className="mt-3"><Empty text="Aún no hay reuniones." /></div> : (
            <ul className="mt-3 space-y-1.5">{porEtapaReu.map((e) => (
              <li key={e.name} className="flex items-center justify-between border-b border-[#EEF1F7] pb-1.5 text-sm last:border-0" data-testid={`kpi-reu-${e.name}`}><span className="truncate text-[#5B6478]">{e.name}</span><b className="text-[#14213D]">{e.value}</b></li>))}</ul>
          )}
        </Box>
        <Box className="bg-[#14213D] text-white" >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B9C2D6]">Con próximo contacto</p>
          {cli.isLoading ? <div className="mt-3"><Skel /></div> : cli.isError ? <div className="mt-3"><Err retry={() => cli.refetch()} /></div> : (
            <>
              <p className="mt-3 text-5xl font-bold tracking-tight text-[#F28C28]" data-testid="kpi-pct-proximo">{pct.toLocaleString("es-PE")}%</p>
              <p className="mt-1 text-xs text-[#B9C2D6]">{conProx} de {clientes.length} clientes tienen fecha agendada</p>
            </>
          )}
        </Box>
      </div>

      <Box>
        <p className="text-sm font-bold text-[#14213D]">Clientes por etapa</p>
        <p className="text-xs text-muted-foreground">Etapa actual de cada cliente</p>
        <div className="mt-4">
          {cli.isLoading ? <Skel h="h-64" /> : cli.isError ? <Err retry={() => cli.refetch()} /> : !clientes.length ? <Empty text="Cuando registres clientes verás su distribución aquí." /> : (
            <div className="h-72" data-testid="chart-clientes-etapa">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porEtapaCli} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF1F7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5B6478" }} interval={0} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B6478" }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(47,111,219,.06)" }} formatter={(v: number) => [v, "Clientes"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={900}>
                    {porEtapaCli.map((e, i) => <Cell key={e.name} fill={i === 0 ? "#F28C28" : "#2F6FDB"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Box>

      <Box>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#14213D]">Con PAC: más contactos, más ventas</p>
            <p className="text-xs text-muted-foreground">Escenario de ejemplo a 6 meses. No son ingresos ni datos reales.</p>
          </div>
          <span className="rounded-full bg-[#FFF1E3] px-3 py-1 text-[11px] font-semibold text-[#B85F0B]" data-testid="badge-proyeccion">Proyección ilustrativa</span>
        </div>
        <div className="mt-4 h-72" data-testid="chart-proyeccion">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PROY} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2F6FDB" stopOpacity={.35} /><stop offset="100%" stopColor="#2F6FDB" stopOpacity={0} /></linearGradient>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F28C28" stopOpacity={.4} /><stop offset="100%" stopColor="#F28C28" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EEF1F7" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#5B6478" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5B6478" }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Contactos" stroke="#2F6FDB" strokeWidth={2.5} fill="url(#gC)" animationDuration={1600} />
              <Area type="monotone" dataKey="Ventas" stroke="#F28C28" strokeWidth={2.5} fill="url(#gV)" animationDuration={1600} animationBegin={300} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Box>
    </div>
  );
}
