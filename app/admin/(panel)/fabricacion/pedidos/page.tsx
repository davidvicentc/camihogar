/**
 * Listado de pedidos de clientes, con búsqueda, filtros y las cinco
 * operaciones del §7 al alcance: crear, ver, editar, cancelar y eliminar (con
 * su "Ver eliminados" para restaurar).
 */

import Link from "next/link";
import { Inbox, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import {
  BuscadorLista,
  ChipsFiltro,
  InterruptorFiltro,
  LimpiarFiltros,
  PanelFiltros,
} from "@/components/fabricacion/admin/tablero-filtros";
import { EstadoVacio, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import { TablaPedidos } from "@/components/fabricacion/admin/pedido-tabla";
import { contarPedidos, listarPedidos } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import {
  ESTADOS_PEDIDO,
  PRIORIDADES,
  type EstadoPedido,
  type FiltrosPedidos,
  type Prioridad,
} from "@/lib/types/fabricacion";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

type Parametros = Record<string, string | string[] | undefined>;

/** Lee un parámetro suelto de la dirección, ignorando los repetidos. */
function uno(parametros: Parametros, clave: string): string {
  const valor = parametros[clave];
  return typeof valor === "string" ? valor : "";
}

/** Sólo acepta el valor si está en la lista; si no, como si no viniera. */
function unaDe<T extends string>(valor: string, permitidos: readonly T[]): T | undefined {
  return (permitidos as readonly string[]).includes(valor) ? (valor as T) : undefined;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero && !permisos.gestionarPedidos) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark">
          Pedidos
        </h1>
        <SinPermiso que="los pedidos" />
      </div>
    );
  }

  const pagina = Math.max(1, Number(uno(parametros, "pagina")) || 1);
  const verEliminados = uno(parametros, "eliminados") === "1";

  const filtros: FiltrosPedidos = {
    busqueda: uno(parametros, "q") || undefined,
    estado: unaDe<EstadoPedido>(uno(parametros, "estado"), ESTADOS_PEDIDO),
    prioridad: unaDe<Prioridad>(uno(parametros, "prioridad"), PRIORIDADES),
    incluirEliminados: verEliminados,
    orden: "recientes",
    pagina,
    porPagina: POR_PAGINA,
  };

  const [pedidos, total] = await Promise.all([
    listarPedidos(filtros),
    contarPedidos(filtros),
  ]);

  const hoyIso = new Date().toISOString().slice(0, 10);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hayFiltro =
    filtros.busqueda !== undefined ||
    filtros.estado !== undefined ||
    filtros.prioridad !== undefined;

  /** Conserva los filtros al saltar de página. */
  function enlacePagina(destino: number): string {
    const siguientes = new URLSearchParams();
    if (filtros.busqueda) siguientes.set("q", filtros.busqueda);
    if (filtros.estado) siguientes.set("estado", filtros.estado);
    if (filtros.prioridad) siguientes.set("prioridad", filtros.prioridad);
    if (verEliminados) siguientes.set("eliminados", "1");
    if (destino > 1) siguientes.set("pagina", String(destino));
    const cadena = siguientes.toString();
    return cadena === "" ? "/admin/fabricacion/pedidos" : `/admin/fabricacion/pedidos?${cadena}`;
  }

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Pedidos
          </h1>
          <p className="mt-1 text-lg text-brand-taupe">
            {total === 1 ? "1 pedido" : `${total} pedidos`}
            {hayFiltro ? " con estos filtros" : ""}
          </p>
        </div>

        {permisos.gestionarPedidos && (
          <Button asChild variant="accent" className="h-16 px-8 text-lg font-bold">
            <Link href="/admin/fabricacion/pedidos/nuevo">
              <PackagePlus className="!size-6" aria-hidden="true" />
              NUEVO PEDIDO
            </Link>
          </Button>
        )}
      </header>

      <PanelFiltros>
        <BuscadorLista
          marcador="Busca por código, nombre del cliente o teléfono"
          etiqueta="Buscar pedidos"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ChipsFiltro
            etiqueta="Estado del pedido"
            parametro="estado"
            catalogo="estadoPedido"
          />

          <ChipsFiltro
            etiqueta="Urgencia"
            parametro="prioridad"
            catalogo="prioridad"
            textoTodos="Todas"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {permisos.eliminarPedidos && (
            <InterruptorFiltro
              etiqueta="Ver eliminados"
              ayuda="Muestra también los pedidos eliminados, para poder restaurarlos"
              parametro="eliminados"
              icono="papelera"
            />
          )}
          <LimpiarFiltros />
        </div>
      </PanelFiltros>

      {pedidos.length === 0 ? (
        <EstadoVacio
          icono={<Inbox className="h-7 w-7" />}
          titulo={hayFiltro ? "Ningún pedido con esos filtros" : "Todavía no hay pedidos"}
          mensaje={
            hayFiltro
              ? "Prueba a quitar algún filtro o a buscar sólo por el número del código."
              : "Registra el primer pedido y sus muebles entrarán al taller con su código y su etiqueta."
          }
          accion={
            permisos.gestionarPedidos && !hayFiltro ? (
              <Button asChild variant="accent" className="h-16 px-8 text-lg font-bold">
                <Link href="/admin/fabricacion/pedidos/nuevo">
                  <PackagePlus className="!size-6" aria-hidden="true" />
                  REGISTRAR EL PRIMER PEDIDO
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href="/admin/fabricacion/pedidos">Quitar los filtros</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <TablaPedidos pedidos={pedidos} permisos={permisos} hoyIso={hoyIso} />

          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de pedidos"
              className="flex items-center justify-between gap-3"
            >
              {pagina > 1 ? (
                <Button asChild variant="outline" className="h-14 text-base font-semibold">
                  <Link href={enlacePagina(pagina - 1)}>Página anterior</Link>
                </Button>
              ) : (
                <Button variant="outline" className="h-14 text-base font-semibold" disabled>
                  Página anterior
                </Button>
              )}

              <p className="text-base font-semibold text-brand-taupe">
                Página {pagina} de {totalPaginas}
              </p>

              {pagina < totalPaginas ? (
                <Button asChild variant="outline" className="h-14 text-base font-semibold">
                  <Link href={enlacePagina(pagina + 1)}>Página siguiente</Link>
                </Button>
              ) : (
                <Button variant="outline" className="h-14 text-base font-semibold" disabled>
                  Página siguiente
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
