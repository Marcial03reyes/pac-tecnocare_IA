const BASE = import.meta.env.BASE_URL;
export const LOGO_SRC = `${BASE}tecnocare_logo.png`;
export const ICON_SRC = `${BASE}tecnocare_icono.png`;

/** Full TECNOCARE logo. Dark-blue text must sit on white: `light` adds a white pad for navy backgrounds. */
export function Logo({ className = "", light = false, size = "md" }: { className?: string; light?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? "h-7" : size === "lg" ? "h-14" : "h-9";
  const img = <img src={LOGO_SRC} alt="TECNOCARE" className={`${h} w-auto object-contain select-none`} draggable={false} />;
  return light
    ? <span className={`inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 ${className}`}>{img}</span>
    : <span className={`inline-flex items-center ${className}`}>{img}</span>;
}

export function LogoIcon({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={ICON_SRC} alt="TECNOCARE" className={`${className} object-contain select-none`} draggable={false} />;
}
