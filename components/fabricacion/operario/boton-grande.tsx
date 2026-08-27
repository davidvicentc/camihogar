import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * El botón grande del taller (§9 del contrato).
 *
 * Ancho completo, alto mínimo de 5 rem (`h-20`), texto `text-xl font-bold` e
 * icono grande a la izquierda. Es el mismo componente en todas las pantallas
 * para que el operario reconozca "el botón" sin leer.
 *
 * Los colores siguen el semáforo del módulo:
 * gris = todavía no · azul = se puede empezar · ámbar = está en curso ·
 * verde = terminado · rojo = problema.
 */

export type TonoBoton = "azul" | "ambar" | "verde" | "rojo" | "gris" | "marca" | "oscuro";

const TONOS: Record<TonoBoton, string> = {
  azul: "bg-sky-600 text-white shadow-warm hover:bg-sky-700 focus-visible:ring-sky-300",
  ambar:
    "bg-amber-500 text-brand-dark shadow-warm hover:bg-amber-600 focus-visible:ring-amber-300",
  verde:
    "bg-green-600 text-white shadow-warm hover:bg-green-700 focus-visible:ring-green-300",
  rojo: "bg-red-600 text-white shadow-warm hover:bg-red-700 focus-visible:ring-red-300",
  gris: "bg-slate-200 text-slate-700 border-2 border-slate-300 focus-visible:ring-slate-400",
  marca:
    "bg-ember-gradient text-white shadow-ember hover:brightness-110 focus-visible:ring-brand-accent/50",
  oscuro:
    "bg-brand-dark text-brand-bg shadow-warm hover:bg-brand-espresso focus-visible:ring-brand-accent/50",
};

const BASE =
  "flex min-h-[5rem] w-full items-center justify-center gap-4 rounded-3xl px-5 py-4 text-center text-xl font-bold leading-tight tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100";

/** Clases del botón grande, para reutilizarlas en `<button>` o `<a>`. */
export function clasesBotonGrande(tono: TonoBoton, extra?: string): string {
  return cn(BASE, TONOS[tono], extra);
}

interface BotonGrandeLinkProps {
  href: string;
  tono: TonoBoton;
  icono: LucideIcon;
  children: React.ReactNode;
  /** Texto para lectores de pantalla, si el visible no basta. */
  ariaLabel?: string;
  className?: string;
}

/** El botón grande cuando lo que hace es ir a otra pantalla. */
export function BotonGrandeLink({
  href,
  tono,
  icono: Icono,
  children,
  ariaLabel,
  className,
}: BotonGrandeLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={clasesBotonGrande(tono, className)}
    >
      <Icono className="h-9 w-9 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

interface CartelBloqueoProps {
  icono: LucideIcon;
  titulo: string;
  detalle?: string;
  tono?: "gris" | "rojo" | "azul" | "verde";
}

const TONOS_CARTEL: Record<NonNullable<CartelBloqueoProps["tono"]>, string> = {
  gris: "border-slate-300 bg-slate-100 text-slate-700",
  rojo: "border-red-300 bg-red-50 text-red-800",
  azul: "border-sky-300 bg-sky-50 text-sky-900",
  verde: "border-green-300 bg-green-50 text-green-900",
};

/**
 * Cuando NO hay nada que tocar, en el sitio del botón grande va este cartel:
 * mismo tamaño, mismo peso visual, pero explica qué pasa y qué hacer.
 */
export function CartelBloqueo({
  icono: Icono,
  titulo,
  detalle,
  tono = "gris",
}: CartelBloqueoProps) {
  return (
    <div
      className={cn(
        "flex min-h-[5rem] w-full items-center gap-4 rounded-3xl border-2 px-5 py-4",
        TONOS_CARTEL[tono]
      )}
      role="status"
    >
      <Icono className="h-9 w-9 shrink-0" aria-hidden="true" />
      <div className="text-left">
        <p className="text-xl font-bold leading-tight">{titulo}</p>
        {detalle ? <p className="mt-1 text-base leading-snug">{detalle}</p> : null}
      </div>
    </div>
  );
}
