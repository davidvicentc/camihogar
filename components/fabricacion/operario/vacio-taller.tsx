import type { LucideIcon } from "lucide-react";
import { BotonGrandeLink, type TonoBoton } from "./boton-grande";

/**
 * Pantalla vacía amable (§9): dibujo grande, una frase que no culpa a nadie y
 * SIEMPRE una salida. Nunca se deja al operario mirando una pantalla en blanco
 * sin saber qué tocar.
 */
interface VacioTallerProps {
  icono: LucideIcon;
  titulo: string;
  mensaje: string;
  accion?: {
    href: string;
    texto: string;
    icono: LucideIcon;
    tono?: TonoBoton;
  };
  /** Un enlace pequeño de segunda opción, debajo del botón. */
  secundaria?: { href: string; texto: string };
}

export function VacioTaller({
  icono: Icono,
  titulo,
  mensaje,
  accion,
  secundaria,
}: VacioTallerProps) {
  return (
    <section className="rounded-3xl border-2 border-dashed border-brand-taupe/30 bg-brand-card px-5 py-10 text-center">
      <span
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-sand text-brand-taupe"
        aria-hidden="true"
      >
        <Icono className="h-12 w-12" />
      </span>
      <h2 className="mt-6 text-2xl font-bold leading-tight text-brand-dark">{titulo}</h2>
      <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-brand-taupe">
        {mensaje}
      </p>

      {accion ? (
        <div className="mt-7">
          <BotonGrandeLink
            href={accion.href}
            tono={accion.tono ?? "marca"}
            icono={accion.icono}
          >
            {accion.texto}
          </BotonGrandeLink>
        </div>
      ) : null}

      {secundaria ? (
        <a
          href={secundaria.href}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center px-4 text-lg font-semibold text-brand-accent underline underline-offset-4"
        >
          {secundaria.texto}
        </a>
      ) : null}
    </section>
  );
}
