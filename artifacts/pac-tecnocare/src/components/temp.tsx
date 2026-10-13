import { normalizarTemp, TEMP_META } from "@/lib/temperatura";

export function TempBadge({ value }: { value: string | null | undefined }) {
  const m = TEMP_META[normalizarTemp(value)];
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${m.badge}`} data-testid="badge-temperatura">{m.label}</span>;
}

export function ScoreBar({ value }: { value: string | null | undefined }) {
  const m = TEMP_META[normalizarTemp(value)];
  if (m.score == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2" title={`Puntaje estimado según temperatura: ${m.score}`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EEF0F5]">
        <span className={`block h-full rounded-full ${m.bar} origin-left transition-transform duration-700`} style={{ transform: `scaleX(${m.score / 100})` }} />
      </span>
      <span className="w-5 text-xs font-semibold tabular-nums text-[#14213D]">{m.score}</span>
    </span>
  );
}
