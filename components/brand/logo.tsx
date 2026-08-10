import Image from "next/image";
import { cn } from "@/lib/utils";

/** Superficie sobre la que se pinta el logo, no el color del logo. */
type Surface = "light" | "dark";

/** Dimensiones intrínsecas de los PNG extraídos del logo oficial. */
const MARK = { width: 502, height: 426 };
const LOCKUP = { width: 788, height: 625 };

interface LogoMarkProps {
  /** La casa siempre va en naranja salvo que se pida monocroma en blanco. */
  variant?: "color" | "white";
  className?: string;
  priority?: boolean;
}

/** Solo el monograma: la casa con la "CH" trazada en sus muros. */
export function LogoMark({
  variant = "color",
  className,
  priority = false,
}: LogoMarkProps) {
  return (
    <Image
      src={variant === "white" ? "/logo-mark-white.png" : "/logo-mark.png"}
      alt=""
      aria-hidden="true"
      width={MARK.width}
      height={MARK.height}
      priority={priority}
      className={cn("h-full w-auto select-none object-contain", className)}
    />
  );
}

interface LogoProps {
  surface?: Surface;
  /** Oculta el texto y deja solo la casa (móvil, avatares, badges). */
  markOnly?: boolean;
  className?: string;
  priority?: boolean;
}

/**
 * Lockup horizontal para barras y encabezados: la casa del logo junto al
 * wordmark compuesto en la tipografía del sistema con el tracking del original.
 */
export function Logo({
  surface = "light",
  markOnly = false,
  className,
  priority = false,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-auto" priority={priority} />
      {!markOnly && (
        <span
          className={cn(
            "font-display text-[0.95rem] font-medium leading-none tracking-[0.3em] sm:text-base",
            surface === "dark" ? "text-brand-bg" : "text-brand-dark"
          )}
        >
          CAMIHOGAR
        </span>
      )}
    </span>
  );
}

interface LogoLockupProps {
  surface?: Surface;
  className?: string;
  priority?: boolean;
}

/**
 * Lockup vertical oficial (casa + CAMIHOGAR + regla), tal cual el archivo
 * original. Para piezas de presentación: footer, splash, pantallas de acceso.
 */
export function LogoLockup({
  surface = "light",
  className,
  priority = false,
}: LogoLockupProps) {
  return (
    <Image
      src={surface === "dark" ? "/logo-lockup.png" : "/logo-lockup-light.png"}
      alt="CamiHogar"
      width={LOCKUP.width}
      height={LOCKUP.height}
      priority={priority}
      className={cn("h-auto w-full select-none object-contain", className)}
    />
  );
}
