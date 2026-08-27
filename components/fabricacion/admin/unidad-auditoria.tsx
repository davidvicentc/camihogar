/**
 * "Historial de cambios" de un mueble: quién editó qué y cuándo, con el diff
 * campo a campo en dos columnas (antes → ahora).
 *
 * Cumple la decisión del dueño de que "deja anotado siempre quién edita algo".
 * Sólo pinta: se renderiza en el servidor.
 */

import { ArrowRight } from "lucide-react";
import { ETIQUETAS_ACCION_AUDITORIA } from "@/lib/fabricacion/constantes";
import type { RegistroAuditoriaDTO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import { EstadoVacio, fechaLarga } from "@/components/fabricacion/admin/tablero-piezas";

export function HistorialCambios({
  registros,
  vacio = "Nadie ha cambiado nada todavía. Cuando alguien edite algo, aquí quedará su nombre, la fecha y qué cambió exactamente.",
}: {
  registros: RegistroAuditoriaDTO[];
  vacio?: string;
}) {
  if (registros.length === 0) {
    return <EstadoVacio titulo="Sin cambios registrados" mensaje={vacio} />;
  }

  return (
    <ol className="space-y-3">
      {registros.map((registro) => {
        const meta = ETIQUETAS_ACCION_AUDITORIA[registro.accion];
        const Icono = meta.icono;

        return (
          <li
            key={registro._id}
            className="rounded-2xl border border-brand-dark/10 bg-brand-card p-4 shadow-warm-sm"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  meta.clases
                )}
              >
                <Icono className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-snug text-brand-dark">
                  {registro.descripcion}
                </p>
                <p className="mt-0.5 text-sm text-brand-taupe">
                  {fechaLarga(registro.createdAt)} · {registro.actorNombre}
                  {registro.actorRol !== "" && ` (${registro.actorRol})`}
                </p>
              </div>

              <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-semibold", meta.clases)}>
                {meta.label}
              </span>
            </div>

            {registro.cambios.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-base">
                  <thead>
                    <tr className="text-left text-sm uppercase tracking-wide text-brand-taupe">
                      <th className="w-1/3 pb-1 font-semibold">Qué cambió</th>
                      <th className="pb-1 font-semibold">Antes decía</th>
                      <th className="pb-1 font-semibold">Ahora dice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-dark/5">
                    {registro.cambios.map((cambio, indice) => (
                      <tr key={`${cambio.campo}-${indice}`} className="align-top">
                        <td className="py-2 pr-3 font-semibold text-brand-dark">
                          {cambio.etiqueta}
                        </td>
                        <td className="py-2 pr-3 text-brand-taupe line-through decoration-brand-taupe/40">
                          {cambio.antes === "" ? "(vacío)" : cambio.antes}
                        </td>
                        <td className="py-2 font-semibold text-brand-dark">
                          <span className="inline-flex items-start gap-1.5">
                            <ArrowRight
                              className="mt-1 h-4 w-4 shrink-0 text-brand-accent"
                              aria-hidden="true"
                            />
                            {cambio.despues === "" ? "(vacío)" : cambio.despues}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
