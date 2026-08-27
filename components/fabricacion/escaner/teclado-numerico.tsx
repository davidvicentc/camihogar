"use client";

/**
 * Teclado numérico gigante para escribir el código del mueble a mano.
 *
 * Es la salida de emergencia de la pantalla de escaneo y tiene que funcionar
 * siempre: sin cámara, sin permiso, con la etiqueta rota o con poca luz. Por
 * eso las teclas son enormes (más de 80 px de alto, dígitos `text-3xl`) y el
 * código se va escribiendo a la vista, con el `COD-` ya puesto para que nadie
 * tenga que acordarse de él.
 */

import { useState } from "react";
import { Delete, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Los códigos tienen 6 dígitos, pero se aceptan hasta 10 por si crecen. */
const MAXIMO_DIGITOS = 10;
const MINIMO_DIGITOS = 6;

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

interface TecladoNumericoProps {
  /** Recibe el código compuesto (`COD-949473`) cuando la persona lo confirma. */
  onBuscar: (codigo: string) => void;
  /** Bloquea el botón mientras se está buscando el mueble. */
  ocupado?: boolean;
}

export function TecladoNumerico({ onBuscar, ocupado = false }: TecladoNumericoProps) {
  const [digitos, setDigitos] = useState("");

  const completo = digitos.length >= MINIMO_DIGITOS;

  const escribir = (tecla: string) => {
    setDigitos((actual) =>
      actual.length >= MAXIMO_DIGITOS ? actual : `${actual}${tecla}`
    );
  };

  const borrar = () => {
    setDigitos((actual) => actual.slice(0, -1));
  };

  const buscar = () => {
    if (!completo || ocupado) return;
    onBuscar(`COD-${digitos}`);
  };

  /** Huecos visibles para que se vea cuánto falta por escribir. */
  const visible = digitos.padEnd(MINIMO_DIGITOS, "•");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-4 border-brand-dark/10 bg-white px-4 py-6 text-center">
        <p className="text-lg font-semibold text-brand-taupe">
          Escribe los números del código
        </p>
        <p
          className="mt-2 font-mono text-4xl font-bold tabular tracking-widest text-brand-dark"
          aria-live="polite"
          aria-label={`Código escrito: COD ${digitos.split("").join(" ") || "vacío"}`}
        >
          COD-{visible}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TECLAS.map((tecla) => (
          <button
            key={tecla}
            type="button"
            onClick={() => escribir(tecla)}
            aria-label={`Número ${tecla}`}
            className="h-20 rounded-2xl border-2 border-brand-dark/10 bg-white text-3xl font-bold text-brand-dark shadow-warm-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent"
          >
            {tecla}
          </button>
        ))}

        <button
          type="button"
          onClick={borrar}
          aria-label="Borrar el último número"
          className="flex h-20 items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/10 bg-brand-sand text-xl font-bold text-brand-dark shadow-warm-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent"
        >
          <Delete className="h-7 w-7" aria-hidden="true" />
          Borrar
        </button>

        <button
          type="button"
          onClick={() => escribir("0")}
          aria-label="Número 0"
          className="h-20 rounded-2xl border-2 border-brand-dark/10 bg-white text-3xl font-bold text-brand-dark shadow-warm-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent"
        >
          0
        </button>

        <button
          type="button"
          onClick={() => setDigitos("")}
          aria-label="Empezar el código de nuevo"
          className="h-20 rounded-2xl border-2 border-brand-dark/10 bg-brand-sand text-xl font-bold text-brand-dark shadow-warm-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent"
        >
          Empezar de nuevo
        </button>
      </div>

      <Button
        type="button"
        variant="accent"
        onClick={buscar}
        disabled={!completo || ocupado}
        className="h-20 w-full rounded-3xl text-xl font-bold"
      >
        <Search className="!h-7 !w-7" aria-hidden="true" />
        {ocupado ? "BUSCANDO…" : "BUSCAR ESTE MUEBLE"}
      </Button>

      {!completo && (
        <p className="text-center text-lg text-brand-taupe">
          Faltan {MINIMO_DIGITOS - digitos.length}{" "}
          {MINIMO_DIGITOS - digitos.length === 1 ? "número" : "números"} para poder buscar.
        </p>
      )}
    </div>
  );
}
