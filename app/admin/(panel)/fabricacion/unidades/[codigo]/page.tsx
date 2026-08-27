/**
 * La ficha de un mueble: la pantalla del supervisor.
 *
 * Arriba, quién es y cómo va. Debajo, todo lo que se puede hacer con él. Y en
 * tres pestañas: la línea de tiempo paso a paso, la bitácora del taller y el
 * historial de cambios (quién editó qué, con el antes y el ahora).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { AccionesUnidad } from "@/components/fabricacion/admin/unidad-acciones";
import type { OpcionResponsable } from "@/components/fabricacion/admin/unidad-acciones";
import { BitacoraUnidad } from "@/components/fabricacion/admin/unidad-bitacora";
import { HistorialCambios } from "@/components/fabricacion/admin/unidad-auditoria";
import { PestanasUnidad } from "@/components/fabricacion/admin/unidad-ficha-pestanas";
import { LineaTiempoUnidad } from "@/components/fabricacion/admin/unidad-linea-tiempo";
import {
  BarraProgreso,
  ChipEstadoUnidad,
  ChipPrioridad,
  Codigo,
  Dato,
  SinPermiso,
  fechaCorta,
  fechaLarga,
  permisosDe,
} from "@/components/fabricacion/admin/tablero-piezas";
import {
  getAuditoriaDeEntidad,
  getEventosUnidad,
  getIncidenciasAbiertas,
  getUnidad,
  listarOperarios,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { seguimientoPublicoActivo } from "@/lib/fabricacion/constantes";
import { indicePasoActual } from "@/lib/fabricacion/reglas";
import { formatPrice, getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FichaUnidadPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero) {
    return <SinPermiso que="la ficha de los muebles" />;
  }

  const unidad = await getUnidad(decodeURIComponent(codigo), sesion);
  if (!unidad) notFound();

  const [eventos, auditoria, problemas, personas] = await Promise.all([
    getEventosUnidad(unidad._id, 200),
    permisos.verAuditoria
      ? getAuditoriaDeEntidad("UNIDAD", unidad._id, 50)
      : Promise.resolve([]),
    getIncidenciasAbiertas(unidad._id),
    permisos.gestionarUnidades ? listarOperarios() : Promise.resolve([]),
  ]);

  const responsables: OpcionResponsable[] = personas.map((persona) => ({
    _id: persona._id,
    nombre: persona.nombre,
    rolNombre: persona.rolNombre,
  }));

  const pasoActual = unidad.pasos[indicePasoActual(unidad.pasos)];
  const seguimiento = seguimientoPublicoActivo();
  const urlSeguimiento = seguimiento
    ? `${getSiteUrl()}/seguimiento/${unidad.codigo}`
    : "";

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <div>
        <Button asChild variant="ghost" className="-ml-3 h-12 text-base font-semibold">
          <Link href="/admin/fabricacion/unidades">
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Volver a los muebles
          </Link>
        </Button>
      </div>

      {/* Cabecera */}
      <header className="rounded-3xl border border-brand-dark/5 bg-brand-card p-6 shadow-warm-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Codigo valor={unidad.codigo} className="text-4xl sm:text-5xl" />
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-brand-dark">
              {unidad.producto.titulo}
            </h1>
            <p className="mt-1 text-base text-brand-taupe">
              Para {unidad.clienteNombre} ·{" "}
              <Link
                href={`/admin/fabricacion/pedidos/${unidad.pedidoCodigo}`}
                className="font-semibold text-brand-accent underline-offset-4 hover:underline"
              >
                pedido {unidad.pedidoCodigo}
              </Link>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ChipEstadoUnidad estado={unidad.estado} />
              <ChipPrioridad prioridad={unidad.prioridad} />
            </div>
          </div>

          {/* El QR lleva sólo la dirección del mueble: no hay token (§1). */}
          <figure className="shrink-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/fabrica/qr/${unidad.codigo}`}
              alt={`Código QR del mueble ${unidad.codigo}`}
              width={128}
              height={128}
              className="h-32 w-32 rounded-2xl border border-brand-dark/10 bg-white p-2"
            />
            <figcaption className="mt-1 flex items-center justify-center gap-1 text-sm text-brand-taupe">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              El QR de la etiqueta
            </figcaption>
          </figure>
        </div>

        {unidad.eliminada && (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-brand-dark/10 bg-brand-sand/60 p-4 text-base font-semibold text-brand-dark"
          >
            Este mueble está eliminado. Se conserva su historial y se puede restaurar.
          </p>
        )}

        {problemas.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4"
          >
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="text-lg font-bold text-red-900">
                {problemas.length === 1
                  ? "Este mueble tiene un problema sin resolver"
                  : `Este mueble tiene ${problemas.length} problemas sin resolver`}
              </p>
              <ul className="mt-1 space-y-0.5 text-base text-red-800">
                {problemas.map((problema) => (
                  <li key={problema._id}>
                    {problema.motivo}
                    {problema.reportadaPorNombre !== "" &&
                      ` — lo avisó ${problema.reportadaPorNombre}`}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-base text-red-800">
                Hasta que se resuelva, el taller no puede seguir con este mueble.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-base font-semibold text-brand-dark">
            {pasoActual
              ? `Ahora va por «${pasoActual.nombre}» (paso ${indicePasoActual(unidad.pasos) + 1} de ${unidad.pasos.length})`
              : "Todavía no tiene pasos asignados"}
          </p>
          <BarraProgreso
            valor={unidad.progreso}
            etiqueta={`Avance de ${unidad.codigo}`}
            className="mt-2"
          />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="Ruta de fabricación">{unidad.rutaNombre}</Dato>
          <Dato etiqueta="Responsable">
            {unidad.asignadoANombre !== "" ? unidad.asignadoANombre : "Sin asignar"}
          </Dato>
          <Dato etiqueta="Dónde está">
            {unidad.ubicacionActualNombre !== "" ? unidad.ubicacionActualNombre : "Sin registrar"}
          </Dato>
          <Dato etiqueta="Fecha prometida">{fechaCorta(unidad.fechaPrometida)}</Dato>
          <Dato etiqueta="Empezó">{fechaLarga(unidad.iniciadoAt, "Todavía no")}</Dato>
          <Dato etiqueta="Terminó">{fechaLarga(unidad.terminadoAt, "Todavía no")}</Dato>
          <Dato etiqueta="Tela">{unidad.producto.tela}</Dato>
          <Dato etiqueta="Acabado">{unidad.producto.acabado}</Dato>
          <Dato etiqueta="Configuración">{unidad.producto.configuracion}</Dato>
          <Dato etiqueta="Medidas">{unidad.producto.medidas}</Dato>
          {permisos.verPrecios && (
            <Dato etiqueta="Precio">
              {unidad.producto.precio === null ? "Sin precio" : formatPrice(unidad.producto.precio)}
            </Dato>
          )}
          {unidad.notas !== "" && (
            <Dato etiqueta="Notas internas" className="sm:col-span-2 lg:col-span-3">
              {unidad.notas}
            </Dato>
          )}
        </dl>
      </header>

      {/* Acciones */}
      <section className="rounded-3xl border border-brand-dark/5 bg-brand-card p-6 shadow-warm-sm">
        <h2 className="mb-4 font-display text-xl font-semibold text-brand-dark">
          ¿Qué quieres hacer con este mueble?
        </h2>
        <AccionesUnidad
          unidad={unidad}
          permisos={permisos}
          responsables={responsables}
          incidenciasAbiertas={problemas}
          seguimientoActivo={seguimiento}
          urlSeguimiento={urlSeguimiento}
        />
      </section>

      {/* Historia completa */}
      <PestanasUnidad
        mostrarHistorial={permisos.verAuditoria}
        lineaTiempo={<LineaTiempoUnidad unidad={unidad} permisos={permisos} />}
        bitacora={<BitacoraUnidad eventos={eventos} />}
        historial={
          <HistorialCambios
            registros={auditoria}
            vacio="Nadie ha cambiado los datos de este mueble desde que se creó. Aquí aparecerían el nombre de quien lo hizo, la fecha y qué cambió exactamente."
          />
        }
      />
    </div>
  );
}
