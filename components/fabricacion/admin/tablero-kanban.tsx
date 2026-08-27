/**
 * El tablero de fabricación: una columna por paso y una tarjeta por mueble.
 *
 * Se renderiza en el servidor (no lleva `"use client"`): sólo pinta y enlaza,
 * así que no hace falta mandar nada de esto al navegador. El desplazamiento
 * horizontal se hace con CSS puro y `snap`, para que en la tableta del taller
 * cada columna quede encajada al arrastrar.
 */

import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, User } from "lucide-react";
import { iconoDePaso } from "@/lib/fabricacion/constantes";
import { indicePasoActual } from "@/lib/fabricacion/reglas";
import type { ColumnaKanban, UnidadDTO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import {
  ChipPrioridad,
  Codigo,
  EstadoVacio,
  desdeHace,
  estaRetrasada,
  fechaCorta,
} from "@/components/fabricacion/admin/tablero-piezas";

/** Desde cuándo lleva el mueble parado en el paso en el que está ahora. */
function inicioDelPasoActual(unidad: UnidadDTO): string | null {
  const paso = unidad.pasos[indicePasoActual(unidad.pasos)];
  return paso?.iniciadoAt ?? unidad.updatedAt ?? null;
}

function TarjetaMueble({
  unidad,
  ahoraIso,
  hoyIso,
}: {
  unidad: UnidadDTO;
  ahoraIso: string;
  hoyIso: string;
}) {
  const retrasada = estaRetrasada(unidad.fechaPrometida, hoyIso);
  const conProblema = (unidad.incidenciasAbiertas ?? 0) > 0;

  return (
    <Link
      href={`/admin/fabricacion/unidades/${unidad.codigo}`}
      className={cn(
        "block rounded-2xl border bg-brand-card p-4 shadow-warm-sm transition-all hover:-translate-y-0.5 hover:shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
        conProblema ? "border-red-300 bg-red-50/60" : "border-brand-dark/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Codigo valor={unidad.codigo} className="text-lg" />
        <ChipPrioridad prioridad={unidad.prioridad} className="px-2 py-0.5 text-xs" />
      </div>

      <p className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-brand-dark">
        {unidad.producto.titulo}
      </p>
      <p className="mt-0.5 truncate text-sm text-brand-taupe">{unidad.clienteNombre}</p>

      <dl className="mt-3 space-y-1.5 text-sm text-brand-taupe">
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">Responsable</dt>
          <dd className="truncate">
            {unidad.asignadoANombre !== "" ? unidad.asignadoANombre : "Sin responsable"}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">En este paso desde</dt>
          <dd>En este paso {desdeHace(inicioDelPasoActual(unidad), ahoraIso)}</dd>
        </div>
        {unidad.fechaPrometida && (
          <div
            className={cn(
              "flex items-center gap-1.5",
              retrasada && "font-semibold text-red-700"
            )}
          >
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Fecha prometida</dt>
            <dd>
              {retrasada ? "Se pasó de " : "Entrega "}
              {fechaCorta(unidad.fechaPrometida)}
            </dd>
          </div>
        )}
      </dl>

      {conProblema && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-100 px-2.5 py-1.5 text-sm font-semibold text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {unidad.incidenciasAbiertas === 1
            ? "1 problema sin resolver"
            : `${unidad.incidenciasAbiertas} problemas sin resolver`}
        </p>
      )}
    </Link>
  );
}

export function TableroKanban({
  columnas,
  ahoraIso,
  hoyIso,
}: {
  columnas: ColumnaKanban[];
  ahoraIso: string;
  hoyIso: string;
}) {
  if (columnas.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay muebles en fabricación"
        mensaje="Cuando registres un pedido, cada mueble aparecerá aquí en la columna del paso en el que va."
        accion={
          <Link
            href="/admin/fabricacion/pedidos/nuevo"
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-ember-gradient px-8 text-lg font-bold text-white shadow-ember"
          >
            REGISTRAR EL PRIMER PEDIDO
          </Link>
        }
      />
    );
  }

  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0"
      role="list"
      aria-label="Tablero de fabricación por pasos"
    >
      {columnas.map((columna) => {
        const Icono = iconoDePaso(columna.icono || columna.clave);
        return (
          <section
            key={columna.clave}
            role="listitem"
            aria-label={`${columna.nombre}: ${columna.cantidad} muebles`}
            className="w-[19rem] shrink-0 snap-start rounded-3xl bg-brand-sand/50 p-3"
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: columna.color || "#6E5748" }}
              >
                <Icono className="h-5 w-5" />
              </span>
              <h3 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-brand-dark">
                {columna.nombre}
              </h3>
              <span className="shrink-0 rounded-full bg-brand-dark px-2.5 py-0.5 text-sm font-bold tabular-nums text-brand-bg">
                {columna.cantidad}
              </span>
            </header>

            <div className="space-y-3">
              {columna.unidades.map((unidad) => (
                <TarjetaMueble
                  key={unidad._id}
                  unidad={unidad}
                  ahoraIso={ahoraIso}
                  hoyIso={hoyIso}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
