/**
 * La línea de tiempo que ve el cliente.
 *
 * REGLA DE PRIVACIDAD (§8 del contrato, se audita): aquí sólo entran los
 * hitos marcados como `notificaCliente` y de cada uno se enseña el nombre y la
 * fecha. **Nunca** quién lo hizo, ni fotos del taller, ni notas internas: esos
 * datos ni siquiera llegan a este componente, porque `getSeguimientoPublico`
 * no los lee de la base.
 *
 * Semáforo del módulo: verde lo hecho, gris lo que falta.
 */

import { Check, Circle } from "lucide-react";

import type { HitoSeguimiento } from "@/lib/data/fabricacion";

/** "12 de marzo"; cadena vacía si no hay fecha. */
function fechaCorta(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
  }).format(fecha);
}

export function LineaTiempoCliente({ hitos }: { hitos: HitoSeguimiento[] }) {
  if (hitos.length === 0) {
    return (
      <p className="rounded-3xl bg-brand-sand px-5 py-6 text-center text-base leading-relaxed text-brand-taupe">
        En cuanto tu mueble empiece a avanzar, verás aquí cada paso.
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {hitos.map((hito, indice) => {
        const ultimo = indice === hitos.length - 1;
        const fecha = fechaCorta(hito.fecha);

        return (
          <li key={`${hito.nombre}-${indice}`} className="flex gap-4">
            {/* Columna del indicador, con la línea que une los hitos. */}
            <div className="flex flex-col items-center">
              <span
                className={
                  hito.hecho
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
                    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-400"
                }
                aria-hidden="true"
              >
                {hito.hecho ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </span>
              {!ultimo && (
                <span
                  className={
                    hito.hecho
                      ? "min-h-8 w-1 flex-1 rounded-full bg-green-600/40"
                      : "min-h-8 w-1 flex-1 rounded-full bg-slate-200"
                  }
                  aria-hidden="true"
                />
              )}
            </div>

            <div className={ultimo ? "pb-0 pt-1.5" : "pb-6 pt-1.5"}>
              <p
                className={
                  hito.hecho
                    ? "text-lg font-semibold leading-tight text-brand-dark"
                    : "text-lg font-semibold leading-tight text-brand-taupe"
                }
              >
                {hito.nombre}
              </p>
              <p className="mt-0.5 text-base text-brand-taupe">
                {hito.hecho
                  ? fecha !== ""
                    ? `Listo el ${fecha}`
                    : "Listo"
                  : "Todavía no"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
