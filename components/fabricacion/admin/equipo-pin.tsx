"use client";

/**
 * Teclado numérico gigante para poner el PIN de entrada al taller.
 *
 * Está pensado para dedos gruesos y vista cansada: teclas de 72 px, números
 * enormes, puntos grandes que muestran cuántos números llevas y confirmación
 * obligatoria repitiendo el PIN. El PIN nunca sale del navegador salvo dentro
 * de la llamada a la Server Action que lo guarda cifrado.
 */

import * as React from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mismo criterio que `esPinValido` del servidor, sin importar código de Node. */
export function pinConFormato(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

const LONGITUD_MINIMA = 4;
const LONGITUD_MAXIMA = 6;

/** Los puntitos que enseñan cuántos números llevas escritos. */
function Puntos({ cantidad, activo }: { cantidad: number; activo: boolean }) {
  return (
    <span className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: LONGITUD_MAXIMA }).map((_, indice) => (
        <span
          key={indice}
          className={cn(
            "h-4 w-4 rounded-full border-2 transition-colors",
            indice < cantidad
              ? "border-brand-accent bg-brand-accent"
              : indice < LONGITUD_MINIMA
                ? "border-brand-dark/30 bg-transparent"
                : "border-brand-dark/12 bg-transparent"
          )}
        />
      ))}
      {activo ? (
        <span className="ml-1 text-sm font-semibold text-brand-accent">escribiendo…</span>
      ) : null}
    </span>
  );
}

export interface PropsEditorPin {
  pin: string;
  confirmacion: string;
  onCambiar: (pin: string, confirmacion: string) => void;
  /** Mensaje de validación en español, ya redactado por el formulario. */
  error?: string;
  /** Texto del primer casillero: "PIN nuevo" o "PIN de entrada". */
  etiquetaPin?: string;
}

export function EditorPin({
  pin,
  confirmacion,
  onCambiar,
  error,
  etiquetaPin = "PIN de entrada",
}: PropsEditorPin) {
  const [etapa, setEtapa] = React.useState<"pin" | "confirmacion">("pin");

  function escribir(digito: string): void {
    if (etapa === "pin") {
      if (pin.length >= LONGITUD_MAXIMA) return;
      const nuevo = pin + digito;
      onCambiar(nuevo, confirmacion);
      // Con 4 números ya es un PIN válido: pasamos solos a la confirmación.
      if (nuevo.length === LONGITUD_MINIMA) setEtapa("confirmacion");
      return;
    }
    if (confirmacion.length >= LONGITUD_MAXIMA) return;
    onCambiar(pin, confirmacion + digito);
  }

  function borrar(): void {
    if (etapa === "pin") {
      onCambiar(pin.slice(0, -1), confirmacion);
      return;
    }
    if (confirmacion.length === 0) {
      setEtapa("pin");
      onCambiar(pin.slice(0, -1), "");
      return;
    }
    onCambiar(pin, confirmacion.slice(0, -1));
  }

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setEtapa("pin")}
          aria-label={`${etiquetaPin}. Llevas ${pin.length} números`}
          className={cn(
            "flex min-h-[72px] flex-col justify-center gap-2 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
            etapa === "pin"
              ? "border-brand-accent bg-brand-accent/[0.08]"
              : "border-brand-dark/15 bg-brand-card hover:border-brand-accent/40"
          )}
        >
          <span className="text-base font-bold text-brand-dark">1. {etiquetaPin}</span>
          <Puntos cantidad={pin.length} activo={etapa === "pin"} />
        </button>

        <button
          type="button"
          onClick={() => setEtapa("confirmacion")}
          aria-label={`Repetir el PIN. Llevas ${confirmacion.length} números`}
          className={cn(
            "flex min-h-[72px] flex-col justify-center gap-2 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
            etapa === "confirmacion"
              ? "border-brand-accent bg-brand-accent/[0.08]"
              : "border-brand-dark/15 bg-brand-card hover:border-brand-accent/40"
          )}
        >
          <span className="text-base font-bold text-brand-dark">2. Repite el PIN</span>
          <Puntos cantidad={confirmacion.length} activo={etapa === "confirmacion"} />
        </button>
      </div>

      <div className="mx-auto grid max-w-sm grid-cols-3 gap-3">
        {teclas.map((digito) => (
          <button
            key={digito}
            type="button"
            onClick={() => escribir(digito)}
            aria-label={`Número ${digito}`}
            className="h-[72px] rounded-2xl border-2 border-brand-dark/15 bg-brand-card font-display text-3xl font-bold text-brand-dark transition-colors hover:border-brand-accent hover:bg-brand-accent/[0.07] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            {digito}
          </button>
        ))}
        <span aria-hidden="true" />
        <button
          type="button"
          onClick={() => escribir("0")}
          aria-label="Número 0"
          className="h-[72px] rounded-2xl border-2 border-brand-dark/15 bg-brand-card font-display text-3xl font-bold text-brand-dark transition-colors hover:border-brand-accent hover:bg-brand-accent/[0.07] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          0
        </button>
        <button
          type="button"
          onClick={borrar}
          aria-label="Borrar el último número"
          className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-brand-dark/15 bg-brand-sand text-brand-dark transition-colors hover:border-brand-accent hover:bg-brand-accent/[0.07] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          <Delete className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-bold">BORRAR</span>
        </button>
      </div>

      <p className="text-center text-base text-brand-taupe">
        Son 4 números (puedes poner hasta 6). Es lo que la persona escribirá para entrar
        a la app del taller.
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-center text-base font-semibold text-red-800"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Comprueba el par PIN + confirmación y devuelve el mensaje que hay que
 * enseñar, o cadena vacía si todo está bien.
 */
export function revisarPin(pin: string, confirmacion: string): string {
  if (pin.length < LONGITUD_MINIMA) {
    return "Escribe un PIN de 4 números. Por ejemplo: 1234.";
  }
  if (!pinConFormato(pin)) {
    return "El PIN sólo puede tener números, entre 4 y 6.";
  }
  if (confirmacion === "") return "Repite el PIN en el segundo casillero.";
  if (pin !== confirmacion) {
    return "Los dos PIN no son iguales. Borra y vuelve a escribirlos.";
  }
  return "";
}
