import { Lock, PenLine, Signature } from "lucide-react";

import type { PasoUnidadDTO } from "@/lib/types/fabricacion";
import { META_ESTADO_PASO, iconoDePaso } from "@/lib/fabricacion/constantes";
import { cn } from "@/lib/utils";
import { formatearDuracion, formatearFechaHora } from "./formato";
import { VisorFotos } from "./visor-fotos";

/**
 * La línea de tiempo del mueble: todos sus pasos, de arriba abajo, con el
 * círculo del semáforo (gris = todavía no, azul = se puede empezar, ámbar = lo
 * están haciendo, verde = terminado, rojo = problema).
 *
 * Se pinta en el SERVIDOR a propósito: así las horas se calculan una sola vez,
 * en la zona de Venezuela, y el teléfono no tiene que hacer cuentas ni corre el
 * riesgo de escribir una hora distinta a la del taller.
 */
interface LineaTiempoPasosProps {
  pasos: PasoUnidadDTO[];
  /** El paso en el que está el mueble ahora: se resalta con un borde. */
  indiceActual: number;
}

export function LineaTiempoPasos({ pasos, indiceActual }: LineaTiempoPasosProps) {
  if (pasos.length === 0) {
    return (
      <p className="rounded-3xl border-2 border-dashed border-brand-taupe/30 bg-brand-card p-6 text-lg leading-relaxed text-brand-taupe">
        Este mueble todavía no tiene pasos asignados. Avisa a tu supervisor para que le
        ponga una ruta de fabricación.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {pasos.map((paso, indice) => {
        const meta = META_ESTADO_PASO[paso.estado];
        const IconoPaso = iconoDePaso(paso.icono || paso.clave);
        const IconoCirculo = paso.estado === "BLOQUEADO" ? Lock : IconoPaso;
        const IconoEstado = meta.icono;
        const esActual = indice === indiceActual;
        const ultimo = indice === pasos.length - 1;
        const apagado = paso.estado === "BLOQUEADO" || paso.estado === "OMITIDO";

        return (
          <li key={paso.clave} className="relative flex gap-4">
            {/* Hilo que une un paso con el siguiente */}
            {ultimo ? null : (
              <span
                aria-hidden="true"
                className="absolute left-7 top-16 h-[calc(100%-2rem)] w-1 rounded-full bg-brand-taupe/20"
              />
            )}

            <span
              className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-warm-sm"
              style={{ backgroundColor: meta.punto }}
              aria-hidden="true"
            >
              <IconoCirculo className="h-7 w-7" />
            </span>

            <div
              className={cn(
                "min-w-0 flex-1 rounded-3xl border-2 bg-brand-card p-4",
                esActual ? "border-brand-accent shadow-warm-sm" : "border-brand-dark/5",
                apagado && !esActual ? "opacity-70" : ""
              )}
            >
              <p className="text-sm font-bold uppercase tracking-wide text-brand-taupe">
                Paso {indice + 1} de {pasos.length}
              </p>
              <h3 className="mt-0.5 text-xl font-bold leading-tight text-brand-dark">
                {paso.nombre}
              </h3>

              <p
                className={cn(
                  "mt-2 inline-flex min-h-[36px] items-center gap-2 rounded-full px-3 py-1 text-base font-bold",
                  meta.clases
                )}
              >
                <IconoEstado className="h-5 w-5" aria-hidden="true" />
                {meta.label}
              </p>

              {paso.estado === "COMPLETADO" ? (
                <p className="mt-2 text-base leading-snug text-green-800">
                  <span aria-hidden="true">✓ </span>
                  Hecho por {paso.completadoPorNombre || "alguien del equipo"}
                  {paso.completadoAt ? ` — ${formatearFechaHora(paso.completadoAt)}` : ""}
                  {paso.duracionMs > 0 ? ` (${formatearDuracion(paso.duracionMs)})` : ""}
                </p>
              ) : null}

              {paso.estado === "EN_CURSO" ? (
                <p className="mt-2 text-base leading-snug text-amber-800">
                  Lo está haciendo {paso.iniciadoPorNombre || "alguien del equipo"}
                  {paso.iniciadoAt ? ` desde ${formatearFechaHora(paso.iniciadoAt)}` : ""}
                </p>
              ) : null}

              {paso.estado === "OMITIDO" ? (
                <p className="mt-2 text-base leading-snug text-slate-600">
                  Se saltó este paso
                  {paso.motivoOmision ? `: ${paso.motivoOmision}` : "."}
                </p>
              ) : null}

              {paso.estado === "BLOQUEADO" ? (
                <p className="mt-2 text-base leading-snug text-slate-600">
                  {meta.descripcion}
                </p>
              ) : null}

              {paso.nota ? (
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-sand p-3 text-base leading-relaxed text-brand-dark">
                  <PenLine className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{paso.nota}</span>
                </p>
              ) : null}

              {paso.firmaUrl ? (
                <p className="mt-2 flex items-center gap-2 text-base font-semibold text-brand-taupe">
                  <Signature className="h-5 w-5" aria-hidden="true" />
                  El cliente firmó al recibirlo
                </p>
              ) : null}

              <VisorFotos fotos={paso.fotos} titulo={paso.nombre} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
