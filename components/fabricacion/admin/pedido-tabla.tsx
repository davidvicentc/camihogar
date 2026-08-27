"use client";

/**
 * El listado de pedidos con sus acciones por fila (§7).
 *
 * Cada fila: código, cliente con su WhatsApp a un toque, cuántos muebles van
 * listos, prioridad, fecha prometida y estado. Las acciones que quien mira no
 * puede hacer no se pintan.
 */

import Link from "next/link";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { CalendarClock, Eye, Pencil, RotateCcw } from "lucide-react";
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
  ChipCanal,
  ChipEstadoPedido,
  ChipPrioridad,
  Codigo,
  ProgresoPedido,
  estaRetrasada,
  fechaCorta,
  whatsappDelCliente,
  type PermisosPanel,
} from "@/components/fabricacion/admin/tablero-piezas";
import { restaurarPedido } from "@/lib/actions/fabricacion";
import type { PedidoDTO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

export function TablaPedidos({
  pedidos,
  permisos,
  hoyIso,
}: {
  pedidos: PedidoDTO[];
  permisos: PermisosPanel;
  hoyIso: string;
}) {
  const { ejecutando, ejecutar } = useAccion();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm">Pedido</TableHead>
            <TableHead className="text-sm">Cliente</TableHead>
            <TableHead className="text-sm">Teléfono</TableHead>
            <TableHead className="text-sm">Muebles listos</TableHead>
            <TableHead className="text-sm">Prioridad</TableHead>
            <TableHead className="text-sm">Entrega</TableHead>
            <TableHead className="text-sm">Estado</TableHead>
            <TableHead className="text-sm">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pedidos.map((pedido) => {
            const retrasado = estaRetrasada(pedido.fechaPrometida, hoyIso);
            const whatsapp = whatsappDelCliente(
              pedido.cliente.telefono,
              `Hola ${pedido.cliente.nombre}, le escribimos de CamiHogar por su pedido ${pedido.codigo}.`
            );
            const yaEmpezo = pedido.estado !== "ABIERTO" && pedido.estado !== "CANCELADO";

            return (
              <TableRow key={pedido._id} className={cn(pedido.eliminado && "opacity-60")}>
                <TableCell>
                  <Link
                    href={`/admin/fabricacion/pedidos/${pedido.codigo}`}
                    className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  >
                    <Codigo
                      valor={pedido.codigo}
                      className="text-base underline-offset-4 hover:underline"
                    />
                  </Link>
                  <div className="mt-1">
                    <ChipCanal canal={pedido.canal} className="px-2 py-0.5 text-xs" />
                  </div>
                  {pedido.eliminado && (
                    <p className="mt-1 text-xs font-semibold uppercase text-brand-taupe">
                      Eliminado
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <p className="max-w-[14rem] truncate text-base font-semibold text-brand-dark">
                    {pedido.cliente.nombre}
                  </p>
                  {pedido.cliente.ciudad !== "" && (
                    <p className="text-sm text-brand-taupe">{pedido.cliente.ciudad}</p>
                  )}
                </TableCell>

                <TableCell>
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Escribir por WhatsApp a ${pedido.cliente.nombre}`}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-base font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/10"
                    >
                      <SiWhatsapp className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {pedido.cliente.telefono}
                    </a>
                  ) : (
                    <span className="text-base text-brand-taupe">
                      {pedido.cliente.telefono || "Sin teléfono"}
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  <ProgresoPedido
                    completadas={pedido.unidadesCompletadas}
                    total={pedido.totalUnidades}
                  />
                </TableCell>

                <TableCell>
                  <ChipPrioridad prioridad={pedido.prioridad} />
                </TableCell>

                <TableCell>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-base",
                      retrasado ? "font-bold text-red-700" : "text-brand-dark"
                    )}
                  >
                    <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {fechaCorta(pedido.fechaPrometida)}
                  </span>
                  {retrasado && (
                    <span className="text-sm font-semibold text-red-700">Se pasó la fecha</span>
                  )}
                </TableCell>

                <TableCell>
                  <ChipEstadoPedido estado={pedido.estado} />
                </TableCell>

                <TableCell>
                  {/*
                    En la fila sólo lo que no rompe nada. Cancelar y eliminar
                    están en la ficha del pedido, con su diálogo: aquí, pegados a
                    «Editar», se tocan por error (§9).
                  */}
                  <div className="flex flex-wrap justify-end gap-2">
                    <EnlaceFila
                      href={`/admin/fabricacion/pedidos/${pedido.codigo}`}
                      icono={Eye}
                    >
                      Ver
                    </EnlaceFila>

                    {permisos.gestionarPedidos && !pedido.eliminado && (
                      <EnlaceFila
                        href={`/admin/fabricacion/pedidos/${pedido.codigo}/editar`}
                        icono={Pencil}
                      >
                        Editar
                      </EnlaceFila>
                    )}

                    {permisos.eliminarPedidos && pedido.eliminado && (
                      <BotonFila
                        icono={RotateCcw}
                        disabled={ejecutando}
                        onClick={() =>
                          ejecutar(() => restaurarPedido(pedido.codigo), {
                            exito: `${pedido.codigo} vuelve a estar en los listados.`,
                          })
                        }
                      >
                        Restaurar
                      </BotonFila>
                    )}
                  </div>
                  {yaEmpezo && permisos.eliminarPedidos && !pedido.eliminado && (
                    <p className="mt-1 text-right text-xs text-brand-taupe">
                      Ya empezó a fabricarse
                    </p>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

    </>
  );
}
