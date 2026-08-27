/**
 * Hoja imprimible de etiquetas — `/admin/fabricacion/etiquetas/COD-949473`.
 *
 * Dos formas de usarla:
 *  - Un solo mueble: `/admin/fabricacion/etiquetas/COD-949473`
 *  - Todo un pedido: `/admin/fabricacion/etiquetas/PED-100248`
 *    (o `/admin/fabricacion/etiquetas/COD-949473?pedido=PED-100248`)
 *
 * Y en los dos casos `?copias=3` para sacar varias de cada una, que es lo
 * normal cuando una etiqueta se despega o se moja en el taller.
 *
 * Se puede reimprimir siempre y sin ceremonia porque el QR no lleva token
 * (§1 del contrato): la etiqueta de un mueble es siempre la misma.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPedido, getUnidad } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { esCodigoPedido, normalizarCodigo } from "@/lib/fabricacion/codigos";
import {
  ETIQUETAS_PRIORIDAD,
  seguimientoPublicoActivo,
} from "@/lib/fabricacion/constantes";
import { tiene } from "@/lib/fabricacion/permisos";
import type { UnidadDTO } from "@/lib/types/fabricacion";

import type { DatosEtiqueta } from "@/components/fabricacion/etiqueta/etiqueta-mueble";
import { HojaEtiquetas } from "@/components/fabricacion/etiqueta/hoja-etiquetas";

export const metadata: Metadata = {
  title: "Etiquetas para imprimir",
};

export const dynamic = "force-dynamic";

/** Copias por etiqueta: de 1 a 20. Más de 20 es casi siempre un dedazo. */
const COPIAS_POR_DEFECTO = 1;
const COPIAS_MAXIMAS = 20;
const OPCIONES_COPIAS = [1, 2, 3, 4, 6] as const;

interface PaginaProps {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ copias?: string; pedido?: string }>;
}

/** "12 de marzo de 2026"; cadena vacía si no hay fecha. */
function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function copiasPedidas(crudo: string | undefined): number {
  if (!crudo) return COPIAS_POR_DEFECTO;
  const numero = Number.parseInt(crudo, 10);
  if (!Number.isFinite(numero)) return COPIAS_POR_DEFECTO;
  return Math.min(COPIAS_MAXIMAS, Math.max(1, numero));
}

function datosDeUnidad(unidad: UnidadDTO): DatosEtiqueta {
  const prioridad =
    unidad.prioridad === "NORMAL" ? "" : ETIQUETAS_PRIORIDAD[unidad.prioridad].label;

  return {
    codigo: unidad.codigo,
    mueble: unidad.producto.titulo,
    medidas: unidad.producto.medidas,
    cliente: unidad.clienteNombre,
    pedidoCodigo: unidad.pedidoCodigo,
    ruta: unidad.rutaNombre,
    fechaPrometida: fechaLarga(unidad.fechaPrometida),
    prioridad,
  };
}

export default async function EtiquetasPage({ params, searchParams }: PaginaProps) {
  const { codigo } = await params;
  const consulta = await searchParams;

  const sesion = await getSesionOperario();

  // Igual que en el resto del módulo: nunca un error seco. Se explica qué
  // pasa y se ofrece la salida.
  if (!sesion || !tiene(sesion, "imprimir_etiquetas")) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-600" aria-hidden="true" />
          <h1 className="mt-3 font-display text-2xl font-semibold text-brand-dark">
            No puedes imprimir etiquetas
          </h1>
          <p className="mt-3 text-base leading-relaxed text-brand-taupe">
            Tu perfil no tiene activado el permiso para imprimir las etiquetas
            con el código QR. Pídeselo a quien administra el sistema.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/admin/fabricacion">Volver a Fabricación</Link>
        </Button>
      </div>
    );
  }

  const copias = copiasPedidas(consulta.copias);

  // El pedido puede venir en el parámetro o directamente en la ruta
  // (`/etiquetas/PED-100248`), porque es lo que uno teclea sin pensarlo.
  const referenciaPedido =
    consulta.pedido && consulta.pedido.trim() !== ""
      ? consulta.pedido
      : esCodigoPedido(codigo)
        ? codigo
        : null;

  let unidades: UnidadDTO[] = [];
  let titulo = "Etiquetas para imprimir";
  let subtitulo = "";
  let volverHref = "/admin/fabricacion/unidades";

  if (referenciaPedido !== null) {
    const pedido = await getPedido(referenciaPedido, sesion);
    unidades = (pedido?.unidades ?? []).filter((unidad) => !unidad.eliminada);
    const codigoPedido = pedido?.codigo ?? normalizarCodigo(referenciaPedido) ?? referenciaPedido;
    titulo = `Etiquetas del pedido ${codigoPedido}`;
    subtitulo =
      unidades.length === 1
        ? `1 mueble · ${copias} ${copias === 1 ? "copia" : "copias"} de cada etiqueta`
        : `${unidades.length} muebles · ${copias} ${copias === 1 ? "copia" : "copias"} de cada etiqueta`;
    volverHref = pedido ? `/admin/fabricacion/pedidos/${pedido.codigo}` : volverHref;
  } else {
    const unidad = await getUnidad(codigo, sesion);
    unidades = unidad ? [unidad] : [];
    titulo = `Etiqueta de ${unidad?.codigo ?? normalizarCodigo(codigo) ?? codigo}`;
    subtitulo = unidad
      ? `${unidad.producto.titulo} · ${copias} ${copias === 1 ? "copia" : "copias"}`
      : "No encontramos ese mueble.";
    volverHref = unidad
      ? `/admin/fabricacion/unidades/${unidad.codigo}`
      : volverHref;
  }

  // Una entrada por copia: la hoja no sabe de copias, sólo imprime lo que le llega.
  const etiquetas: DatosEtiqueta[] = unidades.flatMap((unidad) => {
    const datos = datosDeUnidad(unidad);
    return Array.from({ length: copias }, () => datos);
  });

  const base = `/admin/fabricacion/etiquetas/${encodeURIComponent(codigo)}`;
  const sufijoPedido =
    consulta.pedido && consulta.pedido.trim() !== ""
      ? `&pedido=${encodeURIComponent(consulta.pedido)}`
      : "";

  const enlacesCopias = OPCIONES_COPIAS.map((numero) => ({
    copias: numero,
    href: `${base}?copias=${numero}${sufijoPedido}`,
  }));

  return (
    <HojaEtiquetas
      etiquetas={etiquetas}
      titulo={titulo}
      subtitulo={subtitulo}
      copias={copias}
      enlacesCopias={enlacesCopias}
      volverHref={volverHref}
      seguimientoActivo={seguimientoPublicoActivo()}
    />
  );
}
