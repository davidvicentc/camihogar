"use client";

/**
 * Filtros del historial de cambios: chips grandes por tipo de cosa, selector
 * de persona, rango de fechas y buscador.
 *
 * Todo viaja en la dirección de la página (`?entidad=ROL&actorId=…`), así el
 * historial se puede compartir por chat tal cual, y la lectura la sigue
 * haciendo el servidor con `listarAuditoria`.
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Eraser, History, User } from "lucide-react";
import {
  ENTIDADES_AUDITORIA,
  type EntidadAuditoria,
} from "@/lib/types/fabricacion";
import { ETIQUETAS_ENTIDAD_AUDITORIA } from "@/lib/fabricacion/constantes";
import {
  BuscadorGrande,
  ChipFiltro,
  CLASES_SELECT,
} from "./config-compartido";

/** Lo mínimo para pintar el selector de personas. */
export interface PersonaFiltro {
  _id: string;
  nombre: string;
}

export interface ValoresFiltroAuditoria {
  busqueda: string;
  entidad: string;
  actorId: string;
  desde: string;
  hasta: string;
}

export interface PropsFiltrosAuditoria {
  valores: ValoresFiltroAuditoria;
  personas: PersonaFiltro[];
  /** Cuántos registros hay de cada tipo, para los números de los chips. */
  conteos: Record<string, number>;
  total: number;
}

export function FiltrosAuditoriaPanel({
  valores,
  personas,
  conteos,
  total,
}: PropsFiltrosAuditoria) {
  const router = useRouter();
  const ruta = usePathname();

  const [busqueda, setBusqueda] = React.useState(valores.busqueda);

  React.useEffect(() => {
    setBusqueda(valores.busqueda);
  }, [valores.busqueda]);

  const navegar = React.useCallback(
    (cambios: Partial<ValoresFiltroAuditoria>) => {
      const siguientes = { ...valores, ...cambios };
      const parametros = new URLSearchParams();
      if (siguientes.busqueda.trim() !== "") parametros.set("busqueda", siguientes.busqueda.trim());
      if (siguientes.entidad !== "") parametros.set("entidad", siguientes.entidad);
      if (siguientes.actorId !== "") parametros.set("actorId", siguientes.actorId);
      if (siguientes.desde !== "") parametros.set("desde", siguientes.desde);
      if (siguientes.hasta !== "") parametros.set("hasta", siguientes.hasta);

      const consulta = parametros.toString();
      router.push(consulta === "" ? ruta : `${ruta}?${consulta}`);
    },
    [router, ruta, valores]
  );

  const hayFiltros =
    valores.busqueda !== "" ||
    valores.entidad !== "" ||
    valores.actorId !== "" ||
    valores.desde !== "" ||
    valores.hasta !== "";

  return (
    <div className="space-y-4">
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          navegar({ busqueda });
        }}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <div className="lg:max-w-md lg:flex-1">
          <BuscadorGrande
            id="buscar-historial"
            valor={busqueda}
            onChange={setBusqueda}
            etiqueta="Buscar en el historial por lo que pasó o por el nombre"
            marcador="Buscar en el historial…"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-14 min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 bg-brand-card px-6 text-base font-bold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          <History className="h-5 w-5" aria-hidden="true" />
          BUSCAR
        </button>
        {hayFiltros ? (
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              router.push(ruta);
            }}
            className="inline-flex h-14 min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 bg-brand-card px-6 text-base font-bold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            <Eraser className="h-5 w-5" aria-hidden="true" />
            QUITAR FILTROS
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de cosa">
        <ChipFiltro
          activo={valores.entidad === ""}
          onClick={() => navegar({ entidad: "" })}
          icono={History}
          cantidad={total}
        >
          Todo
        </ChipFiltro>
        {ENTIDADES_AUDITORIA.map((entidad: EntidadAuditoria) => {
          const meta = ETIQUETAS_ENTIDAD_AUDITORIA[entidad];
          return (
            <ChipFiltro
              key={entidad}
              activo={valores.entidad === entidad}
              onClick={() => navegar({ entidad: valores.entidad === entidad ? "" : entidad })}
              icono={meta.icono}
              cantidad={conteos[entidad] ?? 0}
            >
              {meta.label}
            </ChipFiltro>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label
            htmlFor="filtro-persona"
            className="flex items-center gap-2 text-base font-bold text-brand-dark"
          >
            <User className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
            ¿Quién lo hizo?
          </label>
          <select
            id="filtro-persona"
            value={valores.actorId}
            onChange={(evento) => navegar({ actorId: evento.target.value })}
            className={CLASES_SELECT}
          >
            <option value="">Cualquier persona</option>
            <option value="admin">Administrador (dueño)</option>
            {personas.map((persona) => (
              <option key={persona._id} value={persona._id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="filtro-desde"
            className="flex items-center gap-2 text-base font-bold text-brand-dark"
          >
            <CalendarDays className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
            Desde el día
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={valores.desde}
            onChange={(evento) => navegar({ desde: evento.target.value })}
            className={CLASES_SELECT}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="filtro-hasta"
            className="flex items-center gap-2 text-base font-bold text-brand-dark"
          >
            <CalendarDays className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
            Hasta el día
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={valores.hasta}
            onChange={(evento) => navegar({ hasta: evento.target.value })}
            className={CLASES_SELECT}
          />
        </div>
      </div>
    </div>
  );
}
