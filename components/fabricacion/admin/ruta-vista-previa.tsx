"use client";

/**
 * Vista previa en vivo: exactamente lo que va a ver el trabajador en el
 * teléfono cuando abra un mueble con esta ruta. Sirve para que quien arma la
 * ruta entienda el resultado antes de guardar.
 *
 * El primer paso aparece «Se puede empezar» (azul) y el resto «Todavía no»
 * (gris), igual que el semáforo del §9.
 */

import { Camera, ClipboardList, PenTool, ScanLine, StickyNote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { META_ESTADO_PASO, iconoDePaso } from "@/lib/fabricacion/constantes";
import type { EstadoPaso } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import type { ValoresPaso } from "./catalogo-formulario-paso";

function Requisito({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-3 py-1 text-sm font-semibold text-brand-taupe">
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  );
}

export interface VistaPreviaOperarioProps {
  nombreRuta: string;
  pasos: ValoresPaso[];
}

export function VistaPreviaOperario({ nombreRuta, pasos }: VistaPreviaOperarioProps) {
  if (pasos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-dark/15 bg-white p-6 text-center text-base text-brand-taupe">
        Añade pasos a la ruta y aquí verás cómo los va a ver el trabajador.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border border-brand-dark/10 bg-brand-bg p-4">
      <div className="mx-auto max-w-md space-y-3">
        <div className="rounded-2xl bg-brand-dark p-4 text-brand-bg">
          <p className="text-sm uppercase tracking-wide text-brand-bg/60">Así lo verá el taller</p>
          <p className="font-display text-xl font-semibold">
            {nombreRuta.trim() === "" ? "Ruta sin nombre" : nombreRuta}
          </p>
          <p className="mt-1 text-base text-brand-bg/70">
            PASO 1 DE {pasos.length} · progreso 0 %
          </p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-0 rounded-full bg-brand-accent" />
          </div>
        </div>

        <ol className="space-y-2">
          {pasos.map((paso, indice) => {
            const estado: EstadoPaso = indice === 0 ? "LISTO" : "BLOQUEADO";
            const meta = META_ESTADO_PASO[estado];
            const IconoEstado = meta.icono;
            const IconoPaso = iconoDePaso(paso.icono || paso.clave);

            return (
              <li
                key={`${paso.clave}-${indice}`}
                className={cn(
                  "rounded-2xl border bg-white p-4",
                  indice === 0 ? "border-sky-300 shadow-warm-sm" : "border-brand-dark/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
                    style={{ backgroundColor: `${paso.color}1A`, color: paso.color }}
                  >
                    <IconoPaso className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-taupe">
                      Paso {indice + 1} de {pasos.length}
                    </p>
                    <p className="text-lg font-bold leading-tight text-brand-dark">
                      {paso.nombre.trim() === "" ? "Paso sin nombre" : paso.nombre}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
                        meta.clases
                      )}
                    >
                      <IconoEstado className="h-4 w-4" aria-hidden="true" />
                      {meta.label}
                    </span>

                    {paso.instrucciones.trim() !== "" ? (
                      <p className="mt-2 whitespace-pre-line text-base text-brand-dark/80">
                        {paso.instrucciones}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {paso.requiereFoto ? (
                        <Requisito
                          icono={Camera}
                          texto={`${paso.minFotos} ${paso.minFotos === 1 ? "foto" : "fotos"}`}
                        />
                      ) : null}
                      {paso.requiereEscaneo ? <Requisito icono={ScanLine} texto="Escanear" /> : null}
                      {paso.requiereFirma ? <Requisito icono={PenTool} texto="Firma" /> : null}
                      {paso.requiereNota ? <Requisito icono={StickyNote} texto="Nota" /> : null}
                      {paso.checklist.length > 0 ? (
                        <Requisito
                          icono={ClipboardList}
                          texto={`${paso.checklist.length} ${
                            paso.checklist.length === 1 ? "comprobación" : "comprobaciones"
                          }`}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
