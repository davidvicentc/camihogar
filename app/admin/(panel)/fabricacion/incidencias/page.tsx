/**
 * Bandeja de problemas del taller.
 *
 * Lo primero, lo grave y sin resolver. Cada problema trae el mueble, el paso,
 * quién lo avisó, las fotos y desde cuándo está abierto; y las acciones de
 * verlo, editarlo, resolverlo o eliminarlo.
 */

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import {
  BuscadorLista,
  ChipsFiltro,
  LimpiarFiltros,
  PanelFiltros,
} from "@/components/fabricacion/admin/tablero-filtros";
import { TablaIncidencias } from "@/components/fabricacion/admin/incidencia-tabla";
import { EstadoVacio, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import { contarIncidencias, listarIncidencias } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import {
  ESTADOS_INCIDENCIA,
  SEVERIDADES,
  type EstadoIncidencia,
  type FiltrosIncidencias,
  type Severidad,
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

export default async function IncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero && !permisos.resolverIncidencias) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark">
          Problemas
        </h1>
        <SinPermiso que="los problemas del taller" />
      </div>
    );
  }

  const pagina = Math.max(1, Number(uno(parametros, "pagina")) || 1);

  const filtros: FiltrosIncidencias = {
    busqueda: uno(parametros, "q") || undefined,
    estado: unaDe<EstadoIncidencia>(uno(parametros, "estado"), ESTADOS_INCIDENCIA),
    severidad: unaDe<Severidad>(uno(parametros, "severidad"), SEVERIDADES),
    pagina,
    porPagina: POR_PAGINA,
  };

  const [incidencias, total, abiertas] = await Promise.all([
    listarIncidencias(filtros),
    contarIncidencias(filtros),
    contarIncidencias({ estado: "ABIERTA" }),
  ]);

  const ahoraIso = new Date().toISOString();
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
      ? "/admin/fabricacion/incidencias"
      : `/admin/fabricacion/incidencias?${cadena}`;
  }

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Problemas
        </h1>
        <p className="mt-1 text-lg text-brand-taupe">
          {abiertas === 0
            ? "Ahora mismo no hay ningún problema sin resolver."
            : abiertas === 1
              ? "Hay 1 problema sin resolver frenando un mueble."
              : `Hay ${abiertas} problemas sin resolver frenando muebles.`}
        </p>
      </header>

      <PanelFiltros>
        <BuscadorLista
          marcador="Busca por código del mueble, motivo o quién lo avisó"
          etiqueta="Buscar problemas"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ChipsFiltro
            etiqueta="Estado"
            parametro="estado"
            catalogo="estadoIncidencia"
          />

          <ChipsFiltro
            etiqueta="Gravedad"
            parametro="severidad"
            catalogo="severidad"
            textoTodos="Todas"
          />
        </div>

        <LimpiarFiltros />
      </PanelFiltros>

      {incidencias.length === 0 ? (
        <EstadoVacio
          icono={<PartyPopper className="h-7 w-7" />}
          titulo={hayFiltro ? "Ningún problema con esos filtros" : "Todo va bien"}
          mensaje={
            hayFiltro
              ? "Prueba a quitar algún filtro para ver el resto de los avisos."
              : "Nadie ha avisado de ningún problema. Cuando alguien del taller reporte uno desde su móvil, aparecerá aquí con su foto."
          }
          accion={
            hayFiltro ? (
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href="/admin/fabricacion/incidencias">Quitar los filtros</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href="/admin/fabricacion">Volver al tablero</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <TablaIncidencias
            incidencias={incidencias}
            permisos={permisos}
            ahoraIso={ahoraIso}
          />

          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de problemas"
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
