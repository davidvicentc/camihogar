"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Las fotos que dejó cada paso: miniaturas grandes que se tocan con el pulgar
 * y, al tocarlas, la foto a pantalla completa con flechas enormes.
 *
 * Es lo único de la línea de tiempo que necesita JavaScript, por eso va aparte:
 * el resto del historial se pinta en el servidor.
 */
export function VisorFotos({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [abierta, setAbierta] = useState<number | null>(null);

  if (!Array.isArray(fotos) || fotos.length === 0) return null;

  const total = fotos.length;
  const indice = abierta ?? 0;

  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-3">
        {fotos.map((foto, posicion) => (
          <li key={`${foto}-${posicion}`}>
            <button
              type="button"
              onClick={() => setAbierta(posicion)}
              aria-label={`Ver la foto ${posicion + 1} de ${total} de ${titulo}`}
              className="h-24 w-24 overflow-hidden rounded-2xl border-2 border-brand-dark/10 bg-brand-sand transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por el operario, de dominio variable */}
              <img
                src={foto}
                alt={`Foto ${posicion + 1} de ${titulo}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {abierta !== null ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-brand-dark/95 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${indice + 1} de ${total} de ${titulo}`}
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAbierta(null)}
              aria-label="Cerrar la foto"
              className="flex min-h-[56px] min-w-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-4 text-lg font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
            >
              <X className="h-7 w-7" aria-hidden="true" />
              <span>Cerrar</span>
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto subida por el operario, de dominio variable */}
            <img
              src={fotos[indice]}
              alt={`Foto ${indice + 1} de ${titulo}`}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>

          {total > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAbierta((indice - 1 + total) % total)}
                aria-label="Ver la foto anterior"
                className="flex min-h-[64px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 text-lg font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <ChevronLeft className="h-8 w-8" aria-hidden="true" />
                <span>Anterior</span>
              </button>
              <p className="shrink-0 px-2 text-lg font-bold text-white">
                {indice + 1} de {total}
              </p>
              <button
                type="button"
                onClick={() => setAbierta((indice + 1) % total)}
                aria-label="Ver la foto siguiente"
                className="flex min-h-[64px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 text-lg font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-8 w-8" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
