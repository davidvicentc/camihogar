"use client";

import type { LucideIcon } from "lucide-react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Teclado numérico gigante (§9): teclas de 5 rem de alto como mínimo y dígitos
 * a `text-3xl`. Se usa para el PIN de entrada y sirve igual para escribir un
 * código de mueble a mano.
 *
 * No guarda estado: el padre decide qué hace cada tecla. Así el mismo teclado
 * vale para un PIN de 4 dígitos y para un código de 6.
 */

const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const CLASES_TECLA =
  "flex h-20 items-center justify-center rounded-3xl border-2 border-brand-dark/10 bg-brand-card text-3xl font-bold text-brand-dark shadow-warm-sm transition-all duration-100 active:scale-95 active:bg-brand-sand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60 disabled:opacity-50 disabled:active:scale-100";

interface TecladoNumericoProps {
  onDigito: (digito: string) => void;
  onBorrar: () => void;
  deshabilitado?: boolean;
  /** Tecla libre de la esquina de abajo a la derecha (por ejemplo "Entrar"). */
  accion?: {
    icono: LucideIcon;
    etiqueta: string;
    onClick: () => void;
    deshabilitada?: boolean;
  };
}

export function TecladoNumerico({
  onDigito,
  onBorrar,
  deshabilitado = false,
  accion,
}: TecladoNumericoProps) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="Teclado numérico">
      {DIGITOS.map((digito) => (
        <button
          key={digito}
          type="button"
          onClick={() => onDigito(digito)}
          disabled={deshabilitado}
          aria-label={`Número ${digito}`}
          className={CLASES_TECLA}
        >
          {digito}
        </button>
      ))}

      <button
        type="button"
        onClick={onBorrar}
        disabled={deshabilitado}
        aria-label="Borrar el último número"
        className={cn(CLASES_TECLA, "gap-2 text-lg font-bold uppercase")}
      >
        <Delete className="h-8 w-8" aria-hidden="true" />
        <span>Borrar</span>
      </button>

      <button
        type="button"
        onClick={() => onDigito("0")}
        disabled={deshabilitado}
        aria-label="Número 0"
        className={CLASES_TECLA}
      >
        0
      </button>

      {accion ? (
        <button
          type="button"
          onClick={accion.onClick}
          disabled={deshabilitado || accion.deshabilitada}
          aria-label={accion.etiqueta}
          className={cn(
            CLASES_TECLA,
            "gap-2 border-transparent bg-green-600 text-lg font-bold uppercase text-white active:bg-green-700"
          )}
        >
          <accion.icono className="h-8 w-8" aria-hidden="true" />
          <span>{accion.etiqueta}</span>
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
