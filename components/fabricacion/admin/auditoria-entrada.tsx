"use client";

/**
 * Una entrada del historial de cambios.
 *
 * Enseña quién lo hizo, la frase legible que dejó escrita la action y la fecha
 * en español. Si el cambio trae diff, se despliega campo a campo en dos
 * columnas: «Antes» → «Ahora». Nada de esto se puede editar ni borrar: la
 * bitácora de auditoría sólo crece (§1.2 del contrato).
 */

import * as React from "react";
import { ChevronDown, ChevronUp, MoveRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { RegistroAuditoriaDTO } from "@/lib/types/fabricacion";
import {
  COLORES_PASO,
  ETIQUETAS_ACCION_AUDITORIA,
  ETIQUETAS_ENTIDAD_AUDITORIA,
} from "@/lib/fabricacion/constantes";
import { cn } from "@/lib/utils";
import { Avatar, fechaConHora } from "./config-compartido";

/** Color estable para el avatar de quien hizo el cambio (no se guarda en la base). */
function colorDeActor(nombre: string): string {
  let suma = 0;
  for (let indice = 0; indice < nombre.length; indice += 1) {
    suma += nombre.charCodeAt(indice);
  }
  return COLORES_PASO[suma % COLORES_PASO.length].valor;
}

/** Un valor vacío se dice con palabras, no con un hueco en blanco. */
function valorLegible(valor: string): string {
  return valor.trim() === "" ? "(vacío)" : valor;
}

export function EntradaAuditoria({ registro }: { registro: RegistroAuditoriaDTO }) {
  const [abierto, setAbierto] = React.useState(false);

  const metaEntidad = ETIQUETAS_ENTIDAD_AUDITORIA[registro.entidad];
  const metaAccion = ETIQUETAS_ACCION_AUDITORIA[registro.accion];
  const IconoEntidad = metaEntidad.icono;
  const IconoAccion = metaAccion.icono;
  const hayCambios = registro.cambios.length > 0;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <Avatar
          nombre={registro.actorNombre}
          color={colorDeActor(registro.actorNombre)}
          className="h-12 w-12 text-lg"
        />

        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-snug text-brand-dark">
            {registro.descripcion}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
                metaAccion.clases
              )}
            >
              <IconoAccion className="h-4 w-4" aria-hidden="true" />
              {metaAccion.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
                metaEntidad.clases
              )}
            >
              <IconoEntidad className="h-4 w-4" aria-hidden="true" />
              {metaEntidad.label}
            </span>
            {registro.actorRol !== "" ? (
              <span className="rounded-full bg-brand-sand px-3 py-1 text-sm font-semibold text-brand-taupe">
                {registro.actorRol}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-base text-brand-taupe">
            {fechaConHora(registro.createdAt)}
          </p>

          {hayCambios ? (
            <>
              <button
                type="button"
                onClick={() => setAbierto((previo) => !previo)}
                aria-expanded={abierto}
                className="mt-3 inline-flex h-12 min-h-[44px] items-center gap-2 rounded-xl border border-brand-dark/15 bg-brand-card px-4 text-base font-semibold text-brand-dark transition-colors hover:border-brand-accent/40 hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                {abierto ? (
                  <ChevronUp className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5" aria-hidden="true" />
                )}
                {abierto
                  ? "Ocultar qué cambió"
                  : `Ver qué cambió (${registro.cambios.length} ${
                      registro.cambios.length === 1 ? "dato" : "datos"
                    })`}
              </button>

              {abierto ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-brand-dark/10">
                  <div className="hidden bg-brand-sand/70 px-4 py-2 sm:grid sm:grid-cols-[1fr_1fr_1fr] sm:gap-4">
                    <span className="text-sm font-bold uppercase tracking-wide text-brand-taupe">
                      Dato
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide text-brand-taupe">
                      Antes
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide text-brand-taupe">
                      Ahora
                    </span>
                  </div>

                  <ul className="divide-y divide-brand-dark/10">
                    {registro.cambios.map((cambio, indice) => (
                      <li
                        key={`${cambio.campo}-${indice}`}
                        className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr] sm:gap-4"
                      >
                        <span className="text-base font-bold text-brand-dark">
                          {cambio.etiqueta}
                        </span>
                        <span className="flex items-start gap-2 text-base text-brand-taupe">
                          <span className="sm:hidden">Antes:</span>
                          <span className="line-through decoration-red-400">
                            {valorLegible(cambio.antes)}
                          </span>
                        </span>
                        <span className="flex items-start gap-2 text-base font-semibold text-brand-dark">
                          <MoveRight
                            className="mt-1 hidden h-4 w-4 shrink-0 text-brand-taupe sm:block"
                            aria-hidden="true"
                          />
                          <span className="sm:hidden">Ahora:</span>
                          {valorLegible(cambio.despues)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
