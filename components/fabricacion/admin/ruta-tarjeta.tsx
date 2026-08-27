"use client";

/**
 * Una ruta en el listado: quién es, cuántos pasos tiene, la cadena de pasos de
 * un vistazo, cuántos muebles la usan y sus acciones. Todas las acciones
 * llevan texto, nunca sólo el dibujo.
 */

import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Copy,
  Layers,
  Pencil,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RutaDTO } from "@/lib/types/fabricacion";
import { SecuenciaPasos } from "./ruta-secuencia";

export interface RutaTarjetaProps {
  ruta: RutaDTO;
  ocupada: boolean;
  onDuplicar: (ruta: RutaDTO) => void;
  onPredeterminada: (ruta: RutaDTO) => void;
  onArchivar: (ruta: RutaDTO) => void;
  onRestaurar: (ruta: RutaDTO) => void;
  onEliminar: (ruta: RutaDTO) => void;
}

export function RutaTarjeta({
  ruta,
  ocupada,
  onDuplicar,
  onPredeterminada,
  onArchivar,
  onRestaurar,
  onEliminar,
}: RutaTarjetaProps) {
  const enUso = ruta.unidadesEnCurso ?? 0;
  const horas = ruta.horasEstimadasTotal ?? 0;

  return (
    <article className="rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-brand-dark">
            {ruta.nombre}
          </h2>
          {ruta.descripcion !== "" ? (
            <p className="mt-1 text-base text-brand-taupe">{ruta.descripcion}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {ruta.esPredeterminada ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
              <Star className="h-4 w-4" aria-hidden="true" />
              SE PROPONE SOLA
            </span>
          ) : null}
          {ruta.archivada ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
              <Archive className="h-4 w-4" aria-hidden="true" />
              ARCHIVADA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
              EN USO
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-brand-taupe">
        <div className="inline-flex items-center gap-1.5">
          <Layers className="h-5 w-5" aria-hidden="true" />
          <dt className="sr-only">Pasos</dt>
          <dd>
            {ruta.pasos.length} {ruta.pasos.length === 1 ? "paso" : "pasos"}
          </dd>
        </div>
        {horas > 0 ? (
          <div className="inline-flex items-center gap-1.5">
            <Clock className="h-5 w-5" aria-hidden="true" />
            <dt className="sr-only">Horas estimadas</dt>
            <dd>unas {horas} horas</dd>
          </div>
        ) : null}
        <div className="inline-flex items-center gap-1.5">
          <Wrench className="h-5 w-5" aria-hidden="true" />
          <dt className="sr-only">Muebles que la usan</dt>
          <dd>
            {enUso === 0
              ? "Ningún mueble la usa todavía"
              : `${enUso} ${enUso === 1 ? "mueble la usa" : "muebles la usan"}`}
          </dd>
        </div>
        {ruta.categoriaSugerida !== "" ? (
          <div className="inline-flex items-center gap-1.5">
            <dt className="sr-only">Categoría</dt>
            <dd>Para {ruta.categoriaSugerida}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <SecuenciaPasos pasos={ruta.pasos} maximo={6} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          className="h-14 px-5 text-base font-bold [&_svg]:size-5"
        >
          <Link
            href={`/admin/fabricacion/rutas/${ruta._id}`}
            aria-label={`Editar la ruta ${ruta.nombre}`}
          >
            <Pencil className="h-5 w-5" aria-hidden="true" />
            EDITAR
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={ocupada}
          onClick={() => onDuplicar(ruta)}
          aria-label={`Duplicar la ruta ${ruta.nombre}`}
          className="h-14 px-5 text-base font-bold [&_svg]:size-5"
        >
          <Copy className="h-5 w-5" aria-hidden="true" />
          DUPLICAR
        </Button>

        {!ruta.archivada && !ruta.esPredeterminada ? (
          <Button
            type="button"
            variant="outline"
            disabled={ocupada}
            onClick={() => onPredeterminada(ruta)}
            aria-label={`Hacer que ${ruta.nombre} sea la ruta que se propone sola`}
            className="h-14 px-5 text-base font-bold [&_svg]:size-5"
          >
            <Star className="h-5 w-5" aria-hidden="true" />
            QUE SE PROPONGA SOLA
          </Button>
        ) : null}

        {ruta.archivada ? (
          <Button
            type="button"
            variant="outline"
            disabled={ocupada}
            onClick={() => onRestaurar(ruta)}
            aria-label={`Devolver al uso la ruta ${ruta.nombre}`}
            className="h-14 px-5 text-base font-bold [&_svg]:size-5"
          >
            <ArchiveRestore className="h-5 w-5" aria-hidden="true" />
            DEVOLVER AL USO
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={ocupada}
            onClick={() => onArchivar(ruta)}
            aria-label={`Archivar la ruta ${ruta.nombre}`}
            className="h-14 px-5 text-base font-bold [&_svg]:size-5"
          >
            <Archive className="h-5 w-5" aria-hidden="true" />
            ARCHIVAR
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={ocupada}
          onClick={() => onEliminar(ruta)}
          aria-label={`Eliminar la ruta ${ruta.nombre}`}
          className="h-14 px-5 text-base font-bold text-red-700 [&_svg]:size-5 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          ELIMINAR
        </Button>
      </div>
    </article>
  );
}
