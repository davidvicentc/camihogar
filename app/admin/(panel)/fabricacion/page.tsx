/**
 * Centro de control de fabricación.
 *
 * Lo primero que ve el dueño al entrar: cuántos muebles hay en marcha, qué se
 * está atrasando, qué tiene problema, y el tablero con una columna por paso.
 * Arriba, un buscador donde se pega el código de la etiqueta y se salta a su
 * ficha.
 */

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CircleCheck,
  Hammer,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { BuscadorCodigo } from "@/components/fabricacion/admin/tablero-buscador";
import { TableroKanban } from "@/components/fabricacion/admin/tablero-kanban";
import { PestanasTablero } from "@/components/fabricacion/admin/tablero-pestanas";
import { EstadoVacio, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import { TablaUnidades } from "@/components/fabricacion/admin/unidad-tabla";
import {
  contarIncidencias,
  getResumenFabricacion,
  getTableroKanban,
  listarUnidades,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";

export const dynamic = "force-dynamic";

const MILISEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;

export default async function CentroControlFabricacionPage() {
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark">
          Fabricación
        </h1>
        <SinPermiso que="el tablero de fabricación" />
      </div>
    );
  }

  const [resumen, columnas, unidades, problemasAbiertos] = await Promise.all([
    getResumenFabricacion(),
    getTableroKanban(sesion),
    /*
     * Una sola lectura sirve para la pestaña "Lista" y para los dos números
     * que el resumen no trae hechos (lo terminado este mes y las entregas de
     * esta semana). El tope de 200 cubre de sobra un taller pequeño; si algún
     * día se queda corto, esos dos números pasarían a calcularse en la capa de
     * datos con su propia aggregation.
     */
    listarUnidades({ orden: "recientes", porPagina: 200 }, sesion),
    contarIncidencias({ estado: "ABIERTA" }),
  ]);

  const ahora = new Date();
  const ahoraIso = ahora.toISOString();
  const hoyIso = ahoraIso.slice(0, 10);
  const inicioDeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const dentroDeUnaSemana = new Date(ahora.getTime() + 7 * MILISEGUNDOS_POR_DIA)
    .toISOString()
    .slice(0, 10);

  const terminadasEsteMes = unidades.filter(
    (unidad) =>
      (unidad.estado === "TERMINADA" || unidad.estado === "ENTREGADA") &&
      unidad.terminadoAt !== null &&
      unidad.terminadoAt >= inicioDeMes
  ).length;

  const entregasEstaSemana = unidades.filter(
    (unidad) =>
      unidad.fechaPrometida !== null &&
      unidad.estado !== "ENTREGADA" &&
      unidad.estado !== "CANCELADA" &&
      unidad.fechaPrometida.slice(0, 10) >= hoyIso &&
      unidad.fechaPrometida.slice(0, 10) <= dentroDeUnaSemana
  ).length;

  const hayAlerta = resumen.retrasadas > 0 || problemasAbiertos > 0;
  const nombreDelMes = new Intl.DateTimeFormat("es-VE", {
    month: "long",
    timeZone: "America/Caracas",
  }).format(ahora);

  return (
    <div className="space-y-8">
      <AvisosFabricacion />

      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Fabricación
        </h1>
        <p className="mt-1 text-lg text-brand-taupe">
          Todo lo que está pasando en el taller ahora mismo.
        </p>
      </header>

      {/* Lo que hay que atender ya */}
      {hayAlerta && (
        <div
          role="alert"
          className="rounded-3xl border-2 border-red-300 bg-red-50 p-5 shadow-warm-sm"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
            >
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold text-red-900">
                Hay cosas que atender
              </h2>
              <ul className="mt-1 space-y-0.5 text-lg text-red-800">
                {resumen.retrasadas > 0 && (
                  <li>
                    {resumen.retrasadas === 1
                      ? "1 mueble se pasó de la fecha prometida."
                      : `${resumen.retrasadas} muebles se pasaron de la fecha prometida.`}
                  </li>
                )}
                {problemasAbiertos > 0 && (
                  <li>
                    {problemasAbiertos === 1
                      ? "1 problema sin resolver está frenando un mueble."
                      : `${problemasAbiertos} problemas sin resolver están frenando muebles.`}
                  </li>
                )}
              </ul>

              <div className="mt-4 flex flex-wrap gap-3">
                {resumen.retrasadas > 0 && (
                  <Button asChild variant="destructive" className="h-14 text-base font-bold">
                    <Link href="/admin/fabricacion/unidades?retrasadas=1">
                      <CalendarCheck className="!size-5" aria-hidden="true" />
                      VER LOS MUEBLES ATRASADOS
                    </Link>
                  </Button>
                )}
                {problemasAbiertos > 0 && (
                  <Button asChild variant="destructive" className="h-14 text-base font-bold">
                    <Link href="/admin/fabricacion/incidencias?estado=ABIERTA">
                      <TriangleAlert className="!size-5" aria-hidden="true" />
                      VER LOS PROBLEMAS
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Los cuatro números */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En fabricación"
          value={resumen.enProceso}
          icon={<Hammer className="h-5 w-5" />}
          hint={`De ${resumen.totalUnidades} muebles en total`}
        />
        <StatCard
          label={`Terminados en ${nombreDelMes}`}
          value={terminadasEsteMes}
          icon={<CircleCheck className="h-5 w-5" />}
          hint="Muebles que salieron del taller este mes"
        />
        <StatCard
          label="Con problema"
          value={resumen.conIncidencia}
          icon={<TriangleAlert className="h-5 w-5" />}
          hint={
            problemasAbiertos > 0
              ? `${problemasAbiertos} ${problemasAbiertos === 1 ? "aviso sin resolver" : "avisos sin resolver"}`
              : "Ningún aviso sin resolver"
          }
        />
        <StatCard
          label="Entregas esta semana"
          value={entregasEstaSemana}
          icon={<CalendarCheck className="h-5 w-5" />}
          hint="Muebles prometidos para los próximos 7 días"
        />
      </div>

      {/* La acción principal de la pantalla */}
      {permisos.gestionarPedidos && (
        <Button asChild variant="accent" className="h-20 w-full rounded-2xl text-xl font-bold">
          <Link href="/admin/fabricacion/pedidos/nuevo">
            <PackagePlus className="!size-7" aria-hidden="true" />
            REGISTRAR UN PEDIDO NUEVO
          </Link>
        </Button>
      )}

      {/* Buscar por código */}
      <div className="rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
        <BuscadorCodigo />
      </div>

      {/* Tablero y lista */}
      <PestanasTablero
        tablero={<TableroKanban columnas={columnas} ahoraIso={ahoraIso} hoyIso={hoyIso} />}
        lista={
          unidades.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay muebles"
              mensaje="Cuando registres un pedido, cada mueble aparecerá aquí con su código y su avance."
              accion={
                permisos.gestionarPedidos ? (
                  <Button asChild variant="accent" className="h-14 text-base font-bold">
                    <Link href="/admin/fabricacion/pedidos/nuevo">
                      <PackagePlus className="!size-5" aria-hidden="true" />
                      REGISTRAR EL PRIMER PEDIDO
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <TablaUnidades
                unidades={unidades.slice(0, 50)}
                permisos={permisos}
                hoyIso={hoyIso}
              />
              <div className="text-center">
                <Button asChild variant="outline" className="h-14 text-base font-semibold">
                  <Link href="/admin/fabricacion/unidades">
                    Ver el listado completo de muebles, con filtros
                  </Link>
                </Button>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
