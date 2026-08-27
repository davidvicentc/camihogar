"use client";

/**
 * "¿Es este el mueble?" — el paso que evita trabajar sobre el mueble
 * equivocado.
 *
 * Después de leer un código NUNCA se salta directamente a la ficha: primero se
 * enseña grande qué se encontró (código, mueble y cliente) y la persona
 * confirma. Un botón enorme para seguir y otro para volver a escanear.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, User } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Lo poco que hace falta para reconocer el mueble de un vistazo. */
export interface MuebleEncontrado {
  codigo: string;
  mueble: string;
  cliente: string;
  pedidoCodigo: string;
  estadoLabel: string;
  estadoDescripcion: string;
  /** Clases del chip del semáforo (ya traen la palabra `border`). */
  estadoClases: string;
  /** 0..100 */
  progreso: number;
  /** Nombre del paso en el que está ahora; vacío si aún no tiene pasos. */
  pasoActual: string;
  imagen: string;
}

interface ConfirmacionMuebleProps {
  mueble: MuebleEncontrado;
  /** Vuelve al escáner para leer otro código. */
  onVolver: () => void;
}

export function ConfirmacionMueble({ mueble, onVolver }: ConfirmacionMuebleProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-4 border-green-500 bg-green-50 p-5 text-center">
        <CheckCircle2
          className="mx-auto h-14 w-14 text-green-600"
          aria-hidden="true"
        />
        <p className="mt-2 text-2xl font-bold text-green-900">
          Encontramos este mueble
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-warm-sm">
        {mueble.imagen !== "" && (
          <div className="relative h-48 w-full bg-brand-sand">
            <Image
              src={mueble.imagen}
              alt={mueble.mueble}
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}

        <div className="space-y-3 p-5">
          <p className="font-mono text-3xl font-bold tabular tracking-tight text-brand-dark">
            {mueble.codigo}
          </p>

          <p className="text-2xl font-semibold leading-tight text-brand-dark">
            {mueble.mueble}
          </p>

          {mueble.cliente !== "" && (
            <p className="flex items-center gap-2 text-lg text-brand-taupe">
              <User className="h-5 w-5 shrink-0" aria-hidden="true" />
              De {mueble.cliente}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-4 py-1.5 text-lg font-semibold ${mueble.estadoClases}`}
            >
              {mueble.estadoLabel}
            </span>
            {mueble.pedidoCodigo !== "" && (
              <span className="rounded-full border border-brand-dark/15 px-4 py-1.5 text-lg font-semibold text-brand-taupe">
                Pedido {mueble.pedidoCodigo}
              </span>
            )}
          </div>

          <p className="text-lg leading-relaxed text-brand-taupe">
            {mueble.estadoDescripcion}
          </p>

          {mueble.pasoActual !== "" && (
            <p className="text-lg text-brand-dark">
              Va por: <strong>{mueble.pasoActual}</strong>
            </p>
          )}

          <div>
            <div
              className="h-4 w-full overflow-hidden rounded-full bg-brand-sand"
              role="progressbar"
              aria-valuenow={mueble.progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Avance del mueble: ${mueble.progreso} por ciento`}
            >
              <div
                className="h-full rounded-full bg-ember-gradient"
                style={{ width: `${mueble.progreso}%` }}
              />
            </div>
            <p className="mt-1 text-lg font-semibold text-brand-taupe">
              {mueble.progreso}% terminado
            </p>
          </div>
        </div>
      </div>

      {/* La única acción principal de esta pantalla. */}
      <Button
        asChild
        variant="accent"
        className="h-20 w-full rounded-3xl text-xl font-bold"
      >
        <Link href={`/fabrica/u/${mueble.codigo}`}>
          <CheckCircle2 className="!h-7 !w-7" aria-hidden="true" />
          SÍ, ES ESTE
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onVolver}
        className="h-16 w-full rounded-3xl text-lg font-bold"
      >
        <ArrowLeft className="!h-6 !w-6" aria-hidden="true" />
        NO, ESCANEAR OTRO
      </Button>
    </div>
  );
}
