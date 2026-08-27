"use client";

/**
 * HISTORIAL DE CAMBIOS: la línea de tiempo de quién tocó qué y cuándo, con el
 * diff campo a campo desplegable.
 *
 * Es lo que pidió el dueño en la decisión 2 del contrato: *"deja anotado
 * siempre quién edita algo"*. Aquí sólo se lee: esta bitácora no se puede
 * editar ni borrar desde ninguna pantalla.
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, History, ShieldCheck } from "lucide-react";
import type { RegistroAuditoriaDTO } from "@/lib/types/fabricacion";
import {
  CabeceraConfig,
  EstadoVacio,
  ToasterFabrica,
  fechaCorta,
} from "./config-compartido";
import { EntradaAuditoria } from "./auditoria-entrada";
import {
  FiltrosAuditoriaPanel,
  type PersonaFiltro,
  type ValoresFiltroAuditoria,
} from "./auditoria-filtros";

export interface PropsLineaTiempo {
  registros: RegistroAuditoriaDTO[];
  /** Cuántos hay con TODOS los filtros aplicados: manda en la paginación. */
  total: number;
  /** Cuántos hay sin el filtro de tipo: es el número del chip «Todo». */
  totalGeneral: number;
  pagina: number;
  porPagina: number;
  valores: ValoresFiltroAuditoria;
  personas: PersonaFiltro[];
  conteos: Record<string, number>;
}

/** Agrupa los registros por día para poner un encabezado de fecha. */
function agruparPorDia(
  registros: RegistroAuditoriaDTO[]
): { dia: string; entradas: RegistroAuditoriaDTO[] }[] {
  const grupos: { dia: string; entradas: RegistroAuditoriaDTO[] }[] = [];
  for (const registro of registros) {
    const dia = fechaCorta(registro.createdAt);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.entradas.push(registro);
    else grupos.push({ dia, entradas: [registro] });
  }
  return grupos;
}

export function LineaTiempoAuditoria({
  registros,
  total,
  totalGeneral,
  pagina,
  porPagina,
  valores,
  personas,
  conteos,
}: PropsLineaTiempo) {
  const router = useRouter();
  const ruta = usePathname();

  const ultimaPagina = Math.max(1, Math.ceil(total / porPagina));
  const grupos = React.useMemo(() => agruparPorDia(registros), [registros]);

  function irAPagina(destino: number): void {
    const parametros = new URLSearchParams();
    if (valores.busqueda !== "") parametros.set("busqueda", valores.busqueda);
    if (valores.entidad !== "") parametros.set("entidad", valores.entidad);
    if (valores.actorId !== "") parametros.set("actorId", valores.actorId);
    if (valores.desde !== "") parametros.set("desde", valores.desde);
    if (valores.hasta !== "") parametros.set("hasta", valores.hasta);
    if (destino > 1) parametros.set("pagina", String(destino));

    const consulta = parametros.toString();
    router.push(consulta === "" ? ruta : `${ruta}?${consulta}`);
  }

  const hayFiltros =
    valores.busqueda !== "" ||
    valores.entidad !== "" ||
    valores.actorId !== "" ||
    valores.desde !== "" ||
    valores.hasta !== "";

  return (
    <div className="space-y-8">
      <ToasterFabrica />

      <CabeceraConfig
        titulo="Historial de cambios"
        contador={`${total} ${total === 1 ? "cambio anotado" : "cambios anotados"}`}
        descripcion="Todo lo que alguien crea, edita o elimina queda aquí, con su nombre y la fecha."
      />

      <p className="flex items-start gap-3 rounded-2xl border-2 border-brand-dark/10 bg-brand-sand/50 p-4 text-base text-brand-taupe">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand-taupe" aria-hidden="true" />
        Este historial sólo se lee: nadie puede cambiarlo ni borrarlo, ni siquiera quien
        administra. Es la garantía de que siempre se sabe quién hizo cada cosa.
      </p>

      <FiltrosAuditoriaPanel
        valores={valores}
        personas={personas}
        conteos={conteos}
        total={totalGeneral}
      />

      {registros.length === 0 ? (
        <EstadoVacio
          icono={History}
          titulo={hayFiltros ? "No hay cambios con esos filtros" : "Todavía no hay cambios registrados."}
          mensaje={
            hayFiltros
              ? "Prueba con otras fechas, con otra persona, o toca «QUITAR FILTROS» para ver el historial completo."
              : "En cuanto alguien cree o edite algo —un rol, una persona, una ruta, un pedido— aparecerá aquí con su nombre y la fecha."
          }
        />
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => (
            <section key={grupo.dia} className="space-y-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-brand-taupe">
                {grupo.dia}
              </h2>
              <div className="space-y-3">
                {grupo.entradas.map((registro) => (
                  <EntradaAuditoria key={registro._id} registro={registro} />
                ))}
              </div>
            </section>
          ))}

          {ultimaPagina > 1 ? (
            <nav
              aria-label="Páginas del historial"
              className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
            >
              <button
                type="button"
                onClick={() => irAPagina(pagina - 1)}
                disabled={pagina <= 1}
                className="inline-flex h-14 w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 bg-brand-card px-6 text-base font-bold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:w-auto"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                MÁS RECIENTES
              </button>

              <p className="text-base font-semibold text-brand-taupe">
                Página {pagina} de {ultimaPagina}
              </p>

              <button
                type="button"
                onClick={() => irAPagina(pagina + 1)}
                disabled={pagina >= ultimaPagina}
                className="inline-flex h-14 w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 bg-brand-card px-6 text-base font-bold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:w-auto"
              >
                MÁS ANTIGUOS
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      )}
    </div>
  );
}
