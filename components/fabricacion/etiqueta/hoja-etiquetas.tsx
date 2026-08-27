"use client";

/**
 * La hoja imprimible: la barra de herramientas (que NO se imprime) y las
 * etiquetas una detrás de otra, cada una en su propia página de 10 × 15 cm.
 *
 * La impresión se controla con `@media print`:
 *  - `@page` fija el papel a 100 × 150 mm sin márgenes, que es lo que carga la
 *    impresora de etiquetas.
 *  - Se oculta TODO el panel de administración (menú lateral, cabecera,
 *    botones) con el truco de `visibility`, y se vuelve visible sólo la hoja,
 *    colocada en la esquina superior izquierda del papel.
 *  - Cada etiqueta fuerza un salto de página, menos la última.
 */

import Link from "next/link";
import { ArrowLeft, Info, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EtiquetaMueble,
  type DatosEtiqueta,
} from "@/components/fabricacion/etiqueta/etiqueta-mueble";

const CSS_IMPRESION = `
@page {
  size: 100mm 150mm;
  margin: 0;
}

@media print {
  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Se apaga toda la interfaz del panel y se enciende sólo la hoja. */
  body * {
    visibility: hidden !important;
    box-shadow: none !important;
  }

  #hoja-etiquetas,
  #hoja-etiquetas * {
    visibility: visible !important;
  }

  #hoja-etiquetas {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100mm !important;
    margin: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
  }

  .etiqueta-mueble {
    border: none !important;
    box-shadow: none !important;
    break-after: page;
    page-break-after: always;
  }

  .etiqueta-mueble:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .sin-impresion {
    display: none !important;
  }
}
`;

interface EnlaceCopias {
  copias: number;
  href: string;
}

interface HojaEtiquetasProps {
  etiquetas: DatosEtiqueta[];
  titulo: string;
  subtitulo: string;
  copias: number;
  enlacesCopias: EnlaceCopias[];
  volverHref: string;
  /** Con el seguimiento del cliente apagado se enseña una nota discreta. */
  seguimientoActivo: boolean;
}

export function HojaEtiquetas({
  etiquetas,
  titulo,
  subtitulo,
  copias,
  enlacesCopias,
  volverHref,
  seguimientoActivo,
}: HojaEtiquetasProps) {
  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: CSS_IMPRESION }} />

      <div className="sin-impresion space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tighter text-brand-dark sm:text-3xl">
              {titulo}
            </h1>
            <p className="mt-1 text-sm text-brand-taupe">{subtitulo}</p>
          </div>

          <Button
            type="button"
            variant="accent"
            onClick={() => window.print()}
            className="h-14 rounded-2xl px-8 text-lg font-bold"
          >
            <Printer className="!h-6 !w-6" aria-hidden="true" />
            IMPRIMIR
          </Button>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-brand-dark/10 bg-brand-card p-4">
          <span className="text-sm font-semibold text-brand-dark">
            Copias de cada etiqueta:
          </span>
          {enlacesCopias.map((enlace) => (
            <Link
              key={enlace.copias}
              href={enlace.href}
              aria-current={enlace.copias === copias ? "page" : undefined}
              className={
                enlace.copias === copias
                  ? "flex h-11 min-w-11 items-center justify-center rounded-2xl bg-brand-dark px-4 text-base font-bold text-brand-bg"
                  : "flex h-11 min-w-11 items-center justify-center rounded-2xl border border-brand-dark/15 px-4 text-base font-semibold text-brand-dark transition-colors hover:border-brand-accent/40 hover:text-brand-accent"
              }
            >
              {enlace.copias}
            </Link>
          ))}

          <Link
            href={volverHref}
            className="ml-auto flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-brand-taupe underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        </div>

        {!seguimientoActivo && (
          <p className="flex items-start gap-2 rounded-2xl bg-brand-sand px-4 py-3 text-sm leading-relaxed text-brand-taupe">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            El seguimiento para clientes está apagado, así que el QR de la
            etiqueta sólo funciona con la sesión del taller abierta. Es lo
            previsto: hoy el módulo es interno.
          </p>
        )}
      </div>

      {etiquetas.length === 0 ? (
        <div className="sin-impresion rounded-3xl border border-dashed border-brand-dark/20 bg-brand-card p-10 text-center">
          <p className="text-lg font-semibold text-brand-dark">
            No hay nada que imprimir
          </p>
          <p className="mt-2 text-sm text-brand-taupe">
            Revisa el código: puede que ese mueble ya no exista o que el pedido
            todavía no tenga muebles.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href={volverHref}>
              <ArrowLeft aria-hidden="true" />
              Volver
            </Link>
          </Button>
        </div>
      ) : (
        <div
          id="hoja-etiquetas"
          className="flex flex-col items-center gap-6"
        >
          {etiquetas.map((datos, indice) => (
            <EtiquetaMueble key={`${datos.codigo}-${indice}`} datos={datos} />
          ))}
        </div>
      )}
    </div>
  );
}
