import { cn } from "@/lib/utils";

/** Verde oficial de VicentStudios, usado solo en el hover del crédito. */
const VICENT_GREEN = "#B8FF57";

export const VICENT_STUDIOS = {
  name: "VicentStudios",
  domain: "vicentstudios.com",
  url: "https://vicentstudios.com",
} as const;

/**
 * Monograma oficial de VicentStudios (rombo con el vértice interior).
 * Hereda el color del texto para integrarse en cualquier superficie.
 */
export function VicentStudiosMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 23.22 57.07 Q 20 52 25.62 54.11 L 94.38 79.89 Q 100 82 105.62 79.89 L 174.38 54.11 Q 180 52 176.78 57.07 L 103.22 172.93 Q 100 178 96.78 172.93 Z M 57.65 82.76 Q 54 78 58.93 81.43 L 95.07 106.57 Q 100 110 104.93 106.57 L 141.07 81.43 Q 146 78 142.35 82.76 L 103.65 133.24 Q 100 138 96.35 133.24 Z"
      />
    </svg>
  );
}

/**
 * Crédito de autoría del sitio: logo + dominio, en una sola línea discreta.
 * El verde del estudio solo aparece al interactuar, sin robarle foco a CamiHogar.
 */
export function VicentStudiosCredit({ className }: { className?: string }) {
  return (
    <a
      href={VICENT_STUDIOS.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Sitio hecho por ${VICENT_STUDIOS.name} — ${VICENT_STUDIOS.domain}`}
      style={{ ["--vicent-green" as string]: VICENT_GREEN }}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full transition-colors hover:text-brand-bg/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4 focus-visible:ring-offset-brand-dark",
        className
      )}
    >
      <span>
        Hecho con <span className="text-brand-accent">♥</span> por
      </span>
      <VicentStudiosMark className="transition-colors group-hover:[color:var(--vicent-green)]" />
      <span className="font-medium tracking-tight transition-colors group-hover:[color:var(--vicent-green)]">
        {VICENT_STUDIOS.domain}
      </span>
    </a>
  );
}
