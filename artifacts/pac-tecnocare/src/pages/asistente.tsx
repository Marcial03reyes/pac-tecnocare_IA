import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { ArrowUp, Check, Clock3, LoaderCircle, MessageCircle, Mic, MicOff, RotateCcw, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/panel-layout";
import { usePageMeta } from "@/hooks/use-page-meta";
import { usePacAssistant, type AssistantMessage } from "@/hooks/use-pac-assistant";

interface SpeechResultItem {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechResultItem>;
}

interface SpeechRecognitionErrorLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionLike;
}

const suggestions = [
  "¿A quién debo llamar hoy?",
  "Registrar una reunión",
  "¿Qué se habló con…?",
  "¿Qué clientes están calientes?",
];

function isProposalExpired(message: AssistantMessage): boolean {
  if (message.saved || message.proposalStatus === "confirmed" || message.proposalStatus === "corrected") return false;
  return Boolean(message.proposal && (
    message.proposalStatus === "expired" ||
    (message.proposal.expiresAt && Date.parse(message.proposal.expiresAt) <= Date.now())
  ));
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vigencia limitada";
  return `Vence ${new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(date)}`;
}

function ProposalReview({ message, busy, onConfirm, onCorrect }: {
  message: AssistantMessage;
  busy: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
}) {
  const proposal = message.proposal;
  const [, refreshExpiry] = useState(0);
  useEffect(() => {
    const delay = Date.parse(proposal?.expiresAt ?? "") - Date.now();
    if (!(delay > 0)) return;
    const timer = window.setTimeout(() => refreshExpiry((n) => n + 1), delay + 25);
    return () => window.clearTimeout(timer);
  }, [proposal?.expiresAt]);
  if (!proposal) return null;
  const expired = isProposalExpired(message);
  const pending = !expired && (message.proposalStatus === "pending" || !message.proposalStatus);
  const canRetry = !expired && Boolean(message.partial && message.retryable);
  const actionsEnabled = !busy && (pending || canRetry);
  const statusLabel = expired
    ? "Propuesta vencida"
    : message.proposalStatus === "confirmed" || message.saved
      ? "Guardado"
      : message.proposalStatus === "corrected"
        ? "Corregida"
        : "Revisa antes de guardar";

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-[#E6E8EA] bg-[#FFFEFB]" aria-label={`Propuesta: ${proposal.title}`}>
      <div className="flex items-start justify-between gap-3 border-b border-[#ECEDEB] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#6B7380]">Propuesta de PAC</p>
          <h3 className="mt-0.5 text-sm font-semibold text-[#17253D]">{proposal.title}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${expired ? "bg-[#FCEDEA] text-[#A44232]" : message.saved ? "bg-[#E9F2EA] text-[#386547]" : "bg-[#FFF1DF] text-[#985411]"}`}>
          {message.saved ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
          {statusLabel}
        </span>
      </div>
      <dl className="divide-y divide-[#F0F0EC] px-4">
        {proposal.fields.map((field, index) => (
          <div key={`${field.label}-${index}`} className="grid grid-cols-[minmax(78px,.45fr)_1fr] gap-3 py-2.5 text-[13px]">
            <dt className="text-[#737A83]">{field.label}</dt>
            <dd className="whitespace-pre-wrap break-words font-medium text-[#26354A]">{field.value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEDEB] bg-[#FAFAF7] px-4 py-3">
        <p className="text-[11px] text-[#858A8D]">{expired ? "Pide a PAC que prepare una propuesta nueva." : formatExpiry(proposal.expiresAt)}</p>
        <div className="flex items-center gap-2">
          {pending && (
            <button type="button" onClick={onCorrect} disabled={!actionsEnabled}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#596272] transition hover:bg-[#ECEEEB] disabled:cursor-not-allowed disabled:opacity-45">
              Corregir
            </button>
          )}
          {(pending || canRetry) && (
            <button type="button" onClick={onConfirm} disabled={!actionsEnabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E98734] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#D87525] disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {canRetry ? "Reintentar actualización" : "Confirmar"}
            </button>
          )}
        </div>
      </div>
      {message.partial && (
        <div role="alert" className="border-t border-[#F0D3C8] bg-[#FFF5F0] px-4 py-3 text-xs leading-relaxed text-[#8B3F2E]">
          La actualización quedó parcial. Reintenta para completar el mismo cambio; PAC no creará una propuesta nueva.
        </div>
      )}
      {expired && (
        <p className="border-t border-[#ECEDEB] px-4 py-3 text-xs leading-relaxed text-[#737A83]">
          Describe nuevamente el cambio en el mensaje para revisar una propuesta vigente.
        </p>
      )}
    </section>
  );
}

function AssistantBubble({ message, busy, onConfirm, onCorrect }: {
  message: AssistantMessage;
  busy: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <article className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${isUser ? "bg-[#EAE6DF] text-[#65635F]" : "bg-[#172944] text-[#F7B66C]"}`} aria-hidden="true">
        {isUser ? <Volume2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className={`max-w-[min(88%,680px)] ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[14px] leading-[1.65] ${isUser ? "rounded-tr-md bg-[#E9EDF2] text-[#27364B]" : "rounded-tl-md border border-[#EBE9E4] bg-[#FFFEFC] text-[#26354A] shadow-[0_2px_8px_rgba(28,42,58,.035)]"}`}>
          {message.text}
          {message.partial && !message.proposal && (
            <span className="mt-2 block text-xs font-medium text-[#9B4938]">No se completó todo el cambio. Revisa el estado y vuelve a intentarlo.</span>
          )}
          {message.contactId && (
            <Link href={`/panel/clientes?contacto=${encodeURIComponent(message.contactId)}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#A85D1C] underline decoration-[#DFA36E] underline-offset-4 hover:text-[#77400F]">
              Ver contacto <ArrowUp className="h-3 w-3 rotate-45" aria-hidden="true" />
            </Link>
          )}
        </div>
        {message.notice && <p role="status" className="mt-2 px-1 text-xs text-[#6D7580]">{message.notice}</p>}
        {message.proposal && <ProposalReview message={message} busy={busy} onConfirm={onConfirm} onCorrect={onCorrect} />}
      </div>
    </article>
  );
}

export default function AsistentePage() {
  usePageMeta("Asistente PAC — PAC TECNOCARE", "Asistente comercial para revisar contactos, reuniones y seguimientos.");
  const { messages, busy, waitingForModel, error, send, confirm, correct, clearError } = usePacAssistant();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [slow, setSlow] = useState(false);
  const awaitingAnswer = waitingForModel;
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setSlow(false);
    if (!awaitingAnswer) return;
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, [awaitingAnswer]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const submit = async (text: string, clearDraft = false) => {
    const value = text.trim();
    if (!value || busy) return;
    clearError();
    const sent = await send(value);
    if (sent && clearDraft) setDraft((current) => current === text ? "" : current);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(draft, true);
  };

  const startVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Este navegador no ofrece dictado por voz. Puedes escribir tu mensaje aquí.");
      return;
    }
    try {
      clearError();
      setVoiceError(null);
      setInterim("");
      const recognition = new Recognition();
      recognition.lang = "es-PE";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        if (!mountedRef.current) return;
        let freshFinal = "";
        let liveInterim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) freshFinal += result[0].transcript;
          else liveInterim += result[0].transcript;
        }
        if (freshFinal.trim()) {
          const addition = freshFinal.trim();
          setDraft((current) => `${current.trimEnd()}${current.trim() ? " " : ""}${addition}`);
        }
        setInterim(liveInterim);
      };
      recognition.onerror = (event) => {
        if (!mountedRef.current) return;
        const message = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "No hay permiso para usar el micrófono. Revisa los permisos del navegador o escribe tu mensaje."
          : event.error === "network"
            ? "El dictado no está disponible ahora. Puedes continuar escribiendo."
            : "No se pudo iniciar el dictado. Puedes continuar escribiendo.";
        setVoiceError(message);
        setListening(false);
        setInterim("");
      };
      recognition.onend = () => {
        if (!mountedRef.current) return;
        setListening(false);
        setInterim("");
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError("No se pudo iniciar el dictado. Puedes continuar escribiendo.");
    }
  };

  const handleCorrect = async (message: AssistantMessage) => {
    if (!message.proposal || busy || isProposalExpired(message)) return;
    const corrected = await correct(message.proposal.id);
    if (corrected) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleConfirm = async (message: AssistantMessage) => {
    if (!message.proposal || busy || isProposalExpired(message)) return;
    await confirm(message.proposal.id);
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="fade-up">
      <PageHeader eyebrow="Tu apoyo comercial, con revisión antes de cada cambio" title="Asistente PAC" />
      <section className="flex h-[clamp(360px,calc(100dvh-205px),760px)] flex-col overflow-hidden rounded-[22px] border border-[#E5E5DF] bg-[#FDFCF9] shadow-[0_12px_38px_rgba(25,39,56,.07)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#E9E7E1] bg-[#FFFEFC] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#172944] text-[#F4B46A]"><MessageCircle className="h-[18px] w-[18px]" /></div>
            <div>
              <p className="text-sm font-semibold text-[#172944]">PAC <span className="font-normal text-[#737B83]">· Asistente comercial</span></p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737B83]"><span className="h-1.5 w-1.5 rounded-full bg-[#679474]" /> Conversación privada en esta sesión</p>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 text-[11px] text-[#788079] sm:flex"><ShieldCheck className="h-4 w-4 text-[#64876B]" /> Tú confirmas cada cambio</div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-7" aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-4">
              <div className="mb-6 flex items-start gap-3 sm:gap-4">
                <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#172944] text-[#F7B66C]"><Sparkles className="h-4 w-4" /></div>
                <div className="max-w-2xl rounded-2xl rounded-tl-md border border-[#EBE9E4] bg-[#FFFEFC] px-5 py-4 shadow-[0_2px_8px_rgba(28,42,58,.035)]">
                  <p className="text-[15px] leading-7 text-[#29384B]">Hola, Víctor. Soy PAC. Puedo ayudarte a priorizar seguimientos y preparar cambios en el CRM. Antes de modificar algo, te mostraré exactamente qué se va a guardar para que lo confirmes.</p>
                  <p className="mt-2 text-xs text-[#858A8D]">¿Qué revisamos primero?</p>
                </div>
              </div>
              <div className="ml-12 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => { setDraft(suggestion); void submit(suggestion, true); }}
                    disabled={busy}
                    className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#E9E6DF] bg-[#FFFEFC] px-4 py-3 text-left text-[13px] font-medium text-[#475261] transition hover:border-[#DDA26B] hover:bg-[#FFF8EF] hover:text-[#82480F] disabled:cursor-not-allowed disabled:opacity-50">
                    <span>{suggestion}</span><ArrowUp className="h-3.5 w-3.5 rotate-45 text-[#AE794B] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                ))}
              </div>
              <div className="ml-12 mt-5 flex max-w-2xl items-start gap-2 rounded-lg bg-[#F1F0EB] px-3.5 py-3 text-[11px] leading-relaxed text-[#747B7D]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#758774]" />
                <p>Por privacidad, no dictes datos personales o información sensible de pacientes ni de médicos.</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-2">
              {messages.map((message) => (
                <AssistantBubble key={message.id} message={message} busy={busy}
                  onConfirm={() => void handleConfirm(message)} onCorrect={() => void handleCorrect(message)} />
              ))}
              {busy && (
                <div className="flex items-center gap-3" role="status" aria-label={waitingForModel ? "PAC está pensando" : "PAC está procesando la acción"}>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#172944] text-[#F7B66C]"><Sparkles className="h-4 w-4" /></div>
                  <div className="flex items-center gap-2 rounded-xl rounded-tl-sm border border-[#EBE9E4] bg-[#FFFEFC] px-4 py-3 text-[13px] text-[#6D7580]">
                    <span className="flex gap-1" aria-hidden="true"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D78643]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D78643] [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D78643] [animation-delay:300ms]" /></span>
                    {slow && waitingForModel ? "Está tardando un poco; reintentaré o usaré el respaldo si el modelo no está disponible." : waitingForModel ? "Pensando…" : "Procesando…"}
                  </div>
                </div>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="mx-auto mt-4 flex max-w-3xl items-start justify-between gap-3 rounded-xl border border-[#E9C7BC] bg-[#FFF5F0] px-4 py-3 text-sm text-[#874635]">
              <p>{error} Tu mensaje se conserva para que puedas reintentarlo.</p>
              <button type="button" onClick={() => void submit(draft, true)} disabled={!draft.trim() || busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-[#F8E6DD] disabled:opacity-50">
                <RotateCcw className="h-3.5 w-3.5" /> Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-[#E8E6E0] bg-[#FFFEFC]/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 sm:pt-4">
          {voiceError && <p role="status" className="mx-auto mb-2 max-w-3xl text-xs text-[#87503E]">{voiceError}</p>}
          {interim && <p aria-live="polite" className="mx-auto mb-2 max-w-3xl truncate text-xs text-[#838A90]">Dictando: {interim}</p>}
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <label htmlFor="pac-composer" className="sr-only">Escribe un mensaje para PAC</label>
            <div className="flex items-end gap-2 rounded-[18px] border border-[#DCDDD8] bg-white p-2 shadow-[0_3px_14px_rgba(32,44,57,.06)] transition focus-within:border-[#C68A52] focus-within:ring-2 focus-within:ring-[#C68A52]/15">
              <button type="button" onClick={startVoiceInput} aria-label={listening ? "Detener dictado" : "Dictar mensaje"} aria-pressed={listening}
                className={`mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${listening ? "bg-[#FFF0E6] text-[#A95128]" : "text-[#6F7981] hover:bg-[#F4F1EB] hover:text-[#A15E2B]"}`}>
                {listening ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              </button>
              <textarea id="pac-composer" ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onDraftKeyDown} rows={1} placeholder="Escribe a PAC…"
                className="max-h-36 min-h-10 flex-1 resize-y bg-transparent px-1 py-2.5 text-sm leading-5 text-[#26354A] outline-none placeholder:text-[#9A9D9D]"
                aria-describedby="composer-hint" />
              <button type="submit" disabled={!draft.trim() || busy}
                className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E98734] text-white transition hover:bg-[#D87525] disabled:cursor-not-allowed disabled:bg-[#E6E3DD] disabled:text-[#969994]"
                aria-label="Enviar mensaje">
                {busy ? <LoaderCircle className="h-[18px] w-[18px] animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
              </button>
            </div>
            <div id="composer-hint" className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-[10px] text-[#8B8E8D]">
              <span>Enter para enviar · Shift + Enter para nueva línea</span>
              <span>El dictado se procesa en el navegador; no se guarda audio.</span>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
