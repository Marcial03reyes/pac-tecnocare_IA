import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pacChat, type PacChatInput, type PacChatReply, type PacChatProposal } from "@workspace/api-client-react";
import { useAuth } from "@/auth/auth-provider";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "./use-toast";

export interface AssistantMessage {
  id: string; role: "user" | "assistant"; text: string; proposal?: PacChatProposal;
  contactId?: string; saved?: boolean; partial?: boolean; retryable?: boolean;
  notice?: string;
  proposalStatus?: "pending" | "confirmed" | "corrected" | "expired";
}
interface State { messages: AssistantMessage[]; busy: boolean; error: string | null; operation?: PacChatInput["action"] }
const empty = (): State => ({ messages: [], busy: false, error: null });
function historyOf(messages: AssistantMessage[]): PacChatInput["history"] {
  const history = messages.slice(-40).map((m) => ({
    role: m.role, text: `${m.text}${m.proposal ? `\n[Propuesta ${m.proposalStatus ?? "pending"}: ${m.proposal.title}]\n${m.proposal.fields.map((f) => `${f.label}: ${f.value}`).join("\n")}` : ""}`.slice(0, 16000),
  }));
  while (history.length > 1 && (history[0].role !== "user" || history.reduce((n, m) => n + m.text.length, 0) > 80_000)) history.shift();
  return history;
}
function errorInfo(error: unknown) {
  const e = error as { status?: number; data?: { error?: string; code?: string } };
  return { status: e?.status, code: e?.data?.code, text: e?.data?.error || (error instanceof Error && error.message.startsWith("Tu sesión") ? error.message : "No pude completar la consulta. Revisa tu conexión e inténtalo nuevamente.") };
}
export function usePacAssistant() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = ["pac-assistant", uid];
  const q = useQuery<State>({ queryKey: key, queryFn: empty, enabled: false, initialData: empty, staleTime: Infinity, gcTime: 30 * 60_000 });
  const state = q.data ?? empty();
  const update = (fn: (s: State) => State) => qc.setQueryData<State>(key, (old) => old ? fn(old) : undefined);
  const latest = () => qc.getQueryData<State>(key) ?? empty();
  async function request(input: PacChatInput): Promise<PacChatReply> {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error || !data.session || data.session.user.id !== uid) throw new Error("Tu sesión cambió o expiró. Vuelve a ingresar al panel.");
    return pacChat(input, { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
  }
  async function stillCurrent() {
    const { data } = await requireSupabase().auth.getSession();
    return data.session?.user.id === uid && Boolean(qc.getQueryData(key));
  }
  function fail(error: unknown, proposalId?: string) {
    const info = errorInfo(error);
    update((s) => ({ ...s, error: info.text, messages: s.messages.map((m) => m.proposal?.id === proposalId && info.status === 409
      ? { ...m, proposalStatus: "expired", retryable: false } : m) }));
    toast({ variant: "destructive", title: "PAC no pudo completar la acción", description: info.text });
  }
  async function send(text: string): Promise<boolean> {
    const cleaned = text.trim();
    if (!cleaned || !uid || latest().busy) return false;
    if (cleaned.length > 16000) { update((s) => ({ ...s, error: "El mensaje es demasiado largo. Envíalo en partes de hasta 16 000 caracteres." })); return false; }
    const messages = [...latest().messages];
    // Retrying an unsent message keeps the same request id and avoids duplicate user bubbles.
    const previous = messages.at(-1);
    const userMessage: AssistantMessage = previous?.role === "user" && previous.text === cleaned
      ? previous : { id: crypto.randomUUID(), role: "user", text: cleaned };
    if (userMessage !== previous) messages.push(userMessage);
    update((s) => ({ ...s, busy: true, operation: "message", error: null, messages }));
    try {
      const reply = await request({ action: "message", history: historyOf(messages), requestId: userMessage.id });
      if (!(await stillCurrent())) return false;
      update((s) => ({
        ...s, error: null,
        messages: [
          ...s.messages.map((m) => reply.proposal && m.proposalStatus === "pending" && !m.partial ? { ...m, proposalStatus: "corrected" as const } : m),
          { id: crypto.randomUUID(), role: "assistant", ...reply, proposalStatus: reply.proposal ? "pending" : undefined },
        ],
      }));
      return true;
    } catch (error) { if (await stillCurrent()) fail(error); return false; }
    finally { update((s) => ({ ...s, busy: false, operation: undefined })); }
  }
  async function confirm(id: string): Promise<void> {
    if (!uid || latest().busy) return;
    const proposed = latest().messages.find((m) => m.proposal?.id === id);
    if (!proposed || proposed.proposalStatus !== "pending" || Date.parse(proposed.proposal!.expiresAt) <= Date.now()) return;
    update((s) => ({ ...s, busy: true, operation: "confirm", error: null }));
    try {
      const reply = await request({ action: "confirm", confirmationId: id, history: historyOf(latest().messages) });
      if (!(await stillCurrent())) return;
      update((s) => ({
        ...s, messages: [
          ...s.messages.map((m) => m.proposal?.id === id ? {
            ...m, partial: reply.partial, retryable: reply.retryable, saved: reply.saved,
            proposalStatus: reply.partial ? reply.retryable ? "pending" as const : "expired" as const : "confirmed" as const,
            ...(reply.partial ? { text: reply.text, contactId: reply.contactId } : {}),
          } : m),
          ...(reply.partial ? [] : [{ id: crypto.randomUUID(), role: "assistant" as const, ...reply }]),
        ], error: reply.partial ? reply.text : null,
      }));
      if (reply.saved || reply.partial) await qc.invalidateQueries({ queryKey: ["pac", uid] });
      toast(reply.partial ? { title: "Reunión guardada; actualización pendiente", description: reply.text, variant: "destructive" } : { title: "Confirmación guardada", description: reply.text });
    } catch (error) { if (await stillCurrent()) fail(error, id); }
    finally { update((s) => ({ ...s, busy: false, operation: undefined })); }
  }
  async function correct(id: string): Promise<boolean> {
    if (!uid || latest().busy) return false;
    const proposed = latest().messages.find((m) => m.proposal?.id === id);
    if (!proposed || proposed.proposalStatus !== "pending") return false;
    // A partially saved meeting cannot be canceled as if nothing had been written.
    if (proposed.partial) { update((s) => ({ ...s, error: "La reunión ya está guardada. Reintenta la actualización o abre el contacto para revisarla." })); return false; }
    update((s) => ({ ...s, busy: true, operation: "correct", error: null }));
    try {
      const reply = await request({ action: "correct", confirmationId: id, history: historyOf(latest().messages) });
      if (!(await stillCurrent())) return false;
      update((s) => ({
        ...s, messages: [...s.messages.map((m) => m.proposal?.id === id ? { ...m, proposalStatus: "corrected" as const } : m), { id: crypto.randomUUID(), role: "assistant", ...reply }],
      }));
      return true;
    } catch (error) { if (await stillCurrent()) fail(error, id); return false; }
    finally { update((s) => ({ ...s, busy: false, operation: undefined })); }
  }
  return { messages: state.messages, busy: state.busy, waitingForModel: state.busy && state.operation === "message", error: state.error, send, confirm, correct, clearError: () => update((s) => ({ ...s, error: null })) };
}
