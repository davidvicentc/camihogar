"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, HelpCircle, LayoutList, ScanLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";

/**
 * La barra de abajo del taller: tres destinos gigantes, siempre visibles, con
 * icono Y texto (§9). Cada casilla ocupa un tercio de la pantalla, así que es
 * imposible fallar el toque aunque se tengan las manos llenas de barniz.
 *
 * "AYUDA" no navega a otra página: abre esta misma pantalla de instrucciones.
 * Es a propósito — quien está perdido no debe perder también el sitio donde
 * estaba.
 */

// Letra `text-lg` como el resto del taller (§9): es la única navegación que el
// carpintero tiene siempre delante y no puede ser el texto más pequeño de la
// app. Sin `uppercase`, que a estos cuerpos cuesta más leer, y con la barra más
// alta para que la etiqueta quepa aunque parta en dos líneas.
const CLASES_CASILLA =
  "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-lg font-bold leading-tight tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60";

export function BarraInferior() {
  const ruta = usePathname();
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  const enMiTrabajo = ruta === "/fabrica";
  const enEscanear = ruta.startsWith("/fabrica/escanear");

  return (
    <>
      <nav
        aria-label="Menú del taller"
        className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-brand-dark/10 bg-brand-card pb-[env(safe-area-inset-bottom)] shadow-warm-lg"
      >
        <div className="mx-auto flex w-full max-w-2xl items-stretch gap-2 px-3 py-2">
          <Link
            href="/fabrica"
            aria-label="Ir a mi trabajo"
            aria-current={enMiTrabajo ? "page" : undefined}
            className={cn(
              CLASES_CASILLA,
              enMiTrabajo
                ? "bg-brand-accent/12 text-brand-accent"
                : "text-brand-taupe hover:bg-brand-sand"
            )}
          >
            <LayoutList className="h-7 w-7" aria-hidden="true" />
            <span>Mi trabajo</span>
          </Link>

          <Link
            href="/fabrica/escanear"
            aria-label="Escanear el código de un mueble"
            aria-current={enEscanear ? "page" : undefined}
            className={cn(
              CLASES_CASILLA,
              enEscanear
                ? "bg-brand-accent/12 text-brand-accent"
                : "text-brand-taupe hover:bg-brand-sand"
            )}
          >
            <ScanLine className="h-7 w-7" aria-hidden="true" />
            <span>Escanear</span>
          </Link>

          <button
            type="button"
            onClick={() => setAyudaAbierta(true)}
            aria-label="Abrir la ayuda del taller"
            aria-expanded={ayudaAbierta}
            className={cn(CLASES_CASILLA, "text-brand-taupe hover:bg-brand-sand")}
          >
            <HelpCircle className="h-7 w-7" aria-hidden="true" />
            <span>Ayuda</span>
          </button>
        </div>
      </nav>

      {ayudaAbierta ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-brand-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-ayuda"
        >
          <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6">
            <div className="flex items-start justify-between gap-4">
              <h2
                id="titulo-ayuda"
                className="text-3xl font-bold leading-tight text-brand-dark"
              >
                Cómo se usa el taller
              </h2>
              <button
                type="button"
                onClick={() => setAyudaAbierta(false)}
                aria-label="Cerrar la ayuda"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border-2 border-brand-dark/15 text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <X className="h-7 w-7" aria-hidden="true" />
              </button>
            </div>

            <ol className="mt-6 space-y-4">
              <PasoAyuda
                numero={1}
                titulo="Busca tu mueble"
                texto="En «Mi trabajo» aparecen los muebles que te tocan. Si no lo ves, toca «Escanear» y apunta la cámara al código pegado al mueble."
              />
              <PasoAyuda
                numero={2}
                titulo="Toca el botón grande"
                texto="Cada mueble tiene un solo botón grande. Si es azul, puedes empezar. Si es ámbar, es un trabajo que ya empezaste y hay que terminar."
              />
              <PasoAyuda
                numero={3}
                titulo="Sigue la pantalla"
                texto="La app te va pidiendo una cosa cada vez: la foto, la lista, la nota o la firma. Cuando termines, toca el botón verde «SÍ, YA TERMINÉ ESTE PASO»."
              />
              <PasoAyuda
                numero={4}
                titulo="Si algo sale mal"
                texto="Toca «REPORTAR UN PROBLEMA» en la ficha del mueble. Elige el motivo, toma una foto y tu supervisor lo verá enseguida."
              />
            </ol>

            <div className="mt-8 rounded-3xl border-2 border-sky-200 bg-sky-50 p-5">
              <p className="flex items-start gap-3 text-lg leading-relaxed text-sky-900">
                <Camera className="mt-1 h-7 w-7 shrink-0" aria-hidden="true" />
                <span>
                  Si la cámara no abre, deja que el teléfono use la cámara cuando te lo
                  pregunte. También puedes escribir el código a mano en la pantalla de
                  escanear.
                </span>
              </p>
            </div>

            <p className="mt-6 text-lg leading-relaxed text-brand-taupe">
              ¿Sigues atascado? Habla con tu supervisor: él puede desbloquear el mueble
              o corregir un paso.
            </p>

            <div className="mt-7">
              <button
                type="button"
                onClick={() => setAyudaAbierta(false)}
                className={clasesBotonGrande("oscuro")}
              >
                <span>VOLVER AL TRABAJO</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PasoAyuda({
  numero,
  titulo,
  texto,
}: {
  numero: number;
  titulo: string;
  texto: string;
}) {
  return (
    <li className="flex gap-4 rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-2xl font-bold text-white"
        aria-hidden="true"
      >
        {numero}
      </span>
      <div>
        <p className="text-xl font-bold leading-tight text-brand-dark">{titulo}</p>
        <p className="mt-1 text-lg leading-relaxed text-brand-taupe">{texto}</p>
      </div>
    </li>
  );
}
