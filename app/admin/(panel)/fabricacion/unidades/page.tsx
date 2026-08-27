/**
 * Listado maestro de muebles: todo lo que hay en el taller, filtrable por
 * estado, paso, responsable, área, urgencia y retraso, con búsqueda por código
 * o cliente y la vista "Ver eliminados" del §7.
 */

import Link from "next/link";
import { PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import {
  BuscadorLista,
  ChipsFiltro,
  InterruptorFiltro,
  LimpiarFiltros,
  PanelFiltros,
  SelectFiltro,
} from "@/components/fabricacion/admin/tablero-filtros";
import { EstadoVacio, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import { TablaUnidades } from "@/components/fabricacion/admin/unidad-tabla";
import {
  contarUnidades,
  listarCatalogoPasos,
  listarEstaciones,
  listarOperarios,
  listarUnidades,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import {
  ESTADOS_UNIDAD,
  PRIORIDADES,
  type EstadoUnidad,
  type FiltrosUnidades,
  type Prioridad,
} from "@/lib/types/fabricacion";

export const dynamic = "force-dynamic";

const POR_PAGINA = 40;

type Parametros = Record<string, string | string[] | undefined>;

function uno(parametros: Parametros, clave: string): string {
  const valor = parametros[clave];
  return typeof valor === "string" ? valor : "";
}

function unaDe<T extends string>(valor: string, permitidos: readonly T[]): T | undefined {
  return (permitidos as readonly string[]).includes(valor) ? (valor as T) : undefined;
}

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark">
          Muebles
        </h1>
        <SinPermiso que="el listado de muebles" />
      </div>
    );
  }

  const pagina = Math.max(1, Number(uno(parametros, "pagina")) || 1);
  const verEliminadas = uno(parametros, "eliminados") === "1";

  const filtros: FiltrosUnidades = {
    busqueda: uno(parametros, "q") || undefined,
    estado: unaDe<EstadoUnidad>(uno(parametros, "estado"), ESTADOS_UNIDAD),
    prioridad: unaDe<Prioridad>(uno(parametros, "prioridad"), PRIORIDADES),
    pasoClave: uno(parametros, "paso") || undefined,
    asignadoAId: uno(parametros, "responsable") || undefined,
    estacionId: uno(parametros, "area") || undefined,
    retrasadas: uno(parametros, "retrasadas") === "1" || undefined,
    incluirEliminadas: verEliminadas,
    pagina,
    porPagina: POR_PAGINA,
  };

  const [unidades, total, pasos, personas, areas] = await Promise.all([
    listarUnidades(filtros, sesion),
    contarUnidades(filtros),
    listarCatalogoPasos(),
    listarOperarios(),
    listarEstaciones(),
  ]);

  const hoyIso = new Date().toISOString().slice(0, 10);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hayFiltro = Object.keys(parametros).some((clave) => clave !== "pagina");

  function enlacePagina(destino: number): string {
    const siguientes = new URLSearchParams();
    for (const [clave, valor] of Object.entries(parametros)) {
      if (clave !== "pagina" && typeof valor === "string" && valor !== "") {
        siguientes.set(clave, valor);
      }
    }
    if (destino > 1) siguientes.set("pagina", String(destino));
    const cadena = siguientes.toString();
    return cadena === ""
      ? "/admin/fabricacion/unidades"
      : `/admin/fabricacion/unidades?${cadena}`;
  }

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Muebles
          </h1>
          <p className="mt-1 text-lg text-brand-taupe">
            {total === 1 ? "1 mueble" : `${total} muebles`}
            {hayFiltro ? " con estos filtros" : " en el taller"}
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
          marcador="Busca por código, cliente, mueble o número de pedido"
          etiqueta="Buscar muebles"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ChipsFiltro
            etiqueta="Estado del mueble"
            parametro="estado"
            catalogo="estadoUnidad"
          />

          <ChipsFiltro
            etiqueta="Urgencia"
            parametro="prioridad"
            catalogo="prioridad"
            textoTodos="Todas"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SelectFiltro
            etiqueta="Paso en el que está"
            parametro="paso"
            textoTodos="Cualquier paso"
            opciones={pasos.map((paso) => ({ valor: paso.clave, texto: paso.nombre }))}
          />
          <SelectFiltro
            etiqueta="Responsable"
            parametro="responsable"
            textoTodos="Cualquiera"
            opciones={personas.map((persona) => ({
              valor: persona._id,
              texto: `${persona.nombre} (${persona.rolNombre})`,
            }))}
          />
          <SelectFiltro
            etiqueta="Área de trabajo"
            parametro="area"
            textoTodos="Cualquier área"
            opciones={areas.map((area) => ({ valor: area._id, texto: area.nombre }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InterruptorFiltro
            etiqueta="Sólo los atrasados"
            ayuda="Muebles que ya se pasaron de la fecha prometida"
            parametro="retrasadas"
            icono="reloj"
          />
          {permisos.eliminarPedidos && (
            <InterruptorFiltro
              etiqueta="Ver eliminados"
              ayuda="Muestra también los muebles eliminados, para poder restaurarlos"
              parametro="eliminados"
              icono="papelera"
            />
          )}
          <LimpiarFiltros />
        </div>
      </PanelFiltros>

      {unidades.length === 0 ? (
        <EstadoVacio
          icono={<Search className="h-7 w-7" />}
          titulo={hayFiltro ? "Ningún mueble con esos filtros" : "Todavía no hay muebles"}
          mensaje={
            hayFiltro
              ? "Prueba a quitar algún filtro, o a buscar sólo por el número del código."
              : "Cuando registres un pedido, sus muebles aparecerán aquí con su código y su avance."
          }
          accion={
            hayFiltro ? (
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href="/admin/fabricacion/unidades">Quitar los filtros</Link>
              </Button>
            ) : permisos.gestionarPedidos ? (
              <Button asChild variant="accent" className="h-16 px-8 text-lg font-bold">
                <Link href="/admin/fabricacion/pedidos/nuevo">
                  <PackagePlus className="!size-6" aria-hidden="true" />
                  REGISTRAR EL PRIMER PEDIDO
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <TablaUnidades unidades={unidades} permisos={permisos} hoyIso={hoyIso} />

          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de muebles"
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
