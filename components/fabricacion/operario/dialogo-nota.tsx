"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, StickyNote, X } from "lucide-react";
import { toast } from "sonner";

import { agregarNota } from "@/lib/actions/fabricacion";
import { clasesBotonGrande } from "./boton-grande";

/**
 * "Dejar una nota": el recado que un operario le escribe al siguiente.
 *
 * No es un problema (para eso está el botón rojo, que bloquea el mueble) ni es
 * el campo «Notas» de la ficha del panel (ese lo pisa cualquiera y no deja
 * rastro). Esto va a la bitácora del mueble como un apunte más, con la fecha y
 * el nombre de quien lo escribió, y ya no se puede cambiar.
 */

interface DialogoNotaProps {
  codigo: string;
}

export function DialogoNota({ codigo }: DialogoNotaProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  function cerrar() {
    if (guardando) return;
    setAbierto(false);
    setError("");
  }

  function guardar() {
    const contenido = nota.trim();
    if (contenido === "") {
      setError("Escribe la nota antes de guardarla.");
      return;
    }

    iniciar(async () => {
      const resultado = await agregarNota(codigo, contenido);
      if (!resultado.ok) {
        setError(resultado.error ?? "No pudimos guardar la nota. Inténtalo otra vez.");
        return;
      }

      toast.success("Nota guardada", {
        description: "Queda en el historial del mueble con tu nombre.",
      });
      setAbierto(false);
      setNota("");
      setError("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Dejar una nota en el mueble ${codigo}`}
        className="flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-3xl border-4 border-brand-dark/20 bg-brand-card px-4 text-xl font-bold text-brand-dark transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
      >
        <StickyNote className="h-8 w-8 shrink-0" aria-hidden="true" />
        <span>DEJAR UNA NOTA</span>
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-[75] overflow-y-auto bg-brand-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-nota"
        >
          <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id="titulo-nota"
                  className="text-3xl font-bold leading-tight text-brand-dark"
                >
                  Deja una nota
                </h2>
                <p className="mt-1 text-lg text-brand-taupe">
                  Mueble <span className="font-mono font-bold">{codigo}</span>
                </p>
              </div>
              {/* Icono Y texto siempre juntos (§0.2): una «X» sola no dice qué hace. */}
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar sin guardar la nota"
                className="flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 px-4 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <X className="h-7 w-7 shrink-0" aria-hidden="true" />
                <span>CERRAR</span>
              </button>
            </div>

            <p className="mt-6 rounded-3xl border-2 border-sky-200 bg-sky-50 p-4 text-lg leading-relaxed text-sky-900">
              Es para contarle algo a quien siga con el mueble. No detiene nada. Si lo
              que pasa impide trabajar, usa mejor «REPORTAR UN PROBLEMA».
            </p>

            <div className="mt-6">
              <label htmlFor="texto-nota" className="text-xl font-bold text-brand-dark">
                ¿Qué quieres dejar anotado?
              </label>
              <textarea
                id="texto-nota"
                value={nota}
                onChange={(evento) => {
                  setNota(evento.target.value);
                  setError("");
                }}
                rows={7}
                placeholder="Por ejemplo: la madera de este mueble vino con una veta rara en la pata izquierda."
                className="mt-2 w-full rounded-3xl border-2 border-brand-dark/15 bg-brand-card p-4 text-lg leading-relaxed text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-3xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-snug text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            ) : null}

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className={clasesBotonGrande("oscuro")}
              >
                {guardando ? (
                  <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <StickyNote className="h-9 w-9 shrink-0" aria-hidden="true" />
                )}
                <span>{guardando ? "GUARDANDO…" : "SÍ, GUARDAR LA NOTA"}</span>
              </button>
              <button
                type="button"
                onClick={cerrar}
                disabled={guardando}
                className={clasesBotonGrande("gris")}
              >
                <span>NO, VOLVER</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
