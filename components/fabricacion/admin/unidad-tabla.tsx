"use client";

/**
 * El listado de muebles del panel, con sus acciones rápidas.
 *
 * Una fila por mueble, siempre con icono + texto en los botones (§9) y con el
 * área táctil de 44 px. Las acciones que quien mira no puede hacer sencillamente
 * no se pintan: nada de botones apagados que confunden.
 *
 * En la fila SÓLO van las acciones que no rompen nada (ver, etiqueta, editar y
 * restaurar). Pausar, cancelar y eliminar están en la ficha del mueble, con su
 * diálogo: en una tabla se tocan por error demasiado fácil.
 */

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Eye,
  Pencil,
  Printer,
  RotateCcw,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccion } from "@/components/fabricacion/admin/tablero-avisos";
import {
  BotonFila,
  EnlaceFila,
} from "@/components/fabricacion/admin/config-compartido";
import {
  BarraProgreso,
  ChipEstadoUnidad,
  ChipPrioridad,
  Codigo,
  estaRetrasada,
  fechaCorta,
  type PermisosPanel,
} from "@/components/fabricacion/admin/tablero-piezas";
import { restaurarUnidad } from "@/lib/actions/fabricacion";
import { indicePasoActual } from "@/lib/fabricacion/reglas";
import type { UnidadDTO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

function nombrePasoActual(unidad: UnidadDTO): string {
  const paso = unidad.pasos[indicePasoActual(unidad.pasos)];
  return paso?.nombre ?? "Sin pasos";
}

export function TablaUnidades({
  unidades,
  permisos,
  hoyIso,
}: {
  unidades: UnidadDTO[];
  permisos: PermisosPanel;
  /** Fecha de hoy en ISO, calculada en el servidor para no descuadrar el HTML. */
  hoyIso: string;
}) {
  const { ejecutando, ejecutar } = useAccion();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm">Código</TableHead>
            <TableHead className="text-sm">Mueble y cliente</TableHead>
            <TableHead className="text-sm">Estado</TableHead>
            <TableHead className="text-sm">Paso actual</TableHead>
            <TableHead className="min-w-[10rem] text-sm">Avance</TableHead>
            <TableHead className="text-sm">Responsable</TableHead>
            <TableHead className="text-sm">Entrega</TableHead>
            <TableHead className="text-sm">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {unidades.map((unidad) => {
            const retrasada = estaRetrasada(unidad.fechaPrometida, hoyIso);
            const conProblema = (unidad.incidenciasAbiertas ?? 0) > 0;

            return (
              <TableRow
                key={unidad._id}
                className={cn(
                  unidad.eliminada && "opacity-60",
                  conProblema && "bg-red-50/60"
                )}
              >
                <TableCell>
                  <Link
                    href={`/admin/fabricacion/unidades/${unidad.codigo}`}
                    className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  >
                    <Codigo valor={unidad.codigo} className="text-base underline-offset-4 hover:underline" />
                  </Link>
                  <div className="mt-1">
                    <ChipPrioridad prioridad={unidad.prioridad} className="px-2 py-0.5 text-xs" />
                  </div>
                  {unidad.eliminada && (
                    <p className="mt-1 text-xs font-semibold uppercase text-brand-taupe">
                      Eliminado
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <p className="max-w-[16rem] truncate text-base font-semibold text-brand-dark">
                    {unidad.producto.titulo}
                  </p>
                  <p className="max-w-[16rem] truncate text-sm text-brand-taupe">
                    {unidad.clienteNombre} · {unidad.pedidoCodigo}
                  </p>
                  {conProblema && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-red-700">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      {unidad.incidenciasAbiertas === 1
                        ? "1 problema"
                        : `${unidad.incidenciasAbiertas} problemas`}
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <ChipEstadoUnidad estado={unidad.estado} />
                </TableCell>

                <TableCell className="max-w-[11rem] truncate text-base text-brand-dark">
                  {nombrePasoActual(unidad)}
                </TableCell>

                <TableCell>
                  <BarraProgreso
                    valor={unidad.progreso}
                    etiqueta={`Avance de ${unidad.codigo}`}
                  />
                </TableCell>

                <TableCell className="text-base text-brand-dark">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0 text-brand-taupe" aria-hidden="true" />
                    {unidad.asignadoANombre !== "" ? unidad.asignadoANombre : "Sin asignar"}
                  </span>
                </TableCell>

                <TableCell>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-base",
                      retrasada ? "font-bold text-red-700" : "text-brand-dark"
                    )}
                  >
                    <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {fechaCorta(unidad.fechaPrometida)}
                  </span>
                  {retrasada && (
                    <span className="text-sm font-semibold text-red-700">Se pasó la fecha</span>
                  )}
                </TableCell>

                <TableCell>
                  {/*
                    Sólo las acciones SEGURAS en la fila (§9): a la distancia de
                    6 px a la que se pintan los botones de una tabla, tener
                    «Eliminar» al lado de «Editar» acaba en un mueble cancelado
                    por error. Pausar, cancelar y eliminar viven en la ficha del
                    mueble, cada una con su diálogo y su explicación.
                  */}
                  <div className="flex flex-wrap justify-end gap-2">
                    <EnlaceFila
                      href={`/admin/fabricacion/unidades/${unidad.codigo}`}
                      icono={Eye}
                    >
                      Ver
                    </EnlaceFila>

                    {permisos.imprimirEtiquetas && !unidad.eliminada && (
                      <EnlaceFila
                        href={`/admin/fabricacion/etiquetas/${unidad.codigo}`}
                        icono={Printer}
                      >
                        Etiqueta
                      </EnlaceFila>
                    )}

                    {permisos.gestionarUnidades && !unidad.eliminada && (
                      <EnlaceFila
                        href={`/admin/fabricacion/unidades/${unidad.codigo}/editar`}
                        icono={Pencil}
                      >
                        Editar
                      </EnlaceFila>
                    )}

                    {permisos.eliminarPedidos && unidad.eliminada && (
                      <BotonFila
                        icono={RotateCcw}
                        disabled={ejecutando}
                        onClick={() =>
                          ejecutar(() => restaurarUnidad(unidad.codigo), {
                            exito: `${unidad.codigo} vuelve a estar en los listados.`,
                          })
                        }
                      >
                        Restaurar
                      </BotonFila>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

    </>
  );
}
