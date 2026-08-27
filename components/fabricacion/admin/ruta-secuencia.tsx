"use client";

/**
 * La secuencia de una ruta pintada como fichas encadenadas de colores: se ve
 * de un vistazo por dónde pasa el mueble y en qué orden.
 */

import { ChevronRight } from "lucide-react";
import { iconoDePaso } from "@/lib/fabricacion/constantes";
import { cn } from "@/lib/utils";

/** Lo mínimo que hace falta para pintar una ficha de la cadena. */
export interface PasoDeCadena {
  clave: string;
  nombre: string;
  icono: string;
  color: string;
}

export interface SecuenciaPasosProps {
  pasos: PasoDeCadena[];
  /** Cuántas fichas se pintan antes del «y N más». */
  maximo?: number;
  className?: string;
}

export function SecuenciaPasos({ pasos, maximo = 6, className }: SecuenciaPasosProps) {
  if (pasos.length === 0) {
    return (
      <p className={cn("text-base text-brand-taupe", className)}>
        Esta ruta todavía no tiene pasos.
      </p>
    );
  }

  const visibles = pasos.slice(0, maximo);
  const restantes = pasos.length - visibles.length;

  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibles.map((paso, indice) => {
        const Icono = iconoDePaso(paso.icono || paso.clave);
        return (
          <li key={`${paso.clave}-${indice}`} className="flex items-center gap-1.5">
            <span
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold"
              style={{
                backgroundColor: `${paso.color}14`,
                borderColor: `${paso.color}55`,
                color: paso.color,
              }}
            >
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-brand-dark">
                {indice + 1}. {paso.nombre}
              </span>
            </span>
            {indice < visibles.length - 1 || restantes > 0 ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-brand-taupe" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}

      {restantes > 0 ? (
        <li className="rounded-full border border-brand-dark/15 bg-white px-3 py-1.5 text-sm font-semibold text-brand-taupe">
          y {restantes} {restantes === 1 ? "paso más" : "pasos más"}
        </li>
      ) : null}
    </ol>
  );
}
