export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none select-none ${className}`} aria-label="TECNOCARE">
      <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
        <path d="M5 13a8 8 0 0 1 16 0" fill="none" stroke="#2F6FDB" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M9 13a4 4 0 0 1 8 0" fill="none" stroke={light ? "#fff" : "#14213D"} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className={`mt-0.5 text-[11px] font-bold tracking-tight ${light ? "text-white" : "text-[#14213D]"}`}>
        TECNO<span className="font-medium text-[#2F6FDB]">CARE</span>
      </span>
    </span>
  );
}
