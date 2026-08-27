/**
 * Seguimiento público del mueble — `/seguimiento/COD-949473`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ESTA PÁGINA ESTÁ APAGADA A PROPÓSITO.
 *
 *  Decisión del dueño (§1.4 del contrato): *"solo interno por ahora, pero que
 *  la posibilidad de programarlo luego esté"*. Está construida entera y lista
 *  para funcionar; **para encenderla basta con poner en el entorno**:
 *
 *      NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO="true"
 *
 *  Mientras valga cualquier otra cosa (o falte), esta página responde
 *  "no existe" y `getSeguimientoPublico()` devuelve `null` ANTES de leer un
 *  solo dato de la base. La variable se consulta siempre a través de
 *  `seguimientoPublicoActivo()`; nadie más la lee.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * REGLA DE PRIVACIDAD (se audita): esta página usa EXCLUSIVAMENTE
 * `getSeguimientoPublico`, cuyo DTO no trae teléfono, cédula, dirección,
 * correo, precio, notas internas ni nombres de operarios. No se importa aquí
 * ninguna otra lectura del módulo, y no debe importarse nunca: si un dato no
 * está en `SeguimientoPublicoDTO`, es porque el cliente no debe verlo.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSeguimientoPublico } from "@/lib/data/fabricacion";
import { normalizarCodigo } from "@/lib/fabricacion/codigos";
import { seguimientoPublicoActivo } from "@/lib/fabricacion/constantes";
import { BRAND } from "@/lib/constants";

import { SeguimientoNoEncontrado } from "@/components/fabricacion/seguimiento/seguimiento-no-encontrado";
import { TarjetaSeguimiento } from "@/components/fabricacion/seguimiento/tarjeta-seguimiento";

export const dynamic = "force-dynamic";

interface PaginaProps {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: PaginaProps): Promise<Metadata> {
  // Apagado: ni siquiera se generan metadatos que delaten que la ruta existe.
  if (!seguimientoPublicoActivo()) return {};

  const { codigo } = await params;
  const canonico = normalizarCodigo(codigo) ?? codigo;

  return {
    title: `Seguimiento de tu mueble ${canonico}`,
    description: `Mira cómo avanza la fabricación de tu mueble en ${BRAND.name}.`,
    // Un enlace personal no se indexa: es para el cliente, no para Google.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Seguimiento de tu mueble — ${BRAND.name}`,
      description: `Mira cómo avanza la fabricación de tu mueble en ${BRAND.name}.`,
      type: "website",
      locale: "es_VE",
      siteName: BRAND.name,
    },
    twitter: {
      card: "summary",
      title: `Seguimiento de tu mueble — ${BRAND.name}`,
      description: `Mira cómo avanza la fabricación de tu mueble en ${BRAND.name}.`,
    },
  };
}

export default async function SeguimientoPage({ params }: PaginaProps) {
  // Lo PRIMERO que hace la página. Apagado, la ruta no existe.
  if (!seguimientoPublicoActivo()) notFound();

  const { codigo } = await params;
  const canonico = normalizarCodigo(codigo) ?? codigo.trim().toUpperCase();

  const datos = await getSeguimientoPublico(canonico);

  // Código desconocido: página amable con salida, nunca un error del servidor.
  if (!datos) return <SeguimientoNoEncontrado codigo={canonico} />;

  return <TarjetaSeguimiento datos={datos} />;
}
