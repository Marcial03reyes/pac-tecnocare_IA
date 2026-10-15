import { useMemo, useState } from "react";
import { AlertCircle, AudioLines, Check, ChevronDown, Clock3, History, LoaderCircle, Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
import { useClientes } from "@/hooks/use-pac-data";
import { useGranolaMutation, useGranolaNotes } from "@/hooks/use-granola";
import { granolaDate, type GranolaNota } from "@/lib/granola";
import type { Cliente } from "@/lib/types";
import { Bone } from "@/components/states";
import { ContactEditor } from "@/components/contact-editor";

/** Errores pasajeros (cuota o saturación de la IA): la grabación está a salvo, solo falta analizarla. */
export function esEsperaIA(note: Pick<GranolaNota, "estado" | "error">): boolean {
  return note.estado === "error" && /429|503|RESOURCE_EXHAUSTED|quota|cuota|UNAVAILABLE|overloaded|demanda/i.test(note.error ?? "");
}

function Status({ note }: { note: GranolaNota }) {
  const { estado } = note;
  const espera = esEsperaIA(note);
  const label = espera ? "Audio registrado · análisis en cola" : estado === "por_asignar" ? "Audio registrado · por asignar" : estado === "error" ? "Error" : estado === "listo" ? "En cola para análisis" : estado === "procesando" ? "Analizando con IA…" : estado === "ignorada" ? "Ignorada" : "Analizada";
  const styles = espera || estado === "listo" ? "bg-[#FFF2E4] text-[#A6530A]" : estado === "error" ? "bg-[#FDECEC] text-[#B42F2F]" : estado === "por_asignar" ? "bg-[#FFF2E4] text-[#A6530A]" : estado === "procesada" ? "bg-[#E6F6EE] text-[#1F7A4D]" : "bg-[#EAF1FC] text-[#2F6FDB]";
  return <span data-testid={`status-granola-${espera ? "en-cola" : estado}`} className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}>{estado === "error" && !espera && <AlertCircle className="h-3 w-3" />}{(espera || estado === "listo") && <Clock3 className="h-3 w-3" />}{estado === "procesando" && <LoaderCircle className="h-3 w-3 animate-spin" />}{estado === "por_asignar" && <AudioLines className="h-3 w-3" />}{label}</span>;
}

function clientLabel(cliente: Cliente) {
  return [cliente.nombre, cliente.institucion].filter(Boolean).join(" · ") || `Contacto ${cliente.id}`;
}

export function GranolaInbox() {
  const [history, setHistory] = useState(false);
  const [searchByNote, setSearchByNote] = useState<Record<string, string>>({});
  const [selectedByNote, setSelectedByNote] = useState<Record<string, string>>({});
  const [createdByNote, setCreatedByNote] = useState<Record<string, Cliente>>({});
  const [creatingFor, setCreatingFor] = useState<GranolaNota | null>(null);
  const notes = useGranolaNotes(history);
  const clients = useClientes();
  const granola = useGranolaMutation();

  const searchableClients = useMemo(() => (clients.data ?? []).map((client) => ({
    client, text: `${client.nombre ?? ""} ${client.institucion ?? ""}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es"),
  })), [clients.data]);

  const act = async (note: GranolaNota, action: { kind: "assign"; clienteId: string | number } | { kind: "ignore" } | { kind: "retry" }) => {
    try {
      await granola.mutateAsync({ note, action });
      if (action.kind === "assign") {
        setCreatedByNote((previous) => {
          const next = { ...previous };
          delete next[note.note_id];
          return next;
        });
      }
    } catch {
      // The hook reports the provider error; local contact state is intentionally retained for safe retry.
    }
  };

  const assignCreated = (note: GranolaNota, cliente: Cliente) => {
    setCreatedByNote((previous) => ({ ...previous, [note.note_id]: cliente }));
    setCreatingFor(null);
    void act(note, { kind: "assign", clienteId: cliente.id });
  };

  if (notes.isLoading) {
    return <section aria-label="Bandeja de reuniones" className="space-y-3">
      <div className="space-y-2 rounded-lg border border-[#E3E8F0] bg-white p-4"><Bone className="h-4 w-44" /><Bone className="h-3 w-full" /><Bone className="h-3 w-2/3" /></div>
      <div className="space-y-2 rounded-lg border border-[#E3E8F0] bg-white p-4"><Bone className="h-4 w-36" /><Bone className="h-3 w-4/5" /></div>
    </section>;
  }

  if (notes.isError) {
    return <section className="rounded-lg border border-[#F1C4C4] bg-white p-5" role="alert">
      <div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B42F2F]" /><div className="min-w-0">
        <h2 className="text-sm font-bold text-[#14213D]">No se pudo cargar la bandeja</h2>
        <p className="mt-1 break-words text-sm text-[#6F3540]">{notes.error instanceof Error ? notes.error.message : "Ocurrió un error inesperado."}</p>
        <button type="button" onClick={() => void notes.refetch()} disabled={notes.isFetching} className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#D9DFEA] px-3 py-2 text-xs font-semibold text-[#2F6FDB] disabled:opacity-50" data-testid="button-retry-granola-load"><RefreshCw className={`h-3.5 w-3.5 ${notes.isFetching ? "animate-spin" : ""}`} />{notes.isFetching ? "Actualizando…" : "Reintentar"}</button>
      </div></div>
    </section>;
  }

  const rows = notes.data ?? [];
  return (
    <section aria-label="Bandeja de reuniones" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#F28C28]">Granola · reuniones</p><h2 className="mt-1 text-lg font-bold text-[#14213D]">{history ? "Historial" : "Bandeja de asignación"}</h2><p className="mt-1 text-xs text-[#69748A]">{history ? "Reuniones procesadas o ignoradas." : "Vincula cada reunión con su contacto para iniciar el procesamiento."}</p></div>
        <button type="button" onClick={() => setHistory((value) => !value)} className="inline-flex items-center gap-2 rounded-md border border-[#D9DFEA] bg-white px-3 py-2 text-xs font-semibold text-[#3A4560] transition hover:border-[#BAC6D9]" data-testid="button-toggle-granola-history"><History className="h-4 w-4" />{history ? "Volver a la bandeja" : "Ver historial"}</button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#CFD8E6] bg-[#F8FAFD] px-5 py-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF1E3] text-[#E47A1B]"><AudioLines className="h-5 w-5" /></span>
          <h3 className="mt-3 text-sm font-semibold text-[#14213D]">{history ? "Aún no hay reuniones en el historial" : "Todo al día"}</h3>
          <p className="mt-1 text-xs text-[#69748A]">{history ? "Las reuniones procesadas o ignoradas aparecerán aquí." : "Las nuevas reuniones de Granola aparecerán aquí para asignarlas."}</p>
        </div>
      ) : <div className="space-y-2">
        {rows.map((note) => {
          const isPending = granola.isPending && granola.variables?.note.note_id === note.note_id;
          const retained = createdByNote[note.note_id];
          const selected = selectedByNote[note.note_id] ?? "";
          const search = searchByNote[note.note_id] ?? "";
          const term = search.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
          const filteredClients = searchableClients.filter(({ text }) => !term || text.includes(term)).map(({ client }) => client);
          return <article key={note.note_id} data-testid={`card-granola-${note.note_id}`} className="rounded-lg border border-[#E0E6EF] bg-white p-4 shadow-[0_1px_2px_rgba(20,33,61,.03)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5"><h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-[#14213D]">{note.titulo || "Reunión sin título"}</h3><Status note={note} /></div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#69748A]"><Clock3 className="h-3.5 w-3.5" />{granolaDate(note.fecha)}</p>
                {esEsperaIA(note) && <p role="status" className="mt-2 rounded-md border border-[#F6DDC2] bg-[#FFF9F2] px-3 py-2 text-xs text-[#8A4A0E]">La grabación y su transcripción ya están guardadas. La IA está saturada por ahora; pulsa «Analizar ahora» más tarde y se completará el resumen.</p>}
                {note.estado === "error" && note.error && !esEsperaIA(note) && <p role="alert" className="mt-2 rounded-md border border-[#F3D4D4] bg-[#FFF8F8] px-3 py-2 text-xs text-[#963A3A]">{note.error}</p>}
                {retained && <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#A6530A]"><AlertCircle className="h-3.5 w-3.5" />Contacto creado; falta asignar: {clientLabel(retained)}</p>}
              </div>
              {!history && note.estado === "error" && <button type="button" onClick={() => void act(note, { kind: "retry" })} disabled={granola.isPending} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#D9DFEA] px-3 py-2 text-xs font-semibold text-[#2F6FDB] disabled:opacity-50" data-testid={`button-retry-granola-${note.note_id}`}><RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />{isPending ? "Reintentando…" : esEsperaIA(note) ? "Analizar ahora" : "Reintentar"}</button>}
            </div>
            {!history && note.estado === "por_asignar" && <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              {retained ? <button type="button" onClick={() => void act(note, { kind: "assign", clienteId: retained.id })} disabled={granola.isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2F6FDB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#255FC2] disabled:opacity-50 sm:col-span-2" data-testid={`button-retry-assignment-${note.note_id}`}><RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />{isPending ? "Asignando…" : `Reintentar asignación a ${clientLabel(retained)}`}</button> : <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A94A7]" />
                  <input aria-label={`Buscar contacto para ${note.titulo ?? "reunión"}`} data-testid={`input-search-contact-${note.note_id}`} value={search} onChange={(event) => {
                    setSearchByNote((previous) => ({ ...previous, [note.note_id]: event.target.value }));
                    setSelectedByNote((previous) => ({ ...previous, [note.note_id]: "" }));
                  }} placeholder="Buscar por nombre o institución" className="w-full rounded-md border border-[#D9DFEA] bg-white py-2 pl-9 pr-3 text-xs text-[#14213D] outline-none focus:border-[#2F6FDB] focus:ring-2 focus:ring-[#2F6FDB]/15" />
                </div>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A94A7]" />
                  <select aria-label={`Seleccionar contacto para ${note.titulo ?? "reunión"}`} data-testid={`select-contact-${note.note_id}`} value={selected} onChange={(event) => setSelectedByNote((previous) => ({ ...previous, [note.note_id]: event.target.value }))} disabled={clients.isLoading || clients.isError || granola.isPending} className="w-full min-w-0 appearance-none rounded-md border border-[#D9DFEA] bg-white py-2 pl-9 pr-8 text-xs text-[#14213D] outline-none focus:border-[#2F6FDB] disabled:opacity-50 sm:w-[240px]">
                    <option value="">{clients.isLoading ? "Cargando contactos…" : clients.isError ? "Contactos no disponibles" : filteredClients.length ? "Selecciona un contacto" : "Sin coincidencias"}</option>
                    {filteredClients.map((client) => <option key={String(client.id)} value={String(client.id)}>{clientLabel(client)}</option>)}
                  </select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#69748A]" />
                </div>
                <button type="button" onClick={() => { const match = clients.data?.find((client) => String(client.id) === selected); if (match) void act(note, { kind: "assign", clienteId: match.id }); }} disabled={!selected || granola.isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2F6FDB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#255FC2] disabled:opacity-50" data-testid={`button-assign-granola-${note.note_id}`}><Check className="h-3.5 w-3.5" />{isPending ? "Asignando…" : "Asignar"}</button>
                {clients.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#F1C4C4] bg-[#FFF8F8] px-3 py-2 text-xs text-[#963A3A] sm:col-span-3"><span>{clients.error instanceof Error ? clients.error.message : "No se pudieron cargar los contactos."}</span><button type="button" onClick={() => void clients.refetch()} disabled={clients.isFetching} className="inline-flex items-center gap-1 font-semibold text-[#2F6FDB] disabled:opacity-50" data-testid="button-retry-clients"><RefreshCw className={`h-3 w-3 ${clients.isFetching ? "animate-spin" : ""}`} />Reintentar</button></div>}
              </>}
              {!retained && <button type="button" onClick={() => setCreatingFor(note)} disabled={granola.isPending} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#F0C69D] bg-[#FFF8F0] px-3 py-2 text-xs font-semibold text-[#A6530A] hover:bg-[#FFF1E3] disabled:opacity-50 sm:col-span-3" data-testid={`button-create-contact-${note.note_id}`}><Plus className="h-3.5 w-3.5" />Crear cliente nuevo</button>}
            </div>}
            {!history && note.estado === "por_asignar" && !retained && <div className="mt-3 flex justify-end"><button type="button" onClick={() => { if (window.confirm("¿Ignorar esta reunión? No se procesará ni se asignará a un contacto.")) void act(note, { kind: "ignore" }); }} disabled={granola.isPending} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[#69748A] hover:bg-[#F3F5F9] hover:text-[#3A4560] disabled:opacity-50" data-testid={`button-ignore-granola-${note.note_id}`}><X className="h-3.5 w-3.5" />Ignorar</button></div>}
          </article>;
        })}
      </div>}
      {creatingFor && <ContactEditor initialName={creatingFor.titulo ?? ""} onClose={() => setCreatingFor(null)} onCreated={(cliente) => assignCreated(creatingFor, cliente)} />}
      {granola.isPending && <span className="sr-only" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />Guardando asignación</span>}
    </section>
  );
}
