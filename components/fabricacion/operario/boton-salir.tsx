"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { cerrarSesionOperario } from "@/lib/actions/sesion-fabrica";
import { clasesBotonGrande } from "./boton-grande";

/**
 * "Salir" de la cabecera del taller.
 *
 * Pregunta antes, porque un toque sin querer en el móvil no puede echar a
 * nadie del turno: dos botones grandes con texto explícito, nada de "¿Seguro?".
 */
export function BotonSalir({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [preguntando, setPreguntando] = useState(false);
  const [enviando, iniciar] = useTransition();

  function salir() {
    iniciar(async () => {
      const resultado = await cerrarSesionOperario();
      if (!resultado.ok) {
        toast.error(
          resultado.error ?? "No pudimos cerrar la sesión. Vuelve a intentarlo."
        );
        return;
      }
      toast.success("Saliste del taller. ¡Hasta luego!");
      router.replace("/fabrica/login");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPreguntando(true)}
        aria-label={`Salir del taller (${nombre})`}
        className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl border-2 border-brand-bg/30 px-4 py-2 text-base font-bold text-brand-bg transition-colors hover:bg-brand-bg/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
      >
        <LogOut className="h-6 w-6" aria-hidden="true" />
        <span>Salir</span>
      </button>

      {preguntando ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-dark/70 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-salir"
        >
          <div className="w-full max-w-md rounded-3xl bg-brand-card p-6 text-brand-dark shadow-warm-lg">
            <h2 id="titulo-salir" className="text-2xl font-bold leading-tight">
              ¿Quieres salir del taller?
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
              Tu trabajo queda guardado. Para volver a entrar tendrás que tocar tu
              nombre y escribir tu PIN otra vez.
            </p>

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={salir}
                disabled={enviando}
                className={clasesBotonGrande("rojo")}
              >
                {enviando ? (
                  <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-9 w-9 shrink-0" aria-hidden="true" />
                )}
                <span>SÍ, SALIR</span>
              </button>
              <button
                type="button"
                onClick={() => setPreguntando(false)}
                disabled={enviando}
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
